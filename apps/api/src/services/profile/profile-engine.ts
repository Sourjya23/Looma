import { prisma } from '../../config/database.js';

// CP8: The Profile Engine builds the deterministic profile (Layer A)
export const updateWritingProfile = async (userId: string) => {
  // 1. Fetch user's completed sessions and their final submissions
  const sessions = await prisma.writingSession.findMany({
    where: { userId, status: 'submitted' },
    include: {
      challenge: true,
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

  if (sessions.length === 0) return null;

  let totalGrammar = 0;
  let totalStory = 0;
  let totalDirector = 0;
  let totalWords = 0;
  let totalActiveTime = 0;

  let grammarCount = 0;
  let storyCount = 0;
  let directorCount = 0;

  // Strength trackers
  const highScores = {
    english: 0,
    storyConcept: 0,
    storyCharacter: 0,
    directorVisuals: 0,
  };

  sessions.forEach((s: any) => {
    const sub = s.submissions[0];
    if (!sub) return;

    totalWords += sub.wordCount;
    totalActiveTime += s.activeTime;

    if (sub.englishAnalysis) {
      totalGrammar += sub.englishAnalysis.score;
      grammarCount++;
      if (sub.englishAnalysis.score >= 85) highScores.english++;
    }
    
    if (sub.storyAnalysis) {
      totalStory += sub.storyAnalysis.overallScore;
      storyCount++;
      if (sub.storyAnalysis.conceptScore >= 85) highScores.storyConcept++;
      if (sub.storyAnalysis.characterScore >= 85) highScores.storyCharacter++;
    }

    if (sub.directorAnalysis) {
      totalDirector += sub.directorAnalysis.overallScore;
      directorCount++;
      if (sub.directorAnalysis.visualStorytellingScore >= 85) highScores.directorVisuals++;
    }
  });

  // Calculate Averages
  const averageGrammarScore = grammarCount > 0 ? totalGrammar / grammarCount : 0;
  const averageStoryScore = storyCount > 0 ? totalStory / storyCount : 0;
  const averageDirectorScore = directorCount > 0 ? totalDirector / directorCount : 0;
  const averageWordCount = totalWords / sessions.length;
  const averageWritingSpeed = totalActiveTime > 0 ? (totalWords / (totalActiveTime / 60)) : 0;

  // CP7: Strength Detection
  const strengths: any[] = [];
  const STRENGTH_THRESHOLD = 1; // Lowered to 1 so strengths show up earlier
  if (highScores.english >= STRENGTH_THRESHOLD) strengths.push({ category: 'english', label: 'Strong English/Grammar' });
  if (highScores.storyConcept >= STRENGTH_THRESHOLD) strengths.push({ category: 'concept', label: 'Strong conceptual thinking' });
  if (highScores.storyCharacter >= STRENGTH_THRESHOLD) strengths.push({ category: 'character', label: 'Compelling characters' });
  if (highScores.directorVisuals >= STRENGTH_THRESHOLD) strengths.push({ category: 'visuals', label: 'Vivid visual storytelling' });

  // 2. Fetch all detected mistakes for this user
  const allMistakes = await prisma.detectedMistake.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' }
  });

  // Aggregate mistakes by subCategory
  const mistakeAggregates: Record<string, { count: number; sessions: Set<string>; lastSeen: Date; category: string }> = {};
  
  allMistakes.forEach((m: any) => {
    if (!mistakeAggregates[m.subCategory]) {
      mistakeAggregates[m.subCategory] = { count: 0, sessions: new Set(), lastSeen: m.createdAt, category: m.category };
    }
    mistakeAggregates[m.subCategory].count++;
    mistakeAggregates[m.subCategory].sessions.add(m.submissionId);
    if (m.createdAt > mistakeAggregates[m.subCategory].lastSeen) {
      mistakeAggregates[m.subCategory].lastSeen = m.createdAt;
    }
  });

  // CP4 & CP5: Recurring Mistake & Trend Engine
  const weaknesses: any[] = [];
  const trends: any[] = [];

  for (const [subCategory, data] of Object.entries(mistakeAggregates)) {
    // Recurring ≠ One-time: Must appear in at least 1 session for early tracking
    if (data.sessions.size >= 1) {
      
      // Calculate Trend by splitting history into early and recent sessions
      const mistakesOfThisType = allMistakes.filter((m: any) => m.subCategory === subCategory);
      const halfSessionsIndex = Math.floor(sessions.length / 2);
      
      let earlyCount = 0;
      let recentCount = 0;

      sessions.forEach((s: any, idx: number) => {
        const subId = s.submissions[0]?.id;
        if (!subId) return;
        
        const mistakeCountInSession = mistakesOfThisType.filter((m: any) => m.submissionId === subId).length;
        if (idx < halfSessionsIndex) {
          earlyCount += mistakeCountInSession;
        } else {
          recentCount += mistakeCountInSession;
        }
      });

      let trendState = 'stable';

      if (earlyCount > 0) {
        if (recentCount === 0 || recentCount < earlyCount / 2) {
          trendState = 'improving';
        } else if (recentCount > earlyCount * 1.5) {
          trendState = 'worsening';
        }
      } else if (recentCount > 0 && halfSessionsIndex > 0) {
        // if they had 0 mistakes in the first half but made mistakes in the second half
        trendState = 'worsening';
      } else {
        trendState = 'insufficient_data';
      }

      // Priority ranking (CP19)
      // Base score = frequency
      let priorityScore = data.count * 1.0;
      if (trendState === 'improving') priorityScore *= 0.5;
      if (trendState === 'worsening') priorityScore *= 1.5;
      
      // Decay priority if it hasn't been seen recently
      const daysSinceLastSeen = (new Date().getTime() - data.lastSeen.getTime()) / (1000 * 3600 * 24);
      if (daysSinceLastSeen > 7) {
        priorityScore *= 0.5; // Less important if we haven't seen it in a week
      }

      weaknesses.push({
        category: data.category,
        subCategory,
        count: data.count,
        affectedSessions: data.sessions.size,
        lastSeen: data.lastSeen,
        trend: trendState,
        priorityScore
      });

      trends.push({ subCategory, state: trendState });
    }
  }

  // Sort weaknesses by priority
  weaknesses.sort((a, b) => b.priorityScore - a.priorityScore);

  const payload = {
    userId,
    averageGrammarScore,
    averageStoryScore,
    averageDirectorScore,
    averageWordCount,
    averageWritingSpeed,
    totalSessions: sessions.length,
    strengths,
    weaknesses,
    trends
  };

  // Upsert the profile
  const profile = await prisma.writingProfile.upsert({
    where: { userId },
    update: payload,
    create: payload
  });

  return profile;
};
