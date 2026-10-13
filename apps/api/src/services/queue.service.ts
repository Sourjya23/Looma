import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';
import { PROMPT_VERSION } from '../schemas/analysis.schema.js';
import { AIService } from './ai.service.js';
import { prisma } from '../config/database.js';

const connectionOptions: any = {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  lazyConnect: true,
  connectTimeout: 1500,
  retryStrategy(times: number) {
    if (times > 1) return null;
    return 1000;
  }
};

let queueConnection: IORedis | null = null;
let workerConnection: IORedis | null = null;
let _aiQueue: any = null;
let _aiWorker: any = null;

try {
  queueConnection = new IORedis(env.REDIS_URL, connectionOptions);
  workerConnection = new IORedis(env.REDIS_URL, connectionOptions);

  queueConnection.on('error', () => {});
  workerConnection.on('error', () => {});

  _aiQueue = new Queue('ai-analysis', { 
    connection: queueConnection,
    defaultJobOptions: {
      attempts: 6,
      backoff: { 
        type: 'custom',
      }
    }
  });

  _aiWorker = new Worker('ai-analysis', async (job: Job<AIJobData>) => {
    const { submissionId, content, challengePrompt, role } = job.data;
    console.log(`[Worker] Started job ${job.id} for role: ${role}`);
    await processAIAnalysis(role, submissionId, content, challengePrompt);
    console.log(`[Worker] Completed job ${job.id} for role: ${role}`);
  }, { 
    connection: workerConnection,
    concurrency: 1,
    maxStalledCount: 3,
  });

  _aiWorker.on('completed', (job: any) => {
    console.log(`Job with id ${job.id} has been completed`);
  });

  _aiWorker.on('failed', (job: any, err: any) => {
    console.log(`Job with id ${job?.id} has failed with ${err.message}`);
  });
} catch (initErr) {
  console.warn('[Queue] Redis client initialization skipped or failed:', initErr);
}

export const aiQueue: any = _aiQueue;
export const aiWorker: any = _aiWorker;

export interface AIJobData {
  submissionId: string;
  content: string;
  challengePrompt: string;
  role: 'english' | 'story' | 'director';
}

export async function processAIAnalysis(
  role: 'english' | 'story' | 'director',
  submissionId: string,
  content: string,
  challengePrompt: string
) {
  switch (role) {
    case 'english': {
      const englishResult = await AIService.analyzeEnglish(submissionId, content, challengePrompt);
      const englishPayload = {
        score: englishResult.score,
        strengths: englishResult.strengths,
        mistakes: englishResult.mistakes,
        repetition: englishResult.repetition,
        vocabularyImprovements: englishResult.vocabularyImprovements,
        learningPoints: englishResult.learningPoints,
        verdict: englishResult.verdict,
        verdictReason: englishResult.verdictReason,
        optionalIdeas: englishResult.optionalIdeas as any,
        promptVersion: PROMPT_VERSION,
      };
      await prisma.englishAnalysis.upsert({
        where: { submissionId },
        update: englishPayload,
        create: { submissionId, ...englishPayload }
      });
      
      try {
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
    }
    case 'story': {
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
        verdict: storyResult.verdict,
        verdictReason: storyResult.verdictReason,
        optionalIdeas: storyResult.optionalIdeas as any,
        promptVersion: PROMPT_VERSION,
      };
      await prisma.storyAnalysis.upsert({
        where: { submissionId },
        update: storyPayload,
        create: { submissionId, ...storyPayload }
      });
      break;
    }
    case 'director': {
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
        verdict: directorResult.verdict,
        verdictReason: directorResult.verdictReason,
        optionalIdeas: directorResult.optionalIdeas as any,
        promptVersion: PROMPT_VERSION,
      };
      await prisma.directorAnalysis.upsert({
        where: { submissionId },
        update: directorPayload,
        create: { submissionId, ...directorPayload }
      });
      break;
    }
  }
}

/**
 * Dispatches analysis to BullMQ queue if Redis is connected,
 * or gracefully runs in-process direct analysis if Redis is offline.
 */
export async function dispatchAIAnalysis(
  submissionId: string,
  content: string,
  challengePrompt: string
) {
  let enqueued = false;

  if (aiQueue && queueConnection && (queueConnection.status === 'ready' || queueConnection.status === 'connecting')) {
    try {
      await Promise.race([
        Promise.all([
          aiQueue.add('english-analysis', { submissionId, content, challengePrompt, role: 'english' }),
          aiQueue.add('story-analysis', { submissionId, content, challengePrompt, role: 'story' }),
          aiQueue.add('director-analysis', { submissionId, content, challengePrompt, role: 'director' }),
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 1200))
      ]);
      enqueued = true;
      console.log(`[Queue] Successfully enqueued AI analysis jobs for submission ${submissionId}`);
    } catch (err: any) {
      console.warn(`[Queue] Redis unavailable (${err?.message || err}). Falling back to direct analysis.`);
    }
  }

  if (!enqueued) {
    console.log(`[DirectAnalysis] Running in-process AI analysis for submission ${submissionId}`);
    setTimeout(async () => {
      try {
        await processAIAnalysis('english', submissionId, content, challengePrompt);
        await processAIAnalysis('story', submissionId, content, challengePrompt);
        await processAIAnalysis('director', submissionId, content, challengePrompt);
        console.log(`[DirectAnalysis] Completed all AI analyses for submission ${submissionId}`);
      } catch (directErr) {
        console.error(`[DirectAnalysis] Failed processing submission ${submissionId}:`, directErr);
      }
    }, 50);
  }
}
