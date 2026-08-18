// ── Session Status ──
export const SESSION_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  TARGET_REACHED: 'target_reached',
  OVERTIME: 'overtime',
  SUBMITTED: 'submitted',
} as const;

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

// ── Difficulty ──
export const DIFFICULTY = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

export type Difficulty = (typeof DIFFICULTY)[keyof typeof DIFFICULTY];

// ── Challenge Type ──
export const CHALLENGE_TYPE = {
  PRESET: 'preset',
  GENERATED: 'generated',
} as const;

export type ChallengeType = (typeof CHALLENGE_TYPE)[keyof typeof CHALLENGE_TYPE];

// ── Time Presets (minutes) ──
export const TIME_PRESETS = [15, 30, 45, 60] as const;

// ── Word Target Presets ──
export const WORD_TARGET_PRESETS = [250, 500, 1000] as const;

// ── User ──
export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  displayName: string | null;
  leaderboardOptIn: boolean;
  avatarUrl?: string | null;
}

export interface XPEvent {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  sourceId: string;
  createdAt: string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementKey: string;
  unlockedAt: string;
}

// ── Challenge ──
export interface Challenge {
  id: string;
  type: ChallengeType;
  prompt: string;
  genre?: string;
  character?: string;
  situation?: string;
  location?: string;
  object?: string;
  constraint?: string;
  timeLimit?: number;
  wordTarget?: number;
  difficulty: Difficulty;
  createdAt: string;
  reasoning?: string;
}

// ── Writing Session ──
export interface WritingSession {
  id: string;
  userId: string;
  challengeId: string;
  title?: string | null;
  targetTime: number;
  wordTarget: number;
  difficulty: Difficulty;
  startedAt: string | null;
  completedAt: string | null;
  activeTime: number;
  overtime: number;
  status: SessionStatus;
  challenge?: Challenge;
  draftContent?: string | null;
  draftRevisionContent?: string | null;
}

// ── Submission ──
export interface Submission {
  id: string;
  sessionId: string;
  content: string;
  wordCount: number;
  characterCount: number;
  activeWritingTime: number | null;
  version: number;
  parentSubmissionId: string | null;
  submittedAt: string;
}

// ── Pause Event ──
export interface PauseEvent {
  id: string;
  sessionId: string;
  pausedAt: string;
  resumedAt: string | null;
}

// ── API Response Wrappers ──
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// ── Auth ──
export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

// ── Session Summary ──
export interface SessionSummary {
  session: WritingSession;
  submission: Submission;
  pauseCount: number;
}
