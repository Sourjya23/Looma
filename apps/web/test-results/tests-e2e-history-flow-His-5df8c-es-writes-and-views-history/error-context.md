# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/e2e/history-flow.spec.ts >> History Flow (Phase 4.5) >> generates, regenerates, writes, and views history
- Location: tests/e2e/history-flow.spec.ts:18:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="text"]')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - link "← Back home" [ref=e4] [cursor=pointer]:
    - /url: /
  - generic [ref=e5]:
    - heading "Welcome back." [level=1] [ref=e6]
    - paragraph [ref=e7]: Log in to continue your writing journey.
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Email
        - textbox [ref=e11]
      - generic [ref=e12]:
        - generic [ref=e13]: Password
        - textbox [ref=e14]
      - button "Log In" [ref=e15] [cursor=pointer]
    - paragraph [ref=e16]:
      - text: Don't have an account?
      - link "Sign up" [ref=e17] [cursor=pointer]:
        - /url: /register
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('History Flow (Phase 4.5)', () => {
  4  |   const username = `testuser_${Date.now()}`;
  5  |   const password = 'password123';
  6  | 
  7  |   test.beforeAll(async ({ request }) => {
  8  |     // Ensure user exists
  9  |     await request.post('http://localhost:8000/api/auth/register', {
  10 |       data: {
  11 |         username,
  12 |         email: `${username}@example.com`,
  13 |         password,
  14 |       }
  15 |     });
  16 |   });
  17 | 
  18 |   test('generates, regenerates, writes, and views history', async ({ page }) => {
  19 |     // 1. Login
  20 |     await page.goto('http://localhost:5173/login');
> 21 |     await page.fill('input[type="text"]', username);
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  22 |     await page.fill('input[type="password"]', password);
  23 |     await page.click('button[type="submit"]');
  24 | 
  25 |     // Wait for Dashboard Layout
  26 |     await expect(page.locator('text=New Writing Session')).toBeVisible();
  27 | 
  28 |     // 2. Generate and verify challenge preview
  29 |     await expect(page.locator('button', { hasText: 'Start Writing' })).toBeVisible();
  30 |     await expect(page.locator('button', { hasText: 'Regenerate' })).toBeVisible();
  31 | 
  32 |     const initialPrompt = await page.locator('h1').innerText();
  33 | 
  34 |     // 3. Regenerate and ensure it changes
  35 |     await page.click('button:has-text("Regenerate")');
  36 |     // Wait a brief moment for the API call to resolve
  37 |     await page.waitForTimeout(1000);
  38 |     const newPrompt = await page.locator('h1').innerText();
  39 |     expect(newPrompt).not.toEqual(initialPrompt);
  40 | 
  41 |     // 4. Start writing
  42 |     await page.click('button:has-text("Start Writing")');
  43 | 
  44 |     // 5. Editor opens
  45 |     await expect(page.locator('.ProseMirror')).toBeVisible();
  46 |     
  47 |     // Write some content
  48 |     await page.locator('.ProseMirror').fill('This is my amazing story about the challenge I was given.');
  49 | 
  50 |     // Wait for word count to update
  51 |     await expect(page.locator('text=11 words')).toBeVisible();
  52 | 
  53 |     // Submit
  54 |     await page.click('button:has-text("Finish & Submit")');
  55 | 
  56 |     // 6. Verify Summary Page and History Sidebar
  57 |     await expect(page.locator('text=Great work!')).toBeVisible();
  58 |     
  59 |     // Sidebar should have the new story
  60 |     const sidebarStory = page.locator('button', { hasText: newPrompt.substring(0, 20) }).first();
  61 |     await expect(sidebarStory).toBeVisible();
  62 | 
  63 |     // 7. Verify tabs are present
  64 |     await expect(page.locator('button:has-text("English Teacher")')).toBeVisible();
  65 |     await expect(page.locator('button:has-text("Story Editor")')).toBeVisible();
  66 |     await expect(page.locator('button:has-text("Director AI")')).toBeVisible();
  67 | 
  68 |     // Note: Actually waiting for the AI feedback to stream might take 10-20 seconds.
  69 |     // For a reliable E2E, we just verify the layout structure and the story text.
  70 |     await expect(page.locator('text=This is my amazing story')).toBeVisible();
  71 |   });
  72 | });
  73 | 
```