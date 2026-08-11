import { test, expect } from '@playwright/test';

test.describe('Phase 1 E2E Flow', () => {
  const uniqueId = Date.now();
  const testEmail = `test_${uniqueId}@example.com`;
  const testUsername = `user_${uniqueId}`;
  
  test('Complete journey from registration to summary', async ({ page }) => {
    // 1. Register
    await page.goto('http://localhost:5173/register');
    await page.fill('input[type="text"]', testUsername); // Adjust selector based on actual input
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);

    // 2. Configure Session
    await page.click('button:has-text("15 min")');
    await page.click('button:has-text("250")');
    await page.click('button:has-text("beginner")');
    
    // Start Writing
    await page.click('button:has-text("Start Writing")');

    // 3. Editor
    await expect(page).toHaveURL(/.*\/writing\/.*/);
    
    // Wait for editor to be ready (loading state goes away)
    await expect(page.locator('text=Loading editor...')).not.toBeVisible();

    // Type story
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('This is a test story for the end-to-end playwright testing suite.');
    
    // Wait a couple seconds for autosave debounce (2s) + buffer
    await page.waitForTimeout(2500);
    
    // 4. Pause / Resume
    await page.click('button:has-text("Pause")');
    await expect(editor).toHaveAttribute('contenteditable', 'false');
    
    await page.click('button:has-text("Resume")');
    await expect(editor).toHaveAttribute('contenteditable', 'true');
    
    // 5. Submit
    await page.click('button:has-text("Finish")');
    
    // 6. Summary Verification
    await expect(page).toHaveURL(/.*\/summary\/.*/);
    await expect(page.locator('text=Session Complete')).toBeVisible();
    await expect(page.locator('text=Great work!')).toBeVisible();
    await expect(page.locator('text=Words Written')).toBeVisible();
    
    // Check word count is correct (11 words in our sentence)
    // "This is a test story for the end-to-end playwright testing suite." = 11 words
    await expect(page.locator('.stat-number').first()).toHaveText('11');
  });
});
