

const { test, expect } = require('@playwright/test');

test.describe('Habits & Profile (E2E – Abinesh)', () => {
  // Re-use the same seeded user as the team tests
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/login.html');
    await page.fill('#email', 'MGF_21@ICLOUD.COM');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3001/dashboard/dashboard.html');
  });

  test('should create a habit and update today / weekly stats in Habits Lab', async ({ page }) => {
    // Go to Habits Lab
    await page.goto('http://localhost:3001/habit/habits.html'); // 🔁 change path if needed
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Habits Lab')).toBeVisible();

    // Remember current "Today" label before we do anything
    const todayLabel = page.locator('#todayLabel');
    const beforeText = await todayLabel.textContent();

    // Open "New habit" modal
    await page.click('#habitNewBtn');
    await expect(page.locator('#habitModal')).toBeVisible();

    const habitName = `E2E Habit ${Date.now()}`;
    await page.fill('#habitTitle', habitName);
    await page.selectOption('#habitTargetPerWeek', '3');

    // colour is pre-selected by default via JS, so we can leave it

    await page.click('#habitModalSubmitBtn, button:has-text("Create habit")'); // supports both labels
    await page.waitForLoadState('networkidle');

    // New habit row should appear
    const habitRow = page.locator('tr', { hasText: habitName });
    await expect(habitRow).toBeVisible();

    // Tick today's dot for that habit
    const todayDot = habitRow.locator('.habit-dot.is-today');
    await expect(todayDot).toBeVisible();
    await todayDot.click();

    // Board re-renders; re-locate row + dot and expect it to be complete
    const updatedRow = page.locator('tr', { hasText: habitName });
    const updatedTodayDot = updatedRow.locator('.habit-dot.is-today');
    await expect(updatedTodayDot).toHaveClass(/is-complete/);

    // Sidebar "Today" label should change (e.g. 0/1 -> 1/1)
    await expect(todayLabel).not.toHaveText(beforeText || '', { timeout: 5000 });
  });

  test('habit logs should appear in Profile Activity with filters & heatmap range', async ({ page }) => {
    // --- 1) Create + log a habit so Activity has data ---
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

    // --- 2) Go to Profile page to read Activity data ---
    await page.goto('http://localhost:3001/profile/profile.html'); 
    await page.waitForLoadState('networkidle');

   // Ensure Activity tab is open
await page.click('#tab-activity, button:has-text("Activity")');
await expect(page.locator('#activityRange')).toBeVisible({ timeout: 10000 });

// Heatmap default = 28 days
const heatmap = page.locator('#activityHeatmap .heat-cell');
await expect(heatmap).toHaveCount(28);

// Switch to 7 days
const btn7 = page.locator('#activityRange button[data-range="7"]');
await btn7.scrollIntoViewIfNeeded();
await btn7.click();
await expect(heatmap).toHaveCount(7);

// Switch to 90 days
const btn90 = page.locator('#activityRange button[data-range="90"]');
await btn90.scrollIntoViewIfNeeded();
await btn90.click();
await expect(heatmap).toHaveCount(90);

    // --- 3) Filter recent activity to only habits ---
    const habitsFilterBtn = page.locator('#activityFilters button[data-filter="habits"]');
    await habitsFilterBtn.click();

    const recentList = page.locator('#recentActivityList');
    // Either we see at least one "Logged habit" item, or the "no activity" empty state.
    const loggedHabitItem = recentList.locator('li', { hasText: 'Logged habit' });
    const emptyStateItem = recentList.locator('li', { hasText: 'No activity for this filter yet.' });

    await expect(page.locator('#recentActivityList')).toBeVisible();
await expect(page.locator('#recentActivityList li', { hasText: habitName }))
  .toBeVisible({ timeout: 10000 });
  });

  test('user can change profile theme and accent colour', async ({ page }) => {
    await page.goto('http://localhost:3001/profile/profile.html'); // 🔁 change if needed
    await page.waitForLoadState('networkidle');

    // Toggle dark mode
    const body = page.locator('body');
    await page.click('#btnThemeDark');
    await expect(body).toHaveClass(/profile-theme-dark/);

    // Toggle back to light mode
    await page.click('#btnThemeLight');
    await expect(body).toHaveClass(/profile-theme-light/);

    // Click an accent swatch and check it becomes active
    const swatch = page.locator('.theme-swatch').first();
    await swatch.click();
    await expect(swatch).toHaveClass(/active/);
  });
});
