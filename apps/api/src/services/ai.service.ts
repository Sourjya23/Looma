import { EnglishAnalysisSchema, EnglishAnalysisType, StoryAnalysisSchema, StoryAnalysisType, DirectorAnalysisSchema, DirectorAnalysisType } from '../schemas/analysis.schema.js';
import { generateEnglishTeacherPrompt, generateStoryEditorPrompt, generateDirectorPrompt, generateProfileInterpretationPrompt } from './ai.prompts.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL_NAME = process.env.MODEL_NAME || 'qwen/qwen3.6-27b';

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

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.2
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) throw new Error("Groq returned empty response");

      const json = JSON.parse(this.sanitizeJSON(responseContent));
      return EnglishAnalysisSchema.parse(json);
      
    } catch (error) {
      console.error('Error communicating with Groq API:', error);
      throw error;
    }
  }

  static async analyzeStory(submissionId: string, content: string, challengePrompt: string): Promise<StoryAnalysisType> {
    try {
      const schemaJson = JSON.stringify(zodToJsonSchema(StoryAnalysisSchema as any));
      const prompt = generateStoryEditorPrompt(content, challengePrompt, schemaJson);

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.3
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) throw new Error("Groq returned empty response");

      const json = JSON.parse(this.sanitizeJSON(responseContent));
      return StoryAnalysisSchema.parse(json);
      
    } catch (error) {
      console.error('Error communicating with Groq API:', error);
      throw error;
    }
  }

  static async analyzeDirector(submissionId: string, content: string, challengePrompt: string): Promise<DirectorAnalysisType> {
    try {
      const schemaJson = JSON.stringify(zodToJsonSchema(DirectorAnalysisSchema as any));
      const prompt = generateDirectorPrompt(content, challengePrompt, schemaJson);

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.3
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) throw new Error("Groq returned empty response");

      const json = JSON.parse(this.sanitizeJSON(responseContent));
      return DirectorAnalysisSchema.parse(json);
      
    } catch (error) {
      console.error('Error communicating with Groq API:', error);
      throw error;
    }
  }
  static async generateComponents(componentType: string, count: number = 3): Promise<string[]> {
    try {
      const { generateComponentsPrompt } = await import('./ai.prompts.js');
      const prompt = generateComponentsPrompt(componentType, count);

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.7
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) throw new Error("Groq returned empty response");

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

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.7
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) throw new Error("Groq returned empty response");

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

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: MODEL_NAME,
        temperature: 0.5,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) throw new Error("Groq returned empty response");

      return responseContent;
      
    } catch (error) {
      console.error('Error communicating with Groq API:', error);
      throw error;
    }
  }
}
