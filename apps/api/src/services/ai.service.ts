import { EnglishAnalysisSchema, EnglishAnalysisType, StoryAnalysisSchema, StoryAnalysisType, DirectorAnalysisSchema, DirectorAnalysisType } from '../schemas/analysis.schema.js';
import { generateEnglishTeacherPrompt, generateStoryEditorPrompt, generateDirectorPrompt, generateProfileInterpretationPrompt } from './ai.prompts.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import OpenAI from 'openai';
import { jsonrepair } from 'jsonrepair';

const baseURL = process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/';
const MODEL_NAME = process.env.MODEL_NAME || 'gemini-3.6-flash';

// ── Key Rotation Manager ─────────────────────────────────────────────────────
// Load all GEMINI_API_KEY_* env vars (GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, ...)
// Also accepts a comma-separated GEMINI_API_KEYS list.
const collectApiKeys = (): string[] => {
  const keys: string[] = [];
  // Comma-separated list takes priority
  const listEnv = process.env.GEMINI_API_KEYS || process.env.AI_API_KEYS;
  if (listEnv) {
    keys.push(...listEnv.split(',').map(k => k.trim()).filter(Boolean));
  }
  // Also pick up individually numbered keys
  const primary = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;
  if (primary && !keys.includes(primary)) keys.push(primary);
  for (let i = 2; i <= 10; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`] || process.env[`AI_API_KEY_${i}`];
    if (k && !keys.includes(k)) keys.push(k);
  }
  return keys.filter(Boolean);
};

const API_KEYS = collectApiKeys();
let currentKeyIndex = 0;

const getClient = (): OpenAI => {
  const key = API_KEYS[currentKeyIndex] || API_KEYS[0];
  return new OpenAI({ apiKey: key, baseURL });
};

const rotateKey = (): boolean => {
  if (API_KEYS.length <= 1) return false;
  const nextIndex = (currentKeyIndex + 1) % API_KEYS.length;
  if (nextIndex === currentKeyIndex) return false;
  currentKeyIndex = nextIndex;
  console.warn(`[AIService] Rotated to API key index ${currentKeyIndex}`);
  return true;
};

const isQuotaError = (err: any): boolean => {
  const msg = String(err?.message || err?.status || '');
  return err?.status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
};

/** Call the AI API with automatic key rotation on quota errors */
const callWithRotation = async (fn: (client: OpenAI) => Promise<any>): Promise<any> => {
  const tried = new Set<number>();
  while (true) {
    if (tried.has(currentKeyIndex)) {
      throw new Error(`All ${API_KEYS.length} API key(s) have been exhausted (quota exceeded). Retry after quota resets.`);
    }
    tried.add(currentKeyIndex);
    try {
      return await fn(getClient());
    } catch (err: any) {
      if (isQuotaError(err)) {
        console.warn(`[AIService] Key ${currentKeyIndex} quota exceeded. Rotating...`);
        if (!rotateKey()) throw err; // no other key available
      } else {
        throw err;
      }
    }
  }
};

console.log(`[AIService] Loaded ${API_KEYS.length} API key(s) for rotation.`);

export class AIService {
  private static sanitizeJSON(content: string): string {
    let clean = content.trim();
    
    // Remove <think>...</think> reasoning blocks
    clean = clean.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Find the first and last curly brace or bracket to extract pure JSON
    const firstBrace = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');
    
    let startIdx = -1;
    let endIdx = -1;
    
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIdx = firstBrace;
        endIdx = clean.lastIndexOf('}');
    } else if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
        startIdx = firstBracket;
        endIdx = clean.lastIndexOf(']');
    }

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        clean = clean.substring(startIdx, endIdx + 1);
        try {
            clean = jsonrepair(clean);
        } catch (e) {
            console.warn("[AIService] jsonrepair could not fix the JSON:", e);
        }
    } else {
        console.error("[AIService] Failed to find JSON boundaries in model output. Raw output was:", content.substring(0, 500) + "...");
        throw new Error("Failed to extract JSON from AI response: Missing braces/brackets");
    }
    
    return clean.trim();
  }

  static async analyzeEnglish(submissionId: string, content: string, challengePrompt: string): Promise<EnglishAnalysisType> {
    try {
      const schemaJson = JSON.stringify(zodToJsonSchema(EnglishAnalysisSchema as any));
      const prompt = generateEnglishTeacherPrompt(content, challengePrompt, schemaJson);

      const completion = await callWithRotation(client => client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      }));

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) throw new Error("AI returned empty response");

      const json = JSON.parse(this.sanitizeJSON(responseContent));
      return EnglishAnalysisSchema.parse(json);
      
    } catch (error) {
      console.error('Error communicating with AI API:', error);
      throw error;
    }
  }

  static async analyzeStory(submissionId: string, content: string, challengePrompt: string): Promise<StoryAnalysisType> {
    try {
      const schemaJson = JSON.stringify(zodToJsonSchema(StoryAnalysisSchema as any));
      const prompt = generateStoryEditorPrompt(content, challengePrompt, schemaJson);

      const completion = await callWithRotation(client => client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }));

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) throw new Error("AI returned empty response");

      const json = JSON.parse(this.sanitizeJSON(responseContent));
      return StoryAnalysisSchema.parse(json);
      
    } catch (error) {
      console.error('Error communicating with AI API:', error);
      throw error;
    }
  }

  static async analyzeDirector(submissionId: string, content: string, challengePrompt: string): Promise<DirectorAnalysisType> {
    try {
      const schemaJson = JSON.stringify(zodToJsonSchema(DirectorAnalysisSchema as any));
      const prompt = generateDirectorPrompt(content, challengePrompt, schemaJson);

      const completion = await callWithRotation(client => client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }));

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) throw new Error("AI returned empty response");

      const json = JSON.parse(this.sanitizeJSON(responseContent));
      return DirectorAnalysisSchema.parse(json);
      
    } catch (error) {
      console.error('Error communicating with AI API:', error);
      throw error;
    }
  }
  static async generateComponents(componentType: string, count: number = 3): Promise<string[]> {
    try {
      const { generateComponentsPrompt } = await import('./ai.prompts.js');
      const prompt = generateComponentsPrompt(componentType, count);

      const completion = await callWithRotation(client => client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }));

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) throw new Error("AI returned empty response");

      const json = JSON.parse(this.sanitizeJSON(responseContent));
      return json as string[];
      
    } catch (error) {
      console.error('Error generating components:', error);
      return [];
    }
  }

  static async generateHolisticChallenge(difficulty: string, timeMins: number, words: number, historyPrompts: string[], targetSkill?: string): Promise<any> {
    try {
      const { generateHolisticChallengePrompt } = await import('./ai.prompts.js');
      const prompt = generateHolisticChallengePrompt(difficulty, timeMins, words, historyPrompts, targetSkill);

      const completion = await callWithRotation(client => client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }));

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) throw new Error("AI returned empty response");

      const json = JSON.parse(this.sanitizeJSON(responseContent));
      return json;
      
    } catch (error) {
      console.error('Error generating holistic challenge:', error);
      throw error;
    }
  }

  static async interpretProfile(factsJson: string): Promise<string> {
    try {
      const { generateProfileInterpretationPrompt } = await import('./ai.prompts.js');
      const prompt = generateProfileInterpretationPrompt(factsJson);

      const completion = await callWithRotation(client => client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: MODEL_NAME,
        temperature: 0.5,
      }));

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) throw new Error("AI returned empty response");

      return responseContent;
      
    } catch (error) {
      console.error('Error communicating with AI API:', error);
      throw error;
    }
  }
}
