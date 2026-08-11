import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Create a test user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      username: 'testuser',
      password: hashedPassword,
    },
  });

  console.log(`Created test user: ${testUser.username}`);

  // 2. Clear old challenges
  await prisma.challenge.deleteMany();

  // 3. Insert preset challenges
  const challenges = [
    {
      type: 'preset',
      prompt: 'Write a story about a character who discovers they can rewind time, but only by 5 seconds.',
      genre: 'Sci-Fi / Fantasy',
      difficulty: 'beginner',
      timeLimit: 15 * 60, // 15 mins
      wordTarget: 300,
    },
    {
      type: 'preset',
      prompt: 'Two people who hate each other are stuck in a broken elevator for an hour.',
      genre: 'Drama',
      difficulty: 'intermediate',
      timeLimit: 30 * 60,
      wordTarget: 600,
    },
    {
      type: 'preset',
      prompt: 'A detective is investigating a murder where all the evidence points to themselves, but they have no memory of the event.',
      genre: 'Mystery / Thriller',
      difficulty: 'advanced',
      timeLimit: 45 * 60,
      wordTarget: 1000,
    },
  ];

  for (const challenge of challenges) {
    await prisma.challenge.create({
      data: challenge,
    });
  }

  console.log(`Created ${challenges.length} preset challenges.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
