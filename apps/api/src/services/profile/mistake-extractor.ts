import { prisma } from '../../config/database.js';

// CP3: Canonical Mistake Normalization
const canonicalSubCategoryMap: Record<string, string> = {
  'past_tense': 'tense',
  'verb_tense': 'tense',
  'tense_consistency': 'tense',
  'tenses': 'tense',
  'wrong_tense': 'tense',
  
  'article_error': 'articles',
  'wrong_article': 'articles',
  'article_usage': 'articles',
  'missing_article': 'articles',
  'definite_article': 'articles',
  'indefinite_article': 'articles',
  
  'preposition_error': 'prepositions',
  'wrong_preposition': 'prepositions',
  'preposition_usage': 'prepositions',
  
  'subject_verb': 'subject_verb_agreement',
  'sva': 'subject_verb_agreement',
  'agreement': 'subject_verb_agreement',
  
  'spelling_error': 'spelling',
  'typo': 'spelling',
  
  'comma_splice': 'punctuation',
  'missing_comma': 'punctuation',
  'period': 'punctuation',
};

export const normalizeSubCategory = (category: string, subCategory?: string | null): string => {
  let raw = subCategory ? subCategory.trim() : category.trim();
  if (!raw) return 'General';
  
  // Replace hyphens and spaces with underscores for canonical map lookup
  let lookupKey = raw.toLowerCase().replace(/[-\s]+/g, '_');
  
  // Use canonical map if it exists, otherwise use the raw key
  let normalized = canonicalSubCategoryMap[lookupKey] || lookupKey;

  // Convert snake_case to Title Case (e.g. past_tense -> Past Tense)
  return normalized.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// CP2: Extract mistakes reliably and idempotently
export const extractMistakesFromAnalysis = async (
  userId: string,
  submissionId: string,
  mistakesPayload: any[]
) => {
  if (!mistakesPayload || !Array.isArray(mistakesPayload)) {
    return;
  }

  // Idempotency check: Delete existing mistakes for this submission to avoid duplicates
  await prisma.detectedMistake.deleteMany({
    where: { submissionId }
  });

  const mistakesToInsert = mistakesPayload
    .filter(m => m.category && m.originalText && m.correction && m.explanation) // Reject malformed
    .map(m => {
      return {
        userId,
        submissionId,
        category: m.category,
        subCategory: normalizeSubCategory(m.category, m.subCategory),
        originalText: m.originalText,
        correction: m.correction,
        explanation: m.explanation,
      };
    });

  if (mistakesToInsert.length > 0) {
    await prisma.detectedMistake.createMany({
      data: mistakesToInsert
    });
  }
};
