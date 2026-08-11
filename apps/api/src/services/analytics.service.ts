import { prisma } from '../config/database.js';

export class AnalyticsService {
  
  static getStartDate(range: string): Date | null {
    if (range === 'all') return null;
    
    const days = parseInt(range.replace('d', ''));
    if (isNaN(days)) return null;

    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  static async getDashboardOverview(userId: string, range: string = '30d') {
    const startDate = this.getStartDate(range);

    const whereClause: any = { 
      userId, 
      status: 'submitted',
    };
    if (startDate) {
      whereClause.completedAt = { gte: startDate };
    }

    // 1. Fetch Sessions (CP18 - we fetch them and aggregate in memory to simplify complex metric logic)
    const sessions = await prisma.writingSession.findMany({
      where: whereClause,
      include: {
        submissions: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
          include: {
            englishAnalysis: true,
            storyAnalysis: true,
            directorAnalysis: true,
          }
        }
      },
      orderBy: { completedAt: 'asc' }
    });

    if (sessions.length === 0) {
      return { isEmpty: true };
    }

    // Initialize metrics
    let totalWords = 0;
    let totalWritingTime = 0;
    
    let totalEnglish = 0;
    let englishCount = 0;
    
    let totalStory = 0;
    let storyCount = 0;
    
    let totalDirector = 0;
    let directorCount = 0;

    let onTimeCount = 0;
    let totalTargetTime = 0;

    const timeSeriesMap = new Map<string, any>();

    // Trend calculation tracking
    const recentN = Math.max(3, Math.floor(sessions.length / 2));
    const isRecent = (idx: number) => idx >= sessions.length - recentN;

    const trendData = {
      recent: { english: 0, englishCount: 0, story: 0, storyCount: 0, director: 0, directorCount: 0, speedSum: 0, speedCount: 0 },
      early: { english: 0, englishCount: 0, story: 0, storyCount: 0, director: 0, directorCount: 0, speedSum: 0, speedCount: 0 },
    };

    sessions.forEach((s: any, idx: number) => {
      const sub = s.submissions[0];
      if (!sub) return;

      totalWords += sub.wordCount;
      totalWritingTime += s.activeTime;
      totalTargetTime += s.targetTime;

      if (s.activeTime <= s.targetTime) {
        onTimeCount++;
      }

      const speed = s.activeTime > 0 ? (sub.wordCount / (s.activeTime / 60)) : 0;

      const eScore = sub.englishAnalysis?.score || null;
      const sScore = sub.storyAnalysis?.overallScore || null;
      const dScore = sub.directorAnalysis?.overallScore || null;

      if (eScore) {
        totalEnglish += eScore;
        englishCount++;
        isRecent(idx) ? (trendData.recent.english += eScore, trendData.recent.englishCount++) : (trendData.early.english += eScore, trendData.early.englishCount++);
      }
      if (sScore) {
        totalStory += sScore;
        storyCount++;
        isRecent(idx) ? (trendData.recent.story += sScore, trendData.recent.storyCount++) : (trendData.early.story += sScore, trendData.early.storyCount++);
      }
      if (dScore) {
        totalDirector += dScore;
        directorCount++;
        isRecent(idx) ? (trendData.recent.director += dScore, trendData.recent.directorCount++) : (trendData.early.director += dScore, trendData.early.directorCount++);
      }

      if (speed > 0) {
        isRecent(idx) ? (trendData.recent.speedSum += speed, trendData.recent.speedCount++) : (trendData.early.speedSum += speed, trendData.early.speedCount++);
      }

      // Time Series aggregation
      if (s.completedAt) {
        const dateKey = s.completedAt.toISOString().split('T')[0];
        if (!timeSeriesMap.has(dateKey)) {
          timeSeriesMap.set(dateKey, {
            date: dateKey,
            english: 0, eCount: 0,
            story: 0, sCount: 0,
            director: 0, dCount: 0,
            speed: 0, speedCount: 0,
            words: 0,
            sessions: 0
          });
        }
        
        const dayData = timeSeriesMap.get(dateKey);
        dayData.sessions++;
        dayData.words += sub.wordCount;
        
        if (eScore) { dayData.english += eScore; dayData.eCount++; }
        if (sScore) { dayData.story += sScore; dayData.sCount++; }
        if (dScore) { dayData.director += dScore; dayData.dCount++; }
        if (speed > 0) { dayData.speed += speed; dayData.speedCount++; }
      }
    });

    // Finalize averages
    const averageWordCount = Math.round(totalWords / sessions.length);
    const averageWritingSpeed = totalWritingTime > 0 ? (totalWords / (totalWritingTime / 60)) : 0;
    
    const averageEnglishScore = englishCount > 0 ? Math.round(totalEnglish / englishCount) : 0;
    const averageStoryScore = storyCount > 0 ? Math.round(totalStory / storyCount) : 0;
    const averageDirectorScore = directorCount > 0 ? Math.round(totalDirector / directorCount) : 0;

    // Finalize Time Series
    const timeSeries = Array.from(timeSeriesMap.values()).map(day => ({
      date: day.date,
      english: day.eCount > 0 ? Math.round(day.english / day.eCount) : null,
      story: day.sCount > 0 ? Math.round(day.story / day.sCount) : null,
      director: day.dCount > 0 ? Math.round(day.director / day.dCount) : null,
      speed: day.speedCount > 0 ? Number((day.speed / day.speedCount).toFixed(1)) : null,
      words: day.words,
      sessions: day.sessions
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Finalize Trends (CP10 & CP11)
    const calcDiff = (recentSum: number, recentCount: number, earlySum: number, earlyCount: number) => {
      if (recentCount === 0 || earlyCount === 0) return null;
      const recentAvg = recentSum / recentCount;
      const earlyAvg = earlySum / earlyCount;
      return recentAvg - earlyAvg;
    };

    const getTrendState = (diff: number | null, threshold: number = 2) => {
      if (diff === null) return 'insufficient_data';
      if (diff >= threshold) return 'improving';
      if (diff <= -threshold) return 'worsening';
      return 'stable';
    };

    const eDiff = calcDiff(trendData.recent.english, trendData.recent.englishCount, trendData.early.english, trendData.early.englishCount);
    const sDiff = calcDiff(trendData.recent.story, trendData.recent.storyCount, trendData.early.story, trendData.early.storyCount);
    const dDiff = calcDiff(trendData.recent.director, trendData.recent.directorCount, trendData.early.director, trendData.early.directorCount);
    const spDiff = calcDiff(trendData.recent.speedSum, trendData.recent.speedCount, trendData.early.speedSum, trendData.early.speedCount);

    const trends = {
      english: { value: averageEnglishScore, diff: eDiff ? Math.round(eDiff) : 0, state: getTrendState(eDiff) },
      story: { value: averageStoryScore, diff: sDiff ? Math.round(sDiff) : 0, state: getTrendState(sDiff) },
      director: { value: averageDirectorScore, diff: dDiff ? Math.round(dDiff) : 0, state: getTrendState(dDiff) },
      speed: { value: Number(averageWritingSpeed.toFixed(1)), diff: spDiff ? Number(spDiff.toFixed(1)) : 0, state: getTrendState(spDiff, 0.5) }
    };

    const recentSessions = sessions.slice(-3).reverse().map((s: any) => {
      const sub = s.submissions[0];
      return {
        id: s.id,
        prompt: s.challenge?.prompt || 'Custom Writing',
        wordCount: sub?.wordCount || 0,
        completedAt: s.completedAt,
        scores: {
          english: sub?.englishAnalysis?.score || 0,
          story: sub?.storyAnalysis?.overallScore || 0,
          director: sub?.directorAnalysis?.overallScore || 0,
        },
        isBookmarked: s.isBookmarked,
      }
    });

    return {
      isEmpty: false,
      totalSessions: sessions.length,
      totalWords,
      totalWritingTime,
      averageWordCount,
      averageWritingSpeed: Number(averageWritingSpeed.toFixed(1)),
      
      averageEnglishScore,
      averageStoryScore,
      averageDirectorScore,
      
      trends,
      timeSeries,
      recentSessions,
      
      timeDiscipline: {
        targetAverage: Math.round(totalTargetTime / sessions.length),
        actualAverage: Math.round(totalWritingTime / sessions.length),
        onTimePercentage: Math.round((onTimeCount / sessions.length) * 100),
        overtimePercentage: Math.round(((sessions.length - onTimeCount) / sessions.length) * 100)
      },
      
      progressSummary: (() => {
        if (sessions.length < 5) {
          return "You're just getting started! Keep writing to unlock detailed progress insights.";
        }
        
        const parts = [];
        const bestScoreDiff = Math.max(
          trends.english.diff || 0,
          trends.story.diff || 0,
          trends.director.diff || 0
        );
        
        if (bestScoreDiff >= 2) {
          let category = 'English grammar';
          if (bestScoreDiff === trends.story.diff) category = 'story structuring';
          if (bestScoreDiff === trends.director.diff) category = 'visual storytelling';
          parts.push(`Your ${category} scores have improved by ${bestScoreDiff} points recently.`);
        } else if (bestScoreDiff <= -3) {
          parts.push(`Your scores have dipped slightly recently, keep practicing to bounce back.`);
        } else {
          parts.push(`Your scores have been stable recently.`);
        }
        
        if (trends.speed.state === 'improving') {
          const diff = trends.speed.diff;
          const early = (trends.speed.value - diff).toFixed(1);
          parts.push(`Your writing speed has increased from ${early} to ${trends.speed.value} words/minute.`);
        } else if (trends.speed.state === 'worsening') {
          parts.push(`Your writing speed has slightly decreased recently.`);
        }
        
        return parts.join(' ');
      })()
    };
  }
}
