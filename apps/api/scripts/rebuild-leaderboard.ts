import { PrismaClient } from '@prisma/client';
import { LeaderboardService } from '../src/services/leaderboard.service';

const prisma = new PrismaClient();

async function main() {
  console.log('Opting in all existing users to leaderboard...');
  await prisma.user.updateMany({
    data: { leaderboardOptIn: true }
  });

  console.log('Rebuilding leaderboard...');
  const usersCount = await LeaderboardService.rebuildAllTimeLeaderboard();
  
  console.log(`Successfully rebuilt leaderboard for ${usersCount} users.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
