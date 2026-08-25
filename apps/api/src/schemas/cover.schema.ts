import { z } from 'zod';

export const CoverDesignSchema = z.object({
  book: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    author: z.string(),
    tagline: z.string().optional(),
    genre: z.string(),
    subgenre: z.string().optional(),
  }),
  concept: z.object({
    dominant_visual_concept: z.string().describe("A single, powerful visual metaphor. E.g., 'A lone explorer choosing a cold blue lantern inside an ancient mountain cave'"),
    theme: z.string(),
    emotional_tone: z.string(),
  }),
  subjects: z.object({
    primary: z.string().describe("The main subject (e.g., 'young female explorer')"),
    secondary: z.string().optional(),
    symbolic_object: z.string().optional().describe("A key object carrying narrative weight"),
  }),
  environment: z.object({
    setting: z.string(),
    foreground: z.string().optional(),
    midground: z.string().optional(),
    background: z.string().optional(),
  }),
  composition: z.object({
    orientation: z.enum(['portrait', 'landscape', 'square']).default('portrait'),
    focal_point: z.string(),
    primary_subject_position: z.string(),
    negative_space: z.string().describe("E.g., 'upper third for title'"),
    perspective: z.string().describe("Camera angle, e.g., 'cinematic three-quarter perspective'"),
  }),
  lighting: z.object({
    primary: z.string(),
    secondary: z.string().optional(),
    contrast: z.string(),
    atmosphere: z.string().optional(),
  }),
  style: z.object({
    art_direction: z.string().describe("E.g., 'premium cinematic literary fantasy'"),
    realism: z.string(),
    detail: z.string(),
  }),
  palette: z.object({
    dominant: z.array(z.string()),
    accent: z.array(z.string()),
    avoid: z.array(z.string()),
  }),
  typography: z.object({
    title: z.object({
      text: z.string(),
      position: z.string(),
      style: z.string(),
    }),
    author: z.object({
      text: z.string(),
      position: z.string(),
      style: z.string(),
    }).optional(),
    tagline: z.object({
      text: z.string(),
      position: z.string(),
      style: z.string(),
    }).optional(),
  }),
  negative_prompt_additions: z.array(z.string()).describe("Any story-specific negative constraints to add to the base negative prompt."),
});

export type CoverDesignType = z.infer<typeof CoverDesignSchema>;
