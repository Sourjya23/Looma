import { test, expect } from '@playwright/test';

test.describe('Phase 2 AI Feedback UI', () => {
  const uniqueId = Date.now();
  const testEmail = `ai_user_${uniqueId}@example.com`;
  const testUsername = `ai_user_${uniqueId}`;

  test('Shows AI feedback correctly', async ({ page }) => {
    // 1. Register
    await page.goto('http://localhost:5173/register');
    await page.fill('input[type="text"]', testUsername);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*\/dashboard/);

    // 2. Start Writing
    await page.click('button:has-text("15 min")');
    await page.click('button:has-text("250")');
    await page.click('button:has-text("beginner")');
    await page.click('button:has-text("Start Writing")');

    await expect(page).toHaveURL(/.*\/writing\/.*/);
    await expect(page.locator('text=Loading editor...')).not.toBeVisible();
    
    // Type story
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('He see something.');
    
    await page.waitForTimeout(2500); // Autosave
    
    // 3. Submit
    await page.click('button:has-text("Finish")');
    await expect(page).toHaveURL(/.*\/summary\/.*/);
    
    // 4. Intercept the AI endpoint to return a mock response
    await page.route('**/api/submissions/*/analyze', async route => {
      const mockResponse = {
        id: 'mock-id-123',
        submissionId: 'sub-123',
        score: 85,
        strengths: ['Short and to the point.'],
        mistakes: [
          {
            originalText: 'He see something.',
            category: 'grammar',
            subCategory: 'tense',
            correction: 'He saw something.',
            explanation: 'Past tense.'
          }
        ],
        repetition: [],
        vocabularyImprovements: [],
        learningPoints: ['Tenses']
      };
      await route.fulfill({ json: mockResponse });
    });

    // 5. Click Analyze
    await page.click('button:has-text("Analyze My Writing")');

    // 6. Verify UI State
    await expect(page.locator('text=85')).toBeVisible();
    await expect(page.locator('text=What You Did Well')).toBeVisible();
    await expect(page.locator('text=Short and to the point.')).toBeVisible();
    
    await expect(page.locator('text=Mistakes to Fix')).toBeVisible();
    await expect(page.locator('text=He saw something.')).toBeVisible();
  });
});
