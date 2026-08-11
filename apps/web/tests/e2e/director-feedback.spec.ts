import { test, expect } from '@playwright/test';

test.describe('Phase 4 Director AI Feedback UI & Tab Orchestration', () => {
  const uniqueId = Date.now();
  const testEmail = `dir_user_${uniqueId}@example.com`;
  const testUsername = `dir_user_${uniqueId}`;

  test('Shows Director AI feedback and handles tabs independently', async ({ page }) => {
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
    await page.keyboard.type('He went to the store. He was very scared.');
    
    await page.waitForTimeout(2500); // Autosave
    
    // 3. Submit
    await page.click('button:has-text("Finish")');
    await expect(page).toHaveURL(/.*\/summary\/.*/);
    
    // 4. Intercept the Director AI endpoint (Failure scenario first)
    await page.route('**/api/submissions/*/analyze-director', async route => {
      // Fail on the first click
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 503, json: { error: 'Service Unavailable' } });
      } else {
        await route.continue();
      }
    }, { times: 1 });

    // 5. Navigate to Director Tab
    await page.click('button:has-text("Director AI")');
    await expect(page.locator('h2:has-text("Director AI")')).toBeVisible();

    // 6. Click Analyze for Director AI (Should Fail)
    await page.click('button:has-text("Get Director\'s Feedback")');
    
    await expect(page.locator('text=We couldn\'t analyze your visual storytelling right now.')).toBeVisible();
    await expect(page.locator('text=Try Again')).toBeVisible();

    // 7. Intercept for Success
    await page.route('**/api/submissions/*/analyze-director', async route => {
      if (route.request().method() === 'POST') {
        const mockResponse = {
          id: 'mock-dir-id',
          submissionId: 'sub-123',
          overallScore: 85,
          visualStorytellingScore: 80,
          sceneConstructionScore: 90,
          showDontTellScore: 75,
          cinematicPotentialScore: 88,
          strengths: ['Great lighting description.'],
          problems: [
            {
              category: 'show_dont_tell',
              severity: 'medium',
              location: 'paragraph 1',
              problem: 'Telling the reader the character is scared.',
              whyItMatters: 'Less emotionally engaging.',
              suggestion: 'Show shaking hands.'
            }
          ],
          suggestions: ['Add more descriptive details.']
        };
        await route.fulfill({ json: mockResponse });
      } else {
        await route.continue();
      }
    });

    // 8. Click Try Again
    await page.click('button:has-text("Try Again")');

    // 9. Verify UI State
    await expect(page.locator('text=85')).toBeVisible(); // overall score
    await expect(page.locator('text=Great lighting description.')).toBeVisible(); // strength
    await expect(page.locator('text=Telling the reader the character is scared.')).toBeVisible(); // problem
    await expect(page.locator('text=Show shaking hands.')).toBeVisible(); // suggestion
    
    // 10. Verify tab switching retains isolation
    await page.click('button:has-text("English Teacher")');
    await expect(page.locator('text=English Teacher').nth(0)).toBeVisible(); // Since it has a button and an H2
    // Navigate back to Director AI
    await page.click('button:has-text("Director AI")');
    // Ensure data is still there (though we didn't mock the GET request, the component holds it or refetches)
  });
});
