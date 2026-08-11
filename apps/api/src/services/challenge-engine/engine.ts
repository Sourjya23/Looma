import { Difficulty, pickRandom } from './randomizer.js';
import { isChallengeFresh } from './validator.js';
import { componentCache } from './cache.js';
import { AIService } from '../ai.service.js';
import { prisma } from '../../config/database.js';
import crypto from 'crypto';

export interface GeneratedChallenge {
  prompt: string;
  genre: string | null;
  character: string | null;
  setting: string | null;
  situation: string | null;
  object: string | null;
  constraint: string | null;
  reasoning?: string | null;
  difficulty: Difficulty;
  fingerprint: string;
}

export async function generateChallenge(userId: string, difficulty: Difficulty = 'intermediate', timeLimit: number = 15, wordTarget: number = 500, targetSkill?: string): Promise<GeneratedChallenge> {
  // 1. Fetch past prompts for uniqueness context
  const pastChallenges = await prisma.challenge.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { prompt: true }
  });
  const historyPrompts = pastChallenges.map((c: { prompt: string }) => c.prompt);

  try {
    // 2. Call the holistic generator
    const data = await AIService.generateHolisticChallenge(difficulty, timeLimit, wordTarget, historyPrompts, targetSkill);
    
    // Create a fingerprint
    const fingerprintParts = [data.genre, data.character, data.setting, data.situation, data.object, data.constraint, data.prompt];
    const fingerprint = crypto.createHash('sha256').update(fingerprintParts.filter(Boolean).join('|')).digest('hex');

    return {
      prompt: data.prompt,
      genre: data.genre || null,
      character: data.character || null,
      setting: data.setting || null,
      situation: data.situation || null,
      object: data.object || null,
      constraint: data.constraint || null,
      reasoning: data.reasoning || null,
      difficulty,
      fingerprint
    };
  } catch (error) {
    console.error("Holistic generation failed, falling back to cache engine:", error);
    return await generateFallbackChallenge(userId, difficulty);
  }
}

async function generateFallbackChallenge(userId: string, difficulty: Difficulty): Promise<GeneratedChallenge> {
  const MAX_ATTEMPTS = 50;
  
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    let prompt = '';
    let genre: string | null = null;
    let character: string | null = null;
    let setting: string | null = null;
    let situation: string | null = null;
    let object: string | null = null;
    let constraint: string | null = null;

    const beginnerTemplates = ['single_word', 'object', 'character', 'situation', 'genre_only'];
    const intermediateTemplates = ['opening_sentence', 'ending_sentence', 'two_words', 'genre_word'];
    const advancedTemplates = ['visual_storytelling', 'time_constraint', 'genre_constraint'];

    let chosenTemplate = '';
    if (difficulty === 'beginner') chosenTemplate = pickRandom(beginnerTemplates);
    else if (difficulty === 'intermediate') chosenTemplate = pickRandom(intermediateTemplates);
    else chosenTemplate = pickRandom(advancedTemplates);

    if (!chosenTemplate) chosenTemplate = 'single_word';

    switch (chosenTemplate) {
      case 'single_word':
        prompt = await componentCache.getComponent('word');
        break;
      case 'object':
        object = await componentCache.getComponent('object');
        prompt = object;
        break;
      case 'character':
        character = await componentCache.getComponent('character');
        prompt = character;
        break;
      case 'situation':
        situation = await componentCache.getComponent('situation');
        prompt = situation;
        break;
      case 'genre_only':
        genre = await componentCache.getComponent('genre');
        prompt = `Genre: ${genre}`;
        break;
      case 'opening_sentence':
        prompt = await componentCache.getComponent('openingSentence');
        break;
      case 'ending_sentence':
        prompt = await componentCache.getComponent('endingSentence');
        break;
      case 'two_words':
        const word1 = await componentCache.getComponent('word');
        const word2 = await componentCache.getComponent('word');
        prompt = `${word1} + ${word2}`;
        break;
      case 'genre_word':
        genre = await componentCache.getComponent('genre');
        const gwWord = await componentCache.getComponent('word');
        prompt = `${genre} + ${gwWord}`;
        break;
      case 'visual_storytelling':
        const visual = await componentCache.getComponent('visualSituation');
        prompt = `Visual Storytelling Challenge: ${visual}`;
        break;
      case 'time_constraint':
        constraint = await componentCache.getComponent('constraint');
        prompt = `Constraint: ${constraint}`;
        break;
      case 'genre_constraint':
        genre = await componentCache.getComponent('genre');
        constraint = await componentCache.getComponent('constraint');
        prompt = `${genre} + ${constraint}`;
        break;
    }

    const fingerprintParts = [chosenTemplate, genre, character, setting, situation, object, constraint, prompt];
    const fingerprint = Buffer.from(fingerprintParts.filter(Boolean).join('|')).toString('base64');

    const isFresh = await isChallengeFresh(userId, fingerprint);
    if (!isFresh) continue;

    return { prompt, genre, character, setting, situation, object, constraint, difficulty, fingerprint };
  }
  
  throw new Error("Could not generate a unique fallback challenge.");
}

