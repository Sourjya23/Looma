import { z } from 'zod';

/**
 * Analysis schemas v2 — "honest reviewer" edition.
 *
 * Design rules:
 * 1. Every list may be empty. An empty list is a valid, often correct, result.
 * 2. Every flagged item says what KIND of thing it is (real error vs. optional idea)
 *    and how CONFIDENT the model is. Code — not the model — decides what is shown
 *    as a "mistake". See the postProcess* functions at the bottom.
 * 3. A holistic verdict is produced BEFORE the details, like a human teacher
 *    deciding "this is strong" before writing margin notes.
 *
 * Output field names used by the DB / frontend (mistakes, problems, strengths,
 * suggestions, scores) are unchanged. New fields are additive.
 */

export const PROMPT_VERSION = '2.0';

/** Minimum confidence for an item to be shown as a real mistake/problem. */
export const CONFIDENCE_THRESHOLD = 0.7;

export const VerdictEnum = z.enum(['needs_work', 'developing', 'solid', 'strong', 'exceptional']);
export type Verdict = z.infer<typeof VerdictEnum>;

/**
 * error         = objectively wrong (broken rule, misspelling, wrong word meaning)
 * clarity_issue = not "wrong", but a reader would genuinely stumble or misread
 * stylistic_option = correct and clear; just another way to say it (NEVER a mistake)
 */
export const FlagKindEnum = z.enum(['error', 'clarity_issue', 'stylistic_option']);

const confidence = z.number().min(0).max(1);

// ─── English Teacher ──────────────────────────────────────────────────────────

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
  kind: FlagKindEnum.default('error'),
  /** The rule broken, or the concrete way a reader would stumble. Required to justify the flag. */
  justification: z.string().default(''),
  confidence: confidence.default(0.5),
  correction: z.string(),
  explanation: z.string()
});

export const VocabularyImprovementSchema = z.object({
  originalText: z.string(),
  betterText: z.string(),
  /** Only "imprecise" / "wrong_meaning" are real issues. "alternative" is purely optional. */
  reason: z.enum(['wrong_meaning', 'imprecise', 'alternative']).default('alternative'),
  confidence: confidence.default(0.5),
  explanation: z.string()
});

export const EnglishAnalysisSchema = z.object({
  verdict: VerdictEnum.default('solid'),
  verdictReason: z.string().default(''),
  score: z.number().min(0).max(100),
  strengths: z.array(z.string()).max(5).default([]),
  mistakes: z.array(MistakeSchema).default([]),
  repetition: z.array(z.string()).default([]),
  vocabularyImprovements: z.array(VocabularyImprovementSchema).default([]),
  learningPoints: z.array(z.string()).max(3).default([])
});

export type EnglishAnalysisType = z.infer<typeof EnglishAnalysisSchema>;

// ─── Story Editor ─────────────────────────────────────────────────────────────

