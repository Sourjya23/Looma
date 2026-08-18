import { redis } from '../config/redis.js';
import { prisma } from '../config/database.js';

function getWeeklyKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  return `leaderboard:xp:week:${year}-W${weekNo}`;
}

const ALL_TIME_KEY = 'leaderboard:xp:alltime';

export class LeaderboardService {
  
  static async addXP(userId: string, displayName: string, amount: number) {
    if (!redis || amount <= 0) return;
    
    try {
      const weeklyKey = getWeeklyKey();
      
      const multi = redis.multi();
      multi.zincrby(ALL_TIME_KEY, amount, userId);
      multi.zincrby(weeklyKey, amount, userId);
      
      // Store displayName separately so we don't have to fetch from DB for ranking
      multi.hset('users:display_names', userId, displayName);
      
      await multi.exec();
    } catch (err) {
      console.error('Redis leaderboard update failed (Safe to ignore, XP saved in DB)', err);
    }
  }

  static async getLeaderboard(period: 'weekly' | 'alltime', limit = 100) {
    // Try Redis first
    if (redis) {
      try {
        const key = period === 'weekly' ? getWeeklyKey() : ALL_TIME_KEY;
        const topUsers = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
        
        if (topUsers.length > 0) {
          // Collect user IDs for DB enrichment
          const userIds: string[] = [];
          const results: any[] = [];
          for (let i = 0; i < topUsers.length; i += 2) {
            userIds.push(topUsers[i]);
          }
          
          // Get streak/level data from DB for all users at once
          const dbUsers = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, currentStreak: true, longestStreak: true, level: true, username: true, displayName: true, avatarUrl: true, leaderboardOptIn: true }
          });
          const dbMap = new Map(dbUsers.map((u: any) => [u.id, u]));
          
          for (let i = 0; i < topUsers.length; i += 2) {
            const userId = topUsers[i];
            const score = parseInt(topUsers[i + 1]);
            const dbUser: any = dbMap.get(userId);
            
            if (dbUser && dbUser.leaderboardOptIn === false) continue;
            
            results.push({
              rank: (i / 2) + 1,
              userId,
              displayName: dbUser?.displayName || dbUser?.username || await redis.hget('users:display_names', userId) || 'Anonymous Writer',
              xp: score,
              level: dbUser?.level || 1,
              currentStreak: dbUser?.currentStreak || 0,
              longestStreak: dbUser?.longestStreak || 0,
              avatarUrl: dbUser?.avatarUrl || null,
            });
          }
          return results;
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard from Redis, falling back to DB', err);
      }
    }
    
    // Fallback to DB
    return this.getLeaderboardFromDB(limit);
  }

  static async getMyRank(userId: string, period: 'weekly' | 'alltime') {
    if (redis) {
      try {
        const key = period === 'weekly' ? getWeeklyKey() : ALL_TIME_KEY;
        
        const rank = await redis.zrevrank(key, userId);
        if (rank !== null) {
          const score = await redis.zscore(key, userId);
          
          // Fetch nearby (e.g. 2 above, 2 below)
          const start = Math.max(0, rank - 2);
          const end = rank + 2;
          
          const nearby = await redis.zrevrange(key, start, end, 'WITHSCORES');
          
          const nearbyUserIds = [];
          for (let i = 0; i < nearby.length; i += 2) {
            nearbyUserIds.push(nearby[i]);
          }

          // Get DB data for nearby users
          const dbUsers = await prisma.user.findMany({
            where: { id: { in: nearbyUserIds } },
            select: { id: true, currentStreak: true, longestStreak: true, level: true, username: true, displayName: true, avatarUrl: true, leaderboardOptIn: true }
          });
          const dbMap = new Map(dbUsers.map((u: any) => [u.id, u]));
          
          const nearbyResults = [];
          for (let i = 0; i < nearby.length; i += 2) {
            const nId = nearby[i];
            const nScore = parseInt(nearby[i + 1]);
            const dbNUser: any = dbMap.get(nId);
            
            if (dbNUser && dbNUser.leaderboardOptIn === false && nId !== userId) continue;

            const dName = dbNUser?.displayName || dbNUser?.username || await redis.hget('users:display_names', nId) || 'Anonymous Writer';
            
            nearbyResults.push({
              rank: start + (i / 2) + 1,
              userId: nId,
              displayName: dName,
              xp: nScore,
              level: dbNUser?.level || 1,
              currentStreak: dbNUser?.currentStreak || 0,
              longestStreak: dbNUser?.longestStreak || 0,
              avatarUrl: dbNUser?.avatarUrl || null,
              isMe: nId === userId
            });
          }
          
          const myDbUser = dbMap.get(userId) as any;

          return {
            rank: rank + 1,
            xp: parseInt(score || '0'),
            level: myDbUser?.level || 1,
            currentStreak: myDbUser?.currentStreak || 0,
            longestStreak: myDbUser?.longestStreak || 0,
            avatarUrl: myDbUser?.avatarUrl || null,
            nearby: nearbyResults
          };
        }
      } catch (err) {
        console.error('Failed to fetch user rank from Redis, falling back to DB', err);
      }
    }

    // Fallback to DB
    return this.getMyRankFromDB(userId);
  }

  static async rebuildAllTimeLeaderboard() {
    if (!redis) throw new Error('Redis not connected');

    const groupedXP = await prisma.xPEvent.groupBy({
      by: ['userId'],
      _sum: { amount: true }
    });

    const users = await prisma.user.findMany({
      select: { id: true, displayName: true, username: true, leaderboardOptIn: true }
    });
    
    const userMap = new Map(users.map((u: any) => [u.id, u]));

    const multi = redis.multi();
    multi.del(ALL_TIME_KEY);
    
    for (const record of groupedXP) {
      const user: any = userMap.get(record.userId);
      if (!user || !user.leaderboardOptIn) continue;
      
      const xp = record._sum.amount || 0;
      multi.zadd(ALL_TIME_KEY, xp, record.userId);
      multi.hset('users:display_names', record.userId, user.displayName || user.username || 'Anonymous Writer');
    }
    
    await multi.exec();
    return groupedXP.length;
  }

  /**
   * DB-based fallback leaderboard — works even if Redis is empty.
   * Returns users ordered by XP, enriched with streak data.
   */
  static async getLeaderboardFromDB(limit = 100) {
    const users = await prisma.user.findMany({
      where: { leaderboardOptIn: true, xp: { gt: 0 } },
      orderBy: { xp: 'desc' },
      take: limit,
      select: {
        id: true,
        username: true,
        displayName: true,
        xp: true,
        level: true,
        currentStreak: true,
        longestStreak: true,
        avatarUrl: true,
      }
    });

    return users.map((u: any, i: number) => ({
      rank: i + 1,
      userId: u.id,
      displayName: u.displayName || u.username || 'Anonymous Writer',
      xp: u.xp,
      level: u.level,
      currentStreak: u.currentStreak,
      longestStreak: u.longestStreak,
      avatarUrl: u.avatarUrl,
    }));
  }

  /**
   * DB-based rank for a specific user.
   */
  static async getMyRankFromDB(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, currentStreak: true, longestStreak: true, displayName: true, username: true, avatarUrl: true }
    });

    if (!user) return null;

    const usersAbove = await prisma.user.count({
      where: { leaderboardOptIn: true, xp: { gt: user.xp } }
    });

    return {
      rank: usersAbove + 1,
      xp: user.xp,
      level: user.level,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      displayName: user.displayName || user.username || 'Anonymous Writer',
      avatarUrl: user.avatarUrl,
      nearby: []
    };
  }

  static async removeUser(userId: string) {
    if (!redis) return;
    try {
      const weeklyKey = getWeeklyKey();
      const multi = redis.multi();
      multi.zrem(ALL_TIME_KEY, userId);
      multi.zrem(weeklyKey, userId);
      multi.hdel('users:display_names', userId);
      await multi.exec();
    } catch (err) {
      console.error('Redis leaderboard remove failed (Safe to ignore)', err);
    }
  }
}

