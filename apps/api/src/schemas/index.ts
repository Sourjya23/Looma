import { z } from 'zod';

export const createSessionSchema = z.object({
  body: z.object({
    challengeId: z.string().optional(),
    challengePayload: z.any().optional(),
    targetTime: z.number().int().positive(),
    wordTarget: z.number().int().positive(),
    difficulty: z.enum(['beginner', 'easy', 'intermediate', 'advanced', 'hard']),
  }).refine(data => data.challengeId || data.challengePayload, {
    message: "Either challengeId or challengePayload is required",
    path: ["challengeId"]
  })
});

export const submitSessionSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Content is required'),
    wordCount: z.number().int().min(0),
    characterCount: z.number().int().min(0),
    timeSpent: z.number().int().min(0),
    title: z.string().optional()
  }),
  params: z.object({
    id: z.string()
  })
});

export const autosaveSessionSchema = z.object({
  body: z.object({
    content: z.string(),
    wordCount: z.number().int().min(0),
    characterCount: z.number().int().min(0),
    timeSpent: z.number().int().min(0),
    title: z.string().optional()
  }),
  params: z.object({
    id: z.string()
  })
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    username: z.string().min(3),
    password: z.string().min(6)
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string()
  })
});
