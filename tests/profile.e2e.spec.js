const { test, expect } = require('@playwright/test');

test.describe('Profile (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/login.html');
    await page.fill('#email', 'MGF_21@ICLOUD.COM');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3001/dashboard/dashboard.html');
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
});
