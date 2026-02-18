const { test, expect } = require('@playwright/test');
// groups all the tests in the habits lab
test.describe('Habits Lab (E2E)', () => {

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3001/login.html');

    await page.fill('input[type="email"]', 'MGF_21@ICLOUD.COM');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('http://localhost:3001/dashboard/dashboard.html');
  });
  

  test('should create a habit with no specific target (Flexible)', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#habitsTableBody');

    const habitTitle = `E2E Flexible Habit ${Date.now()}`;

    // open modal
    await page.click('#habitNewBtn');
    await page.waitForSelector('#habitModal', { state: 'visible' });

    // fill form (no target => Flexible)
    await page.fill('#habitTitle', habitTitle);
    await page.selectOption('#habitTargetPerWeek', '');
    await page.click('#habitModalSubmitBtn');

    // verify habit row exists
    const habitRow = page.locator('#habitsTableBody tr', { hasText: habitTitle });
    await expect(habitRow).toBeVisible({ timeout: 10000 });

    // verify target badge shows Flexible
    await expect(habitRow.locator('td').nth(1)).toContainText('Flexible');
  });

  test('should create a habit with target per week and show progress text', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#habitsTableBody');

    const habitTitle = `E2E Target Habit ${Date.now()}`;

    // open modal
    await page.click('#habitNewBtn');
    await page.waitForSelector('#habitModal', { state: 'visible' });

    // fill form
    await page.fill('#habitTitle', habitTitle);
    await page.selectOption('#habitTargetPerWeek', '3');
    await page.click('#habitModalSubmitBtn');

    // verify habit row exists
    const habitRow = page.locator('#habitsTableBody tr', { hasText: habitTitle });
    await expect(habitRow).toBeVisible({ timeout: 10000 });

    // verify target label
    await expect(habitRow.locator('td').nth(1)).toContainText('3× / week');

    // verify progress text exists (e.g. 0/3 this week)
    await expect(habitRow.locator('.habit-progress-text')).toContainText('this week');
  });

  test('should toggle today completion and update Today card', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#habitsTableBody');

    const habitTitle = `E2E Toggle Today ${Date.now()}`;

    // create habit first
    await page.click('#habitNewBtn');
    await page.waitForSelector('#habitModal', { state: 'visible' });
    await page.fill('#habitTitle', habitTitle);
    await page.click('#habitModalSubmitBtn');

    const habitRow = page.locator('#habitsTableBody tr', { hasText: habitTitle });
    await expect(habitRow).toBeVisible({ timeout: 10000 });

    // capture today label before
    const beforeLabel = (await page.locator('#todayLabel').textContent()) || '';

    // click today's dot (button has .is-today class)
    const todayDot = habitRow.locator('.habit-dot.is-today').first();
    await expect(todayDot).toBeVisible();
    await todayDot.click();

    // verify dot becomes complete
    await expect(todayDot).toHaveClass(/is-complete/);

    // verify Today card changed
    const afterLabel = (await page.locator('#todayLabel').textContent()) || '';
    expect(afterLabel).not.toEqual(beforeLabel);

    // progress bar should not be 0% anymore (most cases)
    const barStyle = (await page.locator('#todayProgressBar').getAttribute('style')) || '';
    expect(barStyle).toContain('width:');
  });

  test('should toggle again to undo completion', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#habitsTableBody');

    const habitTitle = `E2E Undo Toggle ${Date.now()}`;

    // create habit
    await page.click('#habitNewBtn');
    await page.waitForSelector('#habitModal', { state: 'visible' });
    await page.fill('#habitTitle', habitTitle);
    await page.click('#habitModalSubmitBtn');

    const habitRow = page.locator('#habitsTableBody tr', { hasText: habitTitle });
    await expect(habitRow).toBeVisible({ timeout: 10000 });

    const todayDot = habitRow.locator('.habit-dot.is-today').first();
    await todayDot.click();
    await expect(todayDot).toHaveClass(/is-complete/);

    const beforeUndo = (await page.locator('#todayLabel').textContent()) || '';

    // undo
    await todayDot.click();

    // verify dot no longer complete
    await expect(todayDot).not.toHaveClass(/is-complete/);

    // verify Today label changed again
    const afterUndo = (await page.locator('#todayLabel').textContent()) || '';
    expect(afterUndo).not.toEqual(beforeUndo);
  });

  test('should disable reminder inputs by default and enable when checked', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    await page.click('#habitNewBtn');
    await page.waitForSelector('#habitModal', { state: 'visible' });

    // default disabled
    await expect(page.locator('#habitReminderTime')).toBeDisabled();
    await expect(page.locator('#habitReminderRepeat')).toBeDisabled();

    // enable reminders
    await page.click('#habitReminderEnabled');

    await expect(page.locator('#habitReminderTime')).toBeEnabled();
    await expect(page.locator('#habitReminderRepeat')).toBeEnabled();
  });

  test('should create habit with reminder enabled and show it on Reminder page', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#habitsTableBody');

    const habitTitle = `E2E Reminder Habit ${Date.now()}`;

    // create habit with reminder on
    await page.click('#habitNewBtn');
    await page.waitForSelector('#habitModal', { state: 'visible' });

    await page.fill('#habitTitle', habitTitle);
    await page.click('#habitReminderEnabled');
    await page.fill('#habitReminderTime', '09:00');
    await page.selectOption('#habitReminderRepeat', 'daily');

    await page.click('#habitModalSubmitBtn');

    // verify habit exists
    const habitRow = page.locator('#habitsTableBody tr', { hasText: habitTitle });
    await expect(habitRow).toBeVisible({ timeout: 10000 });

    // go to reminder page and verify the linked reminder exists
    await page.goto('http://localhost:3001/reminder/reminder.html');
    await page.waitForLoadState('networkidle');

    // NOTE: if your reminder UI wording differs, update this locator.
    const reminderItem = page.locator(`text=${habitTitle}`).first();
    await expect(reminderItem).toBeVisible({ timeout: 10000 });
  });

  test('should edit habit title and update it in table', async ({ page }) => {
  await page.goto('http://localhost:3001/habit/habits.html');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#habitsTableBody');

  const habitTitle = `E2E Edit Habit ${Date.now()}`;
  const updatedTitle = `${habitTitle} Updated`;

  // create habit
  await page.click('#habitNewBtn');
  await page.waitForSelector('#habitModal', { state: 'visible' });
  await page.fill('#habitTitle', habitTitle);
  await page.click('#habitModalSubmitBtn');

  const habitRow = page.locator('#habitsTableBody tr', { hasText: habitTitle });
  await expect(habitRow).toBeVisible({ timeout: 10000 });

  // open dropdown for THIS row
await habitRow.scrollIntoViewIfNeeded();
await habitRow.locator('.habit-actions-toggle').click();

// click EDIT inside the OPEN dropdown (only visible menu has .show)
const editBtn = habitRow.locator('.dropdown-menu.show .habit-edit-btn');
await expect(editBtn).toBeVisible({ timeout: 5000 });
await editBtn.click();


  await page.waitForSelector('#habitModal', { state: 'visible' });
  await expect(page.locator('#habitModalTitle')).toContainText('Edit habit');

  // update title
  await page.fill('#habitTitle', updatedTitle);
  await page.click('#habitModalSubmitBtn');

  // verify updated row exists
  const updatedRow = page.locator('#habitsTableBody tr', { hasText: updatedTitle });
  await expect(updatedRow).toBeVisible({ timeout: 10000 });
});


  test('should archive a habit and show it in Archived habits list, then restore it', async ({ page }) => {
  await page.goto('http://localhost:3001/habit/habits.html');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#habitsTableBody');

  const habitTitle = `E2E Archive Habit ${Date.now()}`;

  // create habit
  await page.click('#habitNewBtn');
  await page.waitForSelector('#habitModal', { state: 'visible' });
  await page.fill('#habitTitle', habitTitle);
  await page.click('#habitModalSubmitBtn');

  const habitRow = page.locator('#habitsTableBody tr', { hasText: habitTitle });
  await expect(habitRow).toBeVisible({ timeout: 10000 });

  // open THIS row menu + click archive inside that menu
  await habitRow.scrollIntoViewIfNeeded();
await habitRow.locator('.habit-actions-toggle').click();

const archiveBtn = habitRow.locator('.dropdown-menu.show .habit-archive-btn');
await expect(archiveBtn).toBeVisible({ timeout: 5000 });
await archiveBtn.click();


  // verify removed from active table
  await expect(page.locator('#habitsTableBody .habit-title', { hasText: habitTitle })).toHaveCount(0);

  // verify appears in archived list
  const archivedItem = page.locator('#archivedHabitsList .archived-habit-item', { hasText: habitTitle });
  await expect(archivedItem).toBeVisible({ timeout: 10000 });

  // restore
  await archivedItem.locator('.archived-unarchive-btn').click();

  // verify back in active table
  const restoredRow = page.locator('#habitsTableBody tr', { hasText: habitTitle });
  await expect(restoredRow).toBeVisible({ timeout: 10000 });
});


  test('should permanently delete a habit using delete modal', async ({ page }) => {
  await page.goto('http://localhost:3001/habit/habits.html');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#habitsTableBody');

  const habitTitle = `E2E Hard Delete ${Date.now()}`;

  // create habit
  await page.click('#habitNewBtn');
  await page.waitForSelector('#habitModal', { state: 'visible' });
  await page.fill('#habitTitle', habitTitle);
  await page.click('#habitModalSubmitBtn');

  const habitRow = page.locator('#habitsTableBody tr', { hasText: habitTitle });
  await expect(habitRow).toBeVisible({ timeout: 10000 });

  // open THIS row menu + click delete inside that menu
  await habitRow.scrollIntoViewIfNeeded();
await habitRow.locator('.habit-actions-toggle').click();

const deleteBtn = habitRow.locator('.dropdown-menu.show .habit-delete-btn');
await expect(deleteBtn).toBeVisible({ timeout: 5000 });
await deleteBtn.click();


  // confirm modal opens
  await page.waitForSelector('#habitDeleteModal', { state: 'visible' });
  await page.click('#habitDeleteConfirmBtn');

  // removed immediately (optimistic)
  await expect(page.locator('#habitsTableBody .habit-title', { hasText: habitTitle })).toHaveCount(0);

  // wait for server hard delete (10s in your JS), then reload to confirm still gone
  await page.waitForTimeout(10500);
  await page.reload();
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#habitsTableBody .habit-title', { hasText: habitTitle })).toHaveCount(0);
  await expect(page.locator('#archivedHabitsList', { hasText: habitTitle })).toHaveCount(0);
});


  test('should sort by Needs attention (atrisk) and bring higher-risk habit to the top', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#habitsTableBody');

    const riskTitle = `E2E Risk Habit ${Date.now()}`;
    const safeTitle = `E2E Safe Habit ${Date.now()}`;

    // create "risk" habit: daily target (7) and do nothing
    await page.click('#habitNewBtn');
    await page.waitForSelector('#habitModal', { state: 'visible' });
    await page.fill('#habitTitle', riskTitle);
    await page.selectOption('#habitTargetPerWeek', '7');
    await page.click('#habitModalSubmitBtn');

    // create "safe" habit: target 1 and complete today
    await page.click('#habitNewBtn');
    await page.waitForSelector('#habitModal', { state: 'visible' });
    await page.fill('#habitTitle', safeTitle);
    await page.selectOption('#habitTargetPerWeek', '1');
    await page.click('#habitModalSubmitBtn');

    const safeRow = page.locator('#habitsTableBody tr', { hasText: safeTitle });
    await expect(safeRow).toBeVisible({ timeout: 10000 });
    await safeRow.locator('.habit-dot.is-today').first().click();

    // sort: Needs attention
    await page.selectOption('#habitsSortSelect', 'atrisk');
    await page.waitForTimeout(400);

    // sort: Needs attention
await page.selectOption('#habitsSortSelect', 'atrisk');

// wait until DOM reorders so that risk appears above safe
await page.waitForFunction(
  ({ riskTitle, safeTitle }) => {
    const titles = Array.from(document.querySelectorAll('#habitsTableBody .habit-title'))
      .map(el => el.textContent || '');

    const riskIndex = titles.findIndex(t => t.includes(riskTitle));
    const safeIndex = titles.findIndex(t => t.includes(safeTitle));

    return riskIndex !== -1 && safeIndex !== -1 && riskIndex < safeIndex;
  },
  { riskTitle, safeTitle }
);

// extra check (optional but nice)
const titles = await page.locator('#habitsTableBody .habit-title').allTextContents();
const riskIndex = titles.findIndex(t => t.includes(riskTitle));
const safeIndex = titles.findIndex(t => t.includes(safeTitle));
expect(riskIndex).toBeGreaterThanOrEqual(0);
expect(safeIndex).toBeGreaterThanOrEqual(0);
expect(riskIndex).toBeLessThan(safeIndex);

  });

  test('should update Patterns card after completing at least one habit', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#habitsTableBody');

    const habitTitle = `E2E Patterns ${Date.now()}`;

    // create habit
    await page.click('#habitNewBtn');
    await page.waitForSelector('#habitModal', { state: 'visible' });
    await page.fill('#habitTitle', habitTitle);
    await page.click('#habitModalSubmitBtn');

    const habitRow = page.locator('#habitsTableBody tr', { hasText: habitTitle });
    await expect(habitRow).toBeVisible({ timeout: 10000 });

    // before
    const beforeBestDay = (await page.locator('#patternsBestDay').textContent()) || '—';

    // complete today
    await habitRow.locator('.habit-dot.is-today').first().click();
    await page.waitForTimeout(400);

    // after: best day should no longer be "—" (or should change)
    const afterBestDay = (await page.locator('#patternsBestDay').textContent()) || '';
    expect(afterBestDay).not.toEqual(beforeBestDay);
    expect(afterBestDay).not.toEqual('—');
  });

  test('NEGATIVE: should not create a habit when title is empty', async ({ page }) => {
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#habitsTableBody');

    const beforeCount = await page.locator('#habitsTableBody .habit-title').count();

    // open modal and try submit with empty title
    await page.click('#habitNewBtn');
    await page.waitForSelector('#habitModal', { state: 'visible' });

    await page.fill('#habitTitle', '');
    await page.click('#habitModalSubmitBtn');

    // modal should still be visible due to required validation
    await expect(page.locator('#habitModal')).toBeVisible();

    // ensure no new habit row created
    await page.waitForTimeout(300);
    const afterCount = await page.locator('#habitsTableBody .habit-title').count();
    expect(afterCount).toEqual(beforeCount);
  });

  test('NEGATIVE: should redirect to login when token is missing', async ({ page }) => {
    // remove token after login
    await page.evaluate(() => localStorage.removeItem('token'));

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/login\.html$/);
  });

});