export const MetaEvaluationSchema = z.object({
  challengeAlignment: z.string(),
  targetAudience: z.string(),
  genreIdentification: z.string(),
  boredomFlaws: z.string(),          // may be "None — the story holds attention throughout."
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

const problemCore = {
  severity: z.enum(['low', 'medium', 'high']),
  location: z.string(),
  problem: z.string(),
  whyItMatters: z.string(),
  suggestion: z.string(),
  /** Would an experienced editor actually raise this in a real review? */
  editorWouldRaise: z.boolean().default(true),
  confidence: confidence.default(0.5)
};

export const StoryProblemSchema = z.object({
  category: ProblemCategoryEnum,
  ...problemCore
});

export const StoryAnalysisSchema = z.object({
  verdict: VerdictEnum.default('solid'),
  verdictReason: z.string().default(''),
  overallScore: z.number().min(0).max(100),
  conceptScore: z.number().min(0).max(100),
  characterScore: z.number().min(0).max(100),
  conflictScore: z.number().min(0).max(100),
  pacingScore: z.number().min(0).max(100),
  creativityScore: z.number().min(0).max(100),
  endingScore: z.number().min(0).max(100),
  visualStorytellingScore: z.number().min(0).max(100),
  strengths: z.array(StoryStrengthSchema).max(5).default([]),
  problems: z.array(StoryProblemSchema).default([]),
  suggestions: z.array(z.string()).max(3).default([]),
  metaEvaluation: MetaEvaluationSchema
});

export type StoryAnalysisType = z.infer<typeof StoryAnalysisSchema>;

// ─── Director ─────────────────────────────────────────────────────────────────

export const DirectorProblemCategoryEnum = z.enum([
  'visual_storytelling',
  'scene_construction',
  'show_dont_tell',
  'cinematic_potential'
]);

export const DirectorProblemSchema = z.object({
  category: DirectorProblemCategoryEnum,
  ...problemCore
});

export const DirectorAnalysisSchema = z.object({
  verdict: VerdictEnum.default('solid'),
  verdictReason: z.string().default(''),
  overallScore: z.number().min(0).max(100),
  visualStorytellingScore: z.number().min(0).max(100),
  sceneConstructionScore: z.number().min(0).max(100),
  showDontTellScore: z.number().min(0).max(100),
  cinematicPotentialScore: z.number().min(0).max(100),
  strengths: z.array(z.string()).max(5).default([]),
  problems: z.array(DirectorProblemSchema).default([]),
  suggestions: z.array(z.string()).max(3).default([])
});

export type DirectorAnalysisType = z.infer<typeof DirectorAnalysisSchema>;

// ─── Post-processing: code decides what counts as a mistake ──────────────────

/** Things that are fine as-is but the model had an idea about. Shown collapsed, never scored. */
export interface OptionalIdea {
  originalText?: string;
  location?: string;
  idea: string;
  explanation: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** True if the quoted text actually appears in the story (anti-hallucination). */
const quoteExists = (quote: string, story: string) => {
  const q = norm(quote);
  return q.length > 0 && norm(story).includes(q);
};

export function postProcessEnglish(raw: EnglishAnalysisType, story: string) {
  const mistakes: EnglishAnalysisType['mistakes'] = [];
  const optionalIdeas: OptionalIdea[] = [];

  for (const m of raw.mistakes) {
    if (!quoteExists(m.originalText, story)) continue;                 // invented quote → drop
    if (norm(m.originalText) === norm(m.correction)) continue;          // no-op "correction" → drop
    const isReal = m.kind !== 'stylistic_option'
      && m.confidence >= CONFIDENCE_THRESHOLD
      && m.justification.trim().length > 0;
    if (isReal) mistakes.push(m);
    else optionalIdeas.push({ originalText: m.originalText, idea: m.correction, explanation: m.explanation });
  }

  const vocabularyImprovements = raw.vocabularyImprovements.filter(v => {
    if (!quoteExists(v.originalText, story)) return false;
    if (v.reason === 'alternative' || v.confidence < CONFIDENCE_THRESHOLD) {
      optionalIdeas.push({ originalText: v.originalText, idea: v.betterText, explanation: v.explanation });
      return false;
    }
    return true;
  });

  return { ...raw, mistakes, vocabularyImprovements, optionalIdeas: optionalIdeas.slice(0, 3) };
}

function splitProblems<T extends { editorWouldRaise: boolean; confidence: number; location: string; suggestion: string; problem: string }>(problems: T[]) {
  const kept: T[] = [];
  const optionalIdeas: OptionalIdea[] = [];
  for (const p of problems) {
    if (p.editorWouldRaise && p.confidence >= CONFIDENCE_THRESHOLD) kept.push(p);
    else optionalIdeas.push({ location: p.location, idea: p.suggestion, explanation: p.problem });
  }
  return { kept, optionalIdeas: optionalIdeas.slice(0, 3) };
}

export function postProcessStory(raw: StoryAnalysisType) {
  const { kept, optionalIdeas } = splitProblems(raw.problems);
  return { ...raw, problems: kept, optionalIdeas };
}

export function postProcessDirector(raw: DirectorAnalysisType) {
  const { kept, optionalIdeas } = splitProblems(raw.problems);
  return { ...raw, problems: kept, optionalIdeas };
}
