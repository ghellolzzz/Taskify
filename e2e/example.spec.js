// @ts-check
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});

test.describe('Profile (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/login.html');
    await page.fill('#email', 'MGF_21@ICLOUD.COM');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard\/dashboard\.html$/);
  });

  test('activity shows habits after logging + heatmap range switches', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    await page.click('#habitNewBtn');
    await expect(page.locator('#habitModal')).toBeVisible();

    const habitName = `Activity Habit ${Date.now()}`;
    await page.fill('#habitTitle', habitName);
    await page.selectOption('#habitTargetPerWeek', '2');

    await page.click('#habitModalSubmitBtn, button:has-text("Create habit")');
    await page.waitForLoadState('networkidle');

    const habitRow = page.locator('tr', { hasText: habitName });
    await expect(habitRow).toBeVisible();
    await habitRow.locator('.habit-dot.is-today').click();
    await page.waitForLoadState('networkidle');

    await page.goto('http://localhost:3001/profile/profile.html');
    await page.waitForLoadState('networkidle');

    await page.click('#tab-activity, button:has-text("Activity")');
    await expect(page.locator('#activityRange')).toBeVisible({ timeout: 10000 });

    const heatCells = page.locator('#activityHeatmap .heat-cell');
    await expect(heatCells).toHaveCount(28, { timeout: 10000 });

    const btn7 = page.locator('#activityRange button[data-range="7"]');
    await btn7.scrollIntoViewIfNeeded();
    await btn7.click({ force: true });
    await expect(heatCells).toHaveCount(7);

    const btn90 = page.locator('#activityRange button[data-range="90"]');
    await btn90.scrollIntoViewIfNeeded();
    await btn90.click({ force: true });
    await expect(heatCells).toHaveCount(90);

    const habitsFilterBtn = page.locator('#activityFilters button[data-filter="habits"]');
    await habitsFilterBtn.scrollIntoViewIfNeeded();
    await habitsFilterBtn.click({ force: true });

    const habitItems = page.locator('#recentActivityList li', { hasText: habitName });
    await expect(habitItems).toHaveCount(1, { timeout: 10000 });
  });

  test('user can change profile theme and accent colour', async ({ page }) => {
    await page.goto('http://localhost:3001/profile/profile.html');
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');

    await page.click('#btnThemeDark');
    await expect(body).toHaveClass(/profile-theme-dark/);

    await page.click('#btnThemeLight');
    await expect(body).toHaveClass(/profile-theme-light/);

    const swatch = page.locator('.theme-swatch').first();
    await swatch.scrollIntoViewIfNeeded();
    await swatch.click({ force: true });
    await expect(swatch).toHaveClass(/active/);
  });

  test('theme + accent persist across all pages', async ({ page }) => {
    // 1) Set Dark Theme + change Accent in Profile
    await page.goto('http://localhost:3001/profile/profile.html');
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    await page.click('#btnThemeDark');
    await expect(body).toHaveClass(/profile-theme-dark/);

    // Pick a swatch that is NOT already active (so we actually change accent)
    let swatch = page.locator('.theme-swatch:not(.active)').first();
    if ((await swatch.count()) === 0) swatch = page.locator('.theme-swatch').first();

    await swatch.scrollIntoViewIfNeeded();
    await swatch.click({ force: true });
    await expect(swatch).toHaveClass(/active/);

    // Capture the chosen accent from CSS var (theme.js should set this)
    const chosenAccent = (await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    })) || '';

    expect(chosenAccent, 'Expected --accent CSS variable to be set after selecting swatch').not.toBe('');

    // 2) Visit every page and verify:
    //    - body has profile-theme-dark
    //    - --accent remains the chosenAccent
    const pagesToCheck = [
      { name: 'Dashboard', url: 'http://localhost:3001/dashboard/dashboard.html' },
      { name: 'Tasks', url: 'http://localhost:3001/tasks/task.html' },
      { name: 'Categories', url: 'http://localhost:3001/categories/categories.html' },
      { name: 'Reminders', url: 'http://localhost:3001/reminder/reminder.html' },
      { name: 'Goals', url: 'http://localhost:3001/goal/goal.html' },
      { name: 'Teams', url: 'http://localhost:3001/teams/teams.html' },
      { name: 'Habits', url: 'http://localhost:3001/habit/habits.html' },
      { name: 'Calendar', url: 'http://localhost:3001/calendar/calendar.html' },
      { name: 'Profile', url: 'http://localhost:3001/profile/profile.html' },
      { name: 'Feedback', url: 'http://localhost:3001/feedback/feedback.html' },
    ];

    for (const p of pagesToCheck) {
      await test.step(`Check ${p.name} page theme + accent`, async () => {
        await page.goto(p.url);
        await page.waitForLoadState('networkidle');

        // Theme class should persist
        await expect(page.locator('body')).toHaveClass(/profile-theme-dark/);

        // Accent var should persist
        const accentNow = (await page.evaluate(() => {
          return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        })) || '';

        expect(accentNow, `${p.name}: expected --accent to be set`).not.toBe('');
        expect(accentNow, `${p.name}: expected --accent to persist across pages`).toBe(chosenAccent);
      });
    }
  });
});
