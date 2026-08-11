import { EnglishAnalysisSchema } from './apps/api/src/schemas/analysis.schema.js';
const data = {"score":60,"strengths":[],"mistakes":[{"originalText":"He went there","category":"grammar","subCategory":"tense","correction":"He went to there","explanation":"The sentence is missing the correct preposition 'to' before the destination. The verb tense should also be consistent throughout the story."}],"repetition":[],"vocabularyImprovements":[],"learningPoints":["Focus on using correct verb tenses and prepositions to improve sentence structure"]};
console.log(EnglishAnalysisSchema.parse(data));
