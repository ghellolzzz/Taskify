const { test, expect } = require('@playwright/test');
test.describe('Habits Lab (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/login.html');

    await page.fill('#email', 'MGF_21@ICLOUD.COM');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('http://localhost:3001/dashboard/dashboard.html');
  });

  test('should create habit, toggle today dot, and update Today summary', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Habits Lab' })).toBeVisible();

    const todayLabel = page.locator('#todayLabel');
    const beforeText = (await todayLabel.textContent()) || '';

    await page.click('#habitNewBtn');
    await expect(page.locator('#habitModal')).toBeVisible();

    const habitName = `E2E Habit ${Date.now()}`;
    await page.fill('#habitTitle', habitName);
    await page.selectOption('#habitTargetPerWeek', '3');

    await page.click('#habitForm button[type="submit"]');
    await page.waitForLoadState('networkidle');

    const habitRow = page.locator('#habitsTableBody tr', { hasText: habitName });
    await expect(habitRow).toBeVisible({ timeout: 10000 });

    const todayDot = habitRow.locator('.habit-dot.is-today');
    await expect(todayDot).toBeVisible();
    await todayDot.click();
    await page.waitForLoadState('networkidle');

    const updatedRow = page.locator('#habitsTableBody tr', { hasText: habitName });
    await expect(updatedRow.locator('.habit-dot.is-today')).toHaveClass(/is-complete/);

    await expect(todayLabel).not.toHaveText(beforeText, { timeout: 5000 });
  });

  test('should enable reminder inputs + create habit reminder, then show in Reminder page', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    await page.click('#habitNewBtn');
    await expect(page.locator('#habitModal')).toBeVisible();

    const habitName = `Reminder Habit ${Date.now()}`;
    await page.fill('#habitTitle', habitName);

    const timeInput = page.locator('#habitReminderTime');
    const repeatSelect = page.locator('#habitReminderRepeat');
    await expect(timeInput).toBeDisabled();
    await expect(repeatSelect).toBeDisabled();

    await page.check('#habitReminderEnabled');
    await expect(timeInput).toBeEnabled();
    await expect(repeatSelect).toBeEnabled();

    await page.fill('#habitReminderTime', '09:00');
    await page.selectOption('#habitReminderRepeat', 'daily');

    await page.click('#habitForm button[type="submit"]');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#habitsTableBody tr', { hasText: habitName })).toBeVisible({ timeout: 10000 });

    await page.goto('http://localhost:3001/reminder/reminder.html');
    await page.waitForLoadState('networkidle');

    const reminderRow = page.locator('#reminderTable tbody tr', { hasText: `Habit: ${habitName}` });
    await expect(reminderRow).toBeVisible({ timeout: 10000 });
    await expect(reminderRow).toContainText(habitName);
  });

  test('should edit habit (title + reminder off) and ensure habit reminder disappears from Reminder page', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    await page.click('#habitNewBtn');
    await expect(page.locator('#habitModal')).toBeVisible();

    const habitName = `Edit Habit ${Date.now()}`;
    await page.fill('#habitTitle', habitName);

    await page.check('#habitReminderEnabled');
    await page.fill('#habitReminderTime', '09:00');
    await page.selectOption('#habitReminderRepeat', 'daily');

    await page.click('#habitForm button[type="submit"]');
    await page.waitForLoadState('networkidle');

    const row = page.locator('#habitsTableBody tr', { hasText: habitName });
    await expect(row).toBeVisible({ timeout: 10000 });

    const toggle = row.locator('.habit-actions-toggle');
    await expect(toggle).toBeVisible({ timeout: 5000 });
    await toggle.click();
    await page.waitForTimeout(150);

    const rowEditBtn = row.locator('.habit-edit-btn');
    if (await rowEditBtn.count()) {
      await expect(rowEditBtn.first()).toBeVisible({ timeout: 5000 });
      await rowEditBtn.first().click();
    } else {
      const visibleMenu = page.locator('.dropdown-menu:visible');
      await expect(visibleMenu.first()).toBeVisible({ timeout: 5000 });
      await visibleMenu.first().locator('.habit-edit-btn').click();
    }

    await expect(page.locator('#habitModal')).toBeVisible({ timeout: 10000 });

    const updatedTitle = `${habitName} Updated`;
    await page.fill('#habitTitle', updatedTitle);

    await page.uncheck('#habitReminderEnabled');

    await page.click('#habitForm button[type="submit"]');
    await page.waitForLoadState('networkidle');

    const updatedRow = page.locator('#habitsTableBody tr', { hasText: updatedTitle });
    await expect(updatedRow).toBeVisible({ timeout: 10000 });

    await page.goto('http://localhost:3001/reminder/reminder.html');
    await page.waitForLoadState('networkidle');

    const reminderRow = page.locator('#reminderTable tbody tr', { hasText: `Habit: ${updatedTitle}` });
    await expect(reminderRow).toHaveCount(0);
  });

  test('should archive habit and restore it from Archived habits card', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    await page.click('#habitNewBtn');
    await expect(page.locator('#habitModal')).toBeVisible();

    const habitName = `Archive Habit ${Date.now()}`;
    await page.fill('#habitTitle', habitName);
    await page.click('#habitForm button[type="submit"]');
    await page.waitForLoadState('networkidle');

    const row = page.locator('#habitsTableBody tr', { hasText: habitName });
    await expect(row).toBeVisible({ timeout: 10000 });

    await row.locator('.habit-actions-toggle').click();
    await page.waitForTimeout(150);
    await row.locator('.habit-archive-btn').click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#habitsTableBody tr', { hasText: habitName })).toHaveCount(0);

    const archivedItem = page.locator('#archivedHabitsList .archived-habit-item', { hasText: habitName });
    await expect(archivedItem).toBeVisible({ timeout: 10000 });

    await archivedItem.locator('.archived-unarchive-btn').click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#habitsTableBody tr', { hasText: habitName })).toBeVisible({ timeout: 10000 });
  });

  test('should hard delete habit via delete modal', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    await page.click('#habitNewBtn');
    await expect(page.locator('#habitModal')).toBeVisible();

    const habitName = `Delete Habit ${Date.now()}`;
    await page.fill('#habitTitle', habitName);
    await page.click('#habitForm button[type="submit"]');
    await page.waitForLoadState('networkidle');

    const row = page.locator('#habitsTableBody tr', { hasText: habitName });
    await expect(row).toBeVisible({ timeout: 10000 });

    await row.locator('.habit-actions-toggle').click();
    await page.waitForTimeout(150);
    await row.locator('.habit-delete-btn').click();

    await expect(page.locator('#habitDeleteModal')).toBeVisible({ timeout: 10000 });
    await page.click('#habitDeleteConfirmBtn');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#habitsTableBody tr', { hasText: habitName })).toHaveCount(0);
  });

  test('NEGATIVE: should not create habit when title is empty', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    await page.click('#habitNewBtn');
    await expect(page.locator('#habitModal')).toBeVisible();

    await page.fill('#habitTitle', '');
    await page.selectOption('#habitTargetPerWeek', '3');

    const beforeCount = await page.locator('#habitsTableBody tr').count();

    await page.click('#habitForm button[type="submit"]');
    await page.waitForTimeout(300);

    const modalStillOpen = await page.locator('#habitModal').isVisible();

    const afterCount = await page.locator('#habitsTableBody tr').count();

    expect(modalStillOpen || afterCount === beforeCount).toBeTruthy();

    if (modalStillOpen) {
      const closeBtn = page.locator('#habitModal .btn-close, #habitModal [data-bs-dismiss="modal"]');
      if (await closeBtn.count()) await closeBtn.first().click();
    }
  });

  test('NEGATIVE: should not create habit reminder when reminder enabled but time is missing', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    await page.click('#habitNewBtn');
    await expect(page.locator('#habitModal')).toBeVisible();

    const habitName = `NoTime Reminder ${Date.now()}`;
    await page.fill('#habitTitle', habitName);

    await page.check('#habitReminderEnabled');

    const repeatSelect = page.locator('#habitReminderRepeat');
    if (await repeatSelect.isEnabled()) {
      await page.selectOption('#habitReminderRepeat', 'daily');
    }

    await page.click('#habitForm button[type="submit"]');
    await page.waitForLoadState('networkidle');

    await page.goto('http://localhost:3001/reminder/reminder.html');
    await page.waitForLoadState('networkidle');

    const reminderRow = page.locator('#reminderTable tbody tr', { hasText: `Habit: ${habitName}` });
    await expect(reminderRow).toHaveCount(0);
  });
-
  test('NEGATIVE: should redirect to login when accessing habits page without auth', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/login\.html/i);

    await context.close();
  });
});
