import { prisma } from '../../config/database.js';
import { generateChallenge, GeneratedChallenge } from './engine.js';
import { Difficulty } from './randomizer.js';

export interface AdaptiveChallenge extends GeneratedChallenge {
  mode: 'normal' | 'adaptive';
  targetSkill?: string;
  reasoning?: string;
}

export interface AdaptiveChallenge extends GeneratedChallenge {
  mode: 'normal' | 'adaptive';
  targetSkill?: string;
  reasoning?: string;
}

export const generateAdaptiveChallenge = async (userId: string, difficulty: Difficulty = 'intermediate', timeLimit: number = 15, wordTarget: number = 500): Promise<AdaptiveChallenge> => {
  // 1. Fetch Profile
  const profile = await prisma.writingProfile.findUnique({
    where: { userId }
  });

  let mode: 'normal' | 'adaptive' = 'normal';
  let targetSkill: string | undefined;
  let reasoning: string | undefined;

  // 2. Decide if adaptive (CP13: 70% chance if there is a focus area)
  if (profile && Array.isArray(profile.weaknesses) && profile.weaknesses.length > 0) {
    const topWeakness = profile.weaknesses[0] as any; 
    
    // Only target if priorityScore is meaningful
    if (topWeakness.priorityScore >= 1.0) {
      const isAdaptiveRoll = Math.random() < 0.7; // 70% adaptive, 30% exploration
      
      if (isAdaptiveRoll) {
        mode = 'adaptive';
        targetSkill = topWeakness.subCategory;
      }
    }
  }

  // 3. Generate the base fresh challenge (CP12: Same skill, fresh scenario)
  const baseChallenge = await generateChallenge(userId, difficulty, timeLimit, wordTarget, targetSkill);

  // 4. Extract reasoning if the AI provided it
  if (baseChallenge.reasoning) {
    reasoning = baseChallenge.reasoning;
  }

  return {
    ...baseChallenge,
    mode,
    targetSkill,
    reasoning
  };
};
