import { AIService } from '../ai.service.js';
import { prisma } from '../../config/database.js';

// CP9: AI Profile Interpretation
export const generateAIProfileInterpretation = async (userId: string, profile: any) => {
  try {
    // We only pass aggregated facts, NOT the entire history
    const aggregatedFacts = JSON.stringify({
      averageGrammarScore: profile.averageGrammarScore,
      averageStoryScore: profile.averageStoryScore,
      strengths: profile.strengths,
      topWeaknesses: profile.weaknesses.slice(0, 3).map((w: any) => ({
        subCategory: w.subCategory,
        trend: w.trend,
        occurrences: w.count
      }))
    });

    // Call the Groq AI service directly instead of external Python service
    const interpretation = await AIService.interpretProfile(aggregatedFacts);
    
    if (!interpretation) {
      console.error('Failed to get AI profile interpretation from AIService');
      return null;
    }

    // Save interpretation to DB
    await prisma.writingProfile.update({
      where: { userId },
      data: { aiInterpretation: interpretation }
    });

    return interpretation;
  } catch (err) {
    console.error('Error in generateAIProfileInterpretation:', err);
    return null;
  }
};
