import { test, expect } from '@playwright/test';

test.describe('History Flow (Phase 4.5)', () => {
  const username = `testuser_${Date.now()}`;
  const password = 'password123';

  test.beforeAll(async ({ request }) => {
    // Ensure user exists
    await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username,
        email: `${username}@example.com`,
        password,
      }
    });
  });

  test('generates, regenerates, writes, and views history', async ({ page }) => {
    // 1. Login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="text"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for Dashboard Layout
    await expect(page.locator('text=New Writing Session')).toBeVisible();

    // 2. Generate and verify challenge preview
    await expect(page.locator('button', { hasText: 'Start Writing' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Regenerate' })).toBeVisible();

    const initialPrompt = await page.locator('h1').innerText();

    // 3. Regenerate and ensure it changes
    await page.click('button:has-text("Regenerate")');
    // Wait a brief moment for the API call to resolve
    await page.waitForTimeout(1000);
    const newPrompt = await page.locator('h1').innerText();
    expect(newPrompt).not.toEqual(initialPrompt);

    // 4. Start writing
    await page.click('button:has-text("Start Writing")');

    // 5. Editor opens
    await expect(page.locator('.ProseMirror')).toBeVisible();
    
    // Write some content
    await page.locator('.ProseMirror').fill('This is my amazing story about the challenge I was given.');

    // Wait for word count to update
    await expect(page.locator('text=11 words')).toBeVisible();

    // Submit
    await page.click('button:has-text("Finish & Submit")');

    // 6. Verify Summary Page and History Sidebar
    await expect(page.locator('text=Great work!')).toBeVisible();
    
    // Sidebar should have the new story
    const sidebarStory = page.locator('button', { hasText: newPrompt.substring(0, 20) }).first();
    await expect(sidebarStory).toBeVisible();

    // 7. Verify tabs are present
    await expect(page.locator('button:has-text("English Teacher")')).toBeVisible();
    await expect(page.locator('button:has-text("Story Editor")')).toBeVisible();
    await expect(page.locator('button:has-text("Director AI")')).toBeVisible();

    // Note: Actually waiting for the AI feedback to stream might take 10-20 seconds.
    // For a reliable E2E, we just verify the layout structure and the story text.
    await expect(page.locator('text=This is my amazing story')).toBeVisible();
  });
});
