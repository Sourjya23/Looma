import { PrismaClient } from '@prisma/client';
import { extractMistakesFromAnalysis } from './src/services/profile/mistake-extractor.js';
import { updateWritingProfile } from './src/services/profile/profile-engine.js';
import { generateAIProfileInterpretation } from './src/services/profile/ai-interpreter.js';

const prisma = new PrismaClient();

async function backfill() {
  console.log('Starting backfill process...');
  const submissions = await prisma.submission.findMany({
    include: {
      session: true,
      englishAnalysis: true
    }
  });

  const userIds = new Set<string>();

  for (const sub of submissions) {
    if (sub.englishAnalysis && Array.isArray(sub.englishAnalysis.mistakes as any[])) {
      console.log(`Extracting mistakes for submission ${sub.id}...`);
      await extractMistakesFromAnalysis(sub.session.userId, sub.id, sub.englishAnalysis.mistakes as any[]);
      userIds.add(sub.session.userId);
    }
  }

  for (const userId of userIds) {
    console.log(`Updating profile for user ${userId}...`);
    const profile = await updateWritingProfile(userId);
    if (profile) {
      console.log(`Generating AI interpretation for user ${userId}...`);
      await generateAIProfileInterpretation(userId, profile);
    }
  }

  console.log('Backfill process complete!');
}

backfill().catch(console.error).finally(() => prisma.$disconnect());
