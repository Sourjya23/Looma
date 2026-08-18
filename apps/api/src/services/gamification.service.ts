import { prisma } from '../config/database.js';
import { LeaderboardService } from './leaderboard.service.js';

export const LEVEL_THRESHOLDS = [
  0, 100, 250, 450, 750, 1150, 1650, 2250, 3000, 4000, 5000, 6500, 8500, 11000, 14000
];

export class GamificationService {
  
  static calculateLevel(xp: number): number {
    let level = 1;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
      if (xp >= LEVEL_THRESHOLDS[i]) {
        level = i + 1;
      } else {
        break;
      }
    }
    return level;
  }

  static getXPForNextLevel(level: number): number | null {
    if (level >= LEVEL_THRESHOLDS.length) return null;
    return LEVEL_THRESHOLDS[level];
  }

  static async awardXP(userId: string, amount: number, reason: string, sourceId: string) {
    try {
      return await prisma.$transaction(async (tx: any) => {
        // Idempotency check: see if event exists
        const existingEvent = await tx.xPEvent.findUnique({
          where: {
            userId_reason_sourceId: {
              userId,
              reason,
              sourceId
            }
          }
        });

        if (existingEvent) {
          return { awarded: false, message: 'XP already awarded for this action' };
        }

        // Create the event
        const event = await tx.xPEvent.create({
          data: {
            userId,
            amount,
            reason,
            sourceId
          }
        });

        // Update user
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("User not found");

        const newXp = user.xp + amount;
        const newLevel = this.calculateLevel(newXp);
        const levelUp = newLevel > user.level;

        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            xp: newXp,
            level: newLevel
          }
        });

        // Update leaderboard
        if (updatedUser.leaderboardOptIn) {
          LeaderboardService.addXP(userId, updatedUser.displayName || updatedUser.username || 'Anonymous Writer', amount);
        }

        return { 
          awarded: true, 
          amount,
          newXp, 
          levelUp, 
          newLevel,
          event
        };
      });
    } catch (e) {
      console.error('Error awarding XP:', e);
      return { awarded: false, message: 'Internal error awarding XP' };
    }
  }

  static async evaluateStreak(userId: string) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return null;

      const now = new Date();
      // Normalize to UTC midnight
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

      if (user.lastActiveDate) {
        const lastActive = new Date(Date.UTC(
          user.lastActiveDate.getUTCFullYear(), 
          user.lastActiveDate.getUTCMonth(), 
          user.lastActiveDate.getUTCDate()
        ));
        
        const diffTime = Math.abs(today.getTime() - lastActive.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          // Already practiced today
          return { currentStreak: user.currentStreak, incremented: false };
        } else if (diffDays === 1) {
          // Consecutive day
          const newStreak = user.currentStreak + 1;
          const longest = Math.max(newStreak, user.longestStreak);
          
          await prisma.user.update({
            where: { id: userId },
            data: { currentStreak: newStreak, longestStreak: longest, lastActiveDate: today }
          });
          return { currentStreak: newStreak, incremented: true };
        } else {
          // Streak broken
          await prisma.user.update({
            where: { id: userId },
            data: { currentStreak: 1, lastActiveDate: today }
          });
          return { currentStreak: 1, incremented: true, broken: true };
        }
      } else {
        // First active day
        await prisma.user.update({
          where: { id: userId },
          data: { currentStreak: 1, longestStreak: 1, lastActiveDate: today }
        });
        return { currentStreak: 1, incremented: true };
      }
    } catch (e) {
      console.error('Error evaluating streak:', e);
      return null;
    }
  }

  static async checkAchievements(userId: string) {
    try {
      const user = await prisma.user.findUnique({ 
        where: { id: userId },
        include: { achievements: true, sessions: { where: { status: 'submitted' }, include: { submissions: true } } }
      });
      
      if (!user) return [];

      const unlockedIds = new Set(user.achievements.map((a: any) => a.achievementKey));
      const newlyUnlocked: string[] = [];
      const award = async (key: string) => {
        if (!unlockedIds.has(key)) {
          await prisma.userAchievement.create({
            data: { userId, achievementKey: key }
          });
          newlyUnlocked.push(key);
          unlockedIds.add(key);
        }
      };

      // Rules
      const storiesCount = user.sessions.length;
      if (storiesCount >= 1) await award('FIRST_STORY');
      if (storiesCount >= 10) await award('10_STORIES');
      if (storiesCount >= 50) await award('50_STORIES');

      let wordCount = 0;
      let revisionCount = 0;
      user.sessions.forEach((s: any) => {
        if (s.submissions.length > 0) {
          wordCount += s.submissions[s.submissions.length - 1].wordCount;
        }
        if (s.submissions.length > 1) {
          revisionCount++;
        }
      });

      if (wordCount >= 1000) await award('1000_WORDS');
      if (wordCount >= 10000) await award('10000_WORDS');

      if (revisionCount >= 1) await award('FIRST_REVISION');
      if (revisionCount >= 10) await award('10_REVISIONS');

      if (user.currentStreak >= 7) await award('7_DAY_STREAK');
      if (user.currentStreak >= 30) await award('30_DAY_STREAK');

      return newlyUnlocked;

    } catch (e) {
      console.error('Error checking achievements:', e);
      return [];
    }
  }
}
