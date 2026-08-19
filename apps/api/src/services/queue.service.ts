import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';
import { AIService } from './ai.service.js';
import { prisma } from '../config/database.js';

const connectionOptions = {
  maxRetriesPerRequest: null,
};
const queueConnection = new IORedis(env.REDIS_URL, connectionOptions);
const workerConnection = new IORedis(env.REDIS_URL, connectionOptions);

export const aiQueue = new Queue('ai-analysis', { 
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 6,  // Try up to 6 times (covers full key rotation + retries after quota reset)
    backoff: { 
      type: 'custom',
    }
  }
});

interface AIJobData {
  submissionId: string;
  content: string;
  challengePrompt: string;
  role: 'english' | 'story' | 'director';
}

export const aiWorker = new Worker('ai-analysis', async (job: Job<AIJobData>) => {
  const { submissionId, content, challengePrompt, role } = job.data;
  console.log(`[Worker] Started job ${job.id} for role: ${role}`);
  
  try {
    switch (role) {
      case 'english':
        const englishResult = await AIService.analyzeEnglish(submissionId, content, challengePrompt);
        const englishPayload = {
          score: englishResult.score,
          strengths: englishResult.strengths,
          mistakes: englishResult.mistakes,
          repetition: englishResult.repetition,
          vocabularyImprovements: englishResult.vocabularyImprovements,
          learningPoints: englishResult.learningPoints,
        };
        await prisma.englishAnalysis.upsert({
          where: { submissionId },
          update: englishPayload,
          create: { submissionId, ...englishPayload }
        });
        
        try {
          // Trigger Profile Update Pipeline
          const submission = await prisma.submission.findUnique({ where: { id: submissionId }, include: { session: true }});
          if (submission) {
            const { extractMistakesFromAnalysis } = await import('./profile/mistake-extractor.js');
            const { updateWritingProfile } = await import('./profile/profile-engine.js');
            const { generateAIProfileInterpretation } = await import('./profile/ai-interpreter.js');
            
            await extractMistakesFromAnalysis(submission.session.userId, submission.id, englishResult.mistakes as any[]);
            const profile = await updateWritingProfile(submission.session.userId);
            if (profile) {
              await generateAIProfileInterpretation(submission.session.userId, profile);
            }
          }
        } catch (err) {
          console.error('Failed to update writing profile pipeline:', err);
        }
        break;
      case 'story':
        const storyResult = await AIService.analyzeStory(submissionId, content, challengePrompt);
        const storyPayload = {
          overallScore: storyResult.overallScore,
          conceptScore: storyResult.conceptScore,
          characterScore: storyResult.characterScore,
          conflictScore: storyResult.conflictScore,
          pacingScore: storyResult.pacingScore,
          creativityScore: storyResult.creativityScore,
          endingScore: storyResult.endingScore,
          visualStorytellingScore: storyResult.visualStorytellingScore ?? 0,
          strengths: storyResult.strengths,
          problems: storyResult.problems,
          suggestions: storyResult.suggestions,
          metaEvaluation: storyResult.metaEvaluation,
        };
        await prisma.storyAnalysis.upsert({
          where: { submissionId },
          update: storyPayload,
          create: { submissionId, ...storyPayload }
        });
        break;
      case 'director':
        const directorResult = await AIService.analyzeDirector(submissionId, content, challengePrompt);
        const directorPayload = {
          overallScore: directorResult.overallScore,
          visualStorytellingScore: directorResult.visualStorytellingScore,
          sceneConstructionScore: directorResult.sceneConstructionScore,
          showDontTellScore: directorResult.showDontTellScore,
          cinematicPotentialScore: directorResult.cinematicPotentialScore,
          strengths: directorResult.strengths,
          problems: directorResult.problems,
          suggestions: directorResult.suggestions,
        };
        await prisma.directorAnalysis.upsert({
          where: { submissionId },
          update: directorPayload,
          create: { submissionId, ...directorPayload }
        });
        break;
    }
    console.log(`[Worker] Completed job ${job.id} for role: ${role}`);
  } catch (err: any) {
    console.error(`[Worker Error] AI analysis failed for ${role} on submission ${submissionId}:`, err?.message || err);
    throw err; // triggers bullmq retry
  }
}, { 
  connection: workerConnection,
  concurrency: 1, // Process one by one to avoid Groq burst rate limits
});

aiWorker.on('completed', (job) => {
  console.log(`Job with id ${job.id} has been completed`);
});

aiWorker.on('failed', (job, err) => {
  console.log(`Job with id ${job?.id} has failed with ${err.message}`);
});
