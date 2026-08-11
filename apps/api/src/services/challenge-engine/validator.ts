import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export function generateFingerprint(components: {
  genre: string;
  character: string;
  setting: string;
  situation: string;
  object: string;
  constraint: string;
}): string {
  const raw = `${components.genre}|${components.character}|${components.setting}|${components.situation}|${components.object}|${components.constraint}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function isChallengeFresh(userId: string, fingerprint: string): Promise<boolean> {
  const existing = await prisma.challenge.findFirst({
    where: {
      userId,
      fingerprint,
    }
  });
  
  return !existing;
}
