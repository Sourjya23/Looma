import { z } from 'zod';

export const MistakeCategoryEnum = z.enum([
  'grammar',
  'sentence_structure',
  'word_choice',
  'punctuation',
  'spelling',
  'natural_english'
]);

export const MistakeSchema = z.object({
  originalText: z.string(),
  category: MistakeCategoryEnum,
  subCategory: z.string().nullable().optional(),
  correction: z.string(),
  explanation: z.string()
});

export const VocabularyImprovementSchema = z.object({
  originalText: z.string(),
  betterText: z.string(),
  explanation: z.string()
});

export const EnglishAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  mistakes: z.array(MistakeSchema),
  repetition: z.array(z.string()),
  vocabularyImprovements: z.array(VocabularyImprovementSchema),
  learningPoints: z.array(z.string())
});

export type EnglishAnalysisType = z.infer<typeof EnglishAnalysisSchema>;

// --- Story Editor (Phase 3) Schemas ---

export const MetaEvaluationSchema = z.object({
  challengeAlignment: z.string(),
  targetAudience: z.string(),
  genreIdentification: z.string(),
  boredomFlaws: z.string(),
  contextContinuity: z.string(),
  sequelPotential: z.string()
});

export const StoryStrengthSchema = z.object({
  point: z.string(),
  reasoning: z.string()
});

export const ProblemCategoryEnum = z.enum([
  'concept',
  'character',
  'conflict',
  'pacing',
  'creativity',
  'ending'
]);

export const StoryProblemSchema = z.object({
  category: ProblemCategoryEnum,
  severity: z.enum(['low', 'medium', 'high']),
  location: z.string(),
  problem: z.string(),
  whyItMatters: z.string(),
  suggestion: z.string()
});

export const StoryAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  conceptScore: z.number().min(0).max(100),
  characterScore: z.number().min(0).max(100),
  conflictScore: z.number().min(0).max(100),
  pacingScore: z.number().min(0).max(100),
  creativityScore: z.number().min(0).max(100),
  endingScore: z.number().min(0).max(100),
  visualStorytellingScore: z.number().min(0).max(100),
  strengths: z.array(StoryStrengthSchema),
  problems: z.array(StoryProblemSchema),
  suggestions: z.array(z.string()),
  metaEvaluation: MetaEvaluationSchema
});

export type StoryAnalysisType = z.infer<typeof StoryAnalysisSchema>;

// --- Director (Phase 4) Schemas ---

export const DirectorProblemCategoryEnum = z.enum([
  'visual_storytelling',
  'scene_construction',
  'show_dont_tell',
  'cinematic_potential'
]);

export const DirectorProblemSchema = z.object({
  category: DirectorProblemCategoryEnum,
  severity: z.enum(['low', 'medium', 'high']),
  location: z.string(),
  problem: z.string(),
  whyItMatters: z.string(),
  suggestion: z.string()
});

export const DirectorAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  visualStorytellingScore: z.number().min(0).max(100),
  sceneConstructionScore: z.number().min(0).max(100),
  showDontTellScore: z.number().min(0).max(100),
  cinematicPotentialScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  problems: z.array(DirectorProblemSchema),
  suggestions: z.array(z.string())
});

export type DirectorAnalysisType = z.infer<typeof DirectorAnalysisSchema>;
