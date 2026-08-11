export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

// Simple random picker
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Pick multiple unique items
export function pickMultiple<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
