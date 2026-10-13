-- Honest reviewer v2: holistic verdict + optional (non-scored) ideas
ALTER TABLE "EnglishAnalysis"  ADD COLUMN "verdict" TEXT, ADD COLUMN "verdictReason" TEXT, ADD COLUMN "optionalIdeas" JSONB;
ALTER TABLE "StoryAnalysis"    ADD COLUMN "verdict" TEXT, ADD COLUMN "verdictReason" TEXT, ADD COLUMN "optionalIdeas" JSONB;
ALTER TABLE "DirectorAnalysis" ADD COLUMN "verdict" TEXT, ADD COLUMN "verdictReason" TEXT, ADD COLUMN "optionalIdeas" JSONB;
