

const { test, expect } = require('@playwright/test');

test.describe('Habits Lab (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/login.html');
    await page.fill('#email', 'MGF_21@ICLOUD.COM');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3001/dashboard/dashboard.html');
  });

  test('should create a habit and update today / weekly stats in Habits Lab', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Habits Lab')).toBeVisible();

    const todayLabel = page.locator('#todayLabel');
    const beforeText = await todayLabel.textContent();

    await page.click('#habitNewBtn');
    await expect(page.locator('#habitModal')).toBeVisible();

    const habitName = `E2E Habit ${Date.now()}`;
    await page.fill('#habitTitle', habitName);
    await page.selectOption('#habitTargetPerWeek', '3');

    await page.click('#habitModalSubmitBtn, button:has-text("Create habit")');
    await page.waitForLoadState('networkidle');

    const habitRow = page.locator('tr', { hasText: habitName });
    await expect(habitRow).toBeVisible();

    const todayDot = habitRow.locator('.habit-dot.is-today');
    await expect(todayDot).toBeVisible();
    await todayDot.click();

    const updatedRow = page.locator('tr', { hasText: habitName });
    const updatedTodayDot = updatedRow.locator('.habit-dot.is-today');
    await expect(updatedTodayDot).toHaveClass(/is-complete/);

    await expect(todayLabel).not.toHaveText(beforeText || '', { timeout: 5000 });
  });

  test('should create a habit and log today (used for Profile activity later)', async ({ page }) => {
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

    // basic assertion: dot becomes complete
    await expect(habitRow.locator('.habit-dot.is-today')).toHaveClass(/is-complete/);
  });
});