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

    const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8000';
    // Call the Python AI service
    const res = await fetch(`${PYTHON_AI_SERVICE_URL}/interpret-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facts: aggregatedFacts })
    });

    if (!res.ok) {
      console.error('Failed to get AI profile interpretation from Python service');
      return null;
    }

    const data = await res.json();
    const interpretation = data.interpretation;

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
