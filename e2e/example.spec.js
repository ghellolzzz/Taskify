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

  // Expects page to have a heading with the name of Installation.a
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});

//happens in every test
test.describe('Habits Lab UI (E2E)', () => {

  // run in serial so state changes don’t clash across tests
  test.describe.configure({ mode: 'serial' });

  const USER_EMAIL = 'joel@example.com';
  const PASSWORD = 'password123';

  // Login via UI before every test
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/login.html');
    await page.fill('#email', USER_EMAIL);
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3001/dashboard/dashboard.html');
  });

  test('should load Habits page and show core UI sections (Smoke Test)', async ({ page }) => {

    //navigating to habits hub
    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    //checks if the header is visible
    await expect(page.locator('h2.page-title')).toContainText(/Habits Lab/i);

    // core controls exist
    await expect(page.locator('#habitsSortSelect')).toBeVisible();
    await expect(page.locator('#habitsCountBadge')).toBeVisible();
    await expect(page.locator('#weekRangeLabel')).toBeVisible();
    await expect(page.locator('#habitsWeekHeaderRow')).toBeVisible();

    // table body exists
    await expect(page.locator('#habitsTableBody')).toBeVisible();

    // right-side cards exist
    await expect(page.locator('#sharedWithYouCard')).toBeVisible();
    await expect(page.locator('#todayLabel')).toBeVisible();
    await expect(page.locator('#todayProgressBar')).toBeVisible();
    await expect(page.locator('#weeklyDeltaLabel')).toBeVisible();
    await expect(page.locator('#weeklyProgressBar')).toBeVisible();
    await expect(page.locator('#patternsCard')).toBeVisible();
    await expect(page.locator('#streakHighlight')).toBeVisible();
    await expect(page.locator('#archivedHabitsCard')).toBeVisible();
  });

  test('should open New Habit modal and toggle reminder fields enable/disable', async ({ page }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    // open modal
    await page.click('#habitNewBtn');
    await expect(page.locator('#habitModal')).toBeVisible();

    // Reminder inputs disabled by default
    await expect(page.locator('#habitReminderEnabled')).not.toBeChecked();
    await expect(page.locator('#habitReminderTime')).toBeDisabled();
    await expect(page.locator('#habitReminderRepeat')).toBeDisabled();

    // Enable reminders -> inputs enabled
    await page.check('#habitReminderEnabled');
    await expect(page.locator('#habitReminderTime')).toBeEnabled();
    await expect(page.locator('#habitReminderRepeat')).toBeEnabled();

    // Disable -> disabled again
    await page.uncheck('#habitReminderEnabled');
    await expect(page.locator('#habitReminderTime')).toBeDisabled();
    await expect(page.locator('#habitReminderRepeat')).toBeDisabled();
  });

  test('should NOT allow creating a habit with empty title (HTML5 required validation)', async ({ page }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    await page.click('#habitNewBtn');
    await expect(page.locator('#habitModal')).toBeVisible();

    // leave title empty, attempt submit
    await page.click('#habitModalSubmitBtn');

    // modal should still be visible because required field blocks submit
    await expect(page.locator('#habitModal')).toBeVisible();

    // and title should be invalid
    await expect(page.locator('#habitTitle')).toHaveJSProperty('validity.valueMissing', true);
  });

  test('should create a habit (Happy path, idempotent) and show it in table', async ({ page }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    const habitTitle = `E2E Habit ${Date.now()}`;

    // If already exists, don’t recreate (idempotent)
    const existingRow = page.locator('#habitsTableBody tr', {
      has: page.locator('.habit-title', { hasText: habitTitle }),
    });

    if ((await existingRow.count()) === 0) {
      await page.click('#habitNewBtn');
      await expect(page.locator('#habitModal')).toBeVisible();

      await page.fill('#habitTitle', habitTitle);
      await page.selectOption('#habitTargetPerWeek', '3');

      // exercise reminder payload
      await page.check('#habitReminderEnabled');
      await page.fill('#habitReminderTime', '09:00');
      await page.selectOption('#habitReminderRepeat', 'daily');

      await page.click('#habitModalSubmitBtn');

      // modal closes after success
      await expect(page.locator('#habitModal')).toBeHidden({ timeout: 10000 });
    }

    // Verify row appears
    await expect(existingRow.first()).toBeVisible({ timeout: 10000 });

    // Verify badge exists (seed differs, so don’t assert exact number)
    await expect(page.locator('#habitsCountBadge')).toBeVisible();
  });

  test('should persist reminder fields after editing an existing habit (enable + time + repeat)', async ({ page }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    const originalTitle = `E2E ReminderPersist ${Date.now()}`;

    const row = page.locator('#habitsTableBody tr', {
      has: page.locator('.habit-title', { hasText: originalTitle }),
    });

    // Ensure exists
    if ((await row.count()) === 0) {
      await page.click('#habitNewBtn');
      await page.fill('#habitTitle', originalTitle);
      await page.selectOption('#habitTargetPerWeek', '2');
      await page.click('#habitModalSubmitBtn');
      await expect(page.locator('#habitModal')).toBeHidden({ timeout: 10000 });
      await expect(row.first()).toBeVisible({ timeout: 10000 });
    }

    // open edit
    await row.first().locator('button.habit-actions-toggle').click();
    await expect(page.locator('.dropdown-menu.show')).toBeVisible();
    await page.locator('.dropdown-menu.show').locator('.habit-edit-btn').click();

    await expect(page.locator('#habitModal')).toBeVisible();

    // set reminder fields
    await page.check('#habitReminderEnabled');
    await page.fill('#habitReminderTime', '10:30');
    await page.selectOption('#habitReminderRepeat', 'weekly');

    await page.click('#habitModalSubmitBtn');
    await expect(page.locator('#habitModal')).toBeHidden({ timeout: 10000 });

    // reopen edit again and verify persisted values
    await row.first().locator('button.habit-actions-toggle').click();
    await expect(page.locator('.dropdown-menu.show')).toBeVisible();
    await page.locator('.dropdown-menu.show').locator('.habit-edit-btn').click();

    await expect(page.locator('#habitModal')).toBeVisible();
    await expect(page.locator('#habitReminderEnabled')).toBeChecked();
    await expect(page.locator('#habitReminderTime')).toHaveValue('10:30');
    await expect(page.locator('#habitReminderRepeat')).toHaveValue('weekly');

    // close modal
    await page.locator('#habitModal button.btn-close').click();
    await expect(page.locator('#habitModal')).toBeHidden({ timeout: 10000 });
  });

  test('should render week header with 7 days and show Today column highlight somewhere', async ({ page }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#habitsWeekHeaderRow')).toBeVisible();

    // 2 spacer th + 7 day th = 9 total
    const thCount = await page.locator('#habitsWeekHeaderRow th').count();
    expect(thCount).toBe(9);

    // ensure at least one day header is today (if your backend marks it)
    const todayHeader = page.locator('#habitsWeekHeaderRow th.is-today-header');
    // don’t hard fail if timezone edge-case, but usually should exist
    if ((await todayHeader.count()) > 0) {
      await expect(todayHeader.first()).toBeVisible();
    }
  });

  test('should block toggling a FUTURE day (future dot disabled)', async ({ page }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    // Ensure at least one row exists (create a habit if table is empty)
    const rowCount = await page.locator('#habitsTableBody tr').count();
    if (rowCount === 0) {
      const habitTitle = `E2E Seed ${Date.now()}`;
      await page.click('#habitNewBtn');
      await page.fill('#habitTitle', habitTitle);
      await page.selectOption('#habitTargetPerWeek', '1');
      await page.click('#habitModalSubmitBtn');
      await expect(page.locator('#habitModal')).toBeHidden({ timeout: 10000 });
    }

    const firstRow = page.locator('#habitsTableBody tr').first();
    await expect(firstRow).toBeVisible();

    // Try find a future button (may not exist depending on week/timezone)
    const futureBtn = firstRow.locator('button.habit-dot.is-future').first();
    if ((await futureBtn.count()) === 0) {
      await expect(page.locator('#habitsWeekHeaderRow')).toBeVisible();
      return;
    }

    await expect(futureBtn).toBeDisabled();
  });

  test('should toggle TODAY dot (done/undone) and then toggle back (cleanup)', async ({ page }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    // Ensure a target habit exists so test is stable
    const habitTitle = `E2E Toggle ${Date.now()}`;
    const row = page.locator('#habitsTableBody tr', {
      has: page.locator('.habit-title', { hasText: habitTitle }),
    });

    if ((await row.count()) === 0) {
      await page.click('#habitNewBtn');
      await page.fill('#habitTitle', habitTitle);
      await page.selectOption('#habitTargetPerWeek', '1');
      await page.click('#habitModalSubmitBtn');
      await expect(page.locator('#habitModal')).toBeHidden({ timeout: 10000 });
      await expect(row.first()).toBeVisible({ timeout: 10000 });
    }

    const todayBtn = row.first().locator('button.habit-dot.is-today').first();
    await expect(todayBtn).toBeVisible();

    const wasComplete = await todayBtn.evaluate((el) => el.classList.contains('is-complete'));

    await todayBtn.click();

    // wait until pending clears (if your UI uses it)
    await expect.poll(async () => {
      return await todayBtn.evaluate((el) => el.classList.contains('is-pending'));
    }, { timeout: 10000 }).toBe(false);

    const nowComplete = await todayBtn.evaluate((el) => el.classList.contains('is-complete'));
    expect(nowComplete).toBe(!wasComplete);

    // Toggle back (cleanup)
    await todayBtn.click();
    await expect.poll(async () => {
      return await todayBtn.evaluate((el) => el.classList.contains('is-complete'));
    }, { timeout: 10000 }).toBe(wasComplete);
  });

  test('should update Today progress label/bar when toggling a habit (sanity)', async ({ page }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    // Ensure at least one row exists
    const rowCount = await page.locator('#habitsTableBody tr').count();
    if (rowCount === 0) {
      const habitTitle = `E2E TodayProg ${Date.now()}`;
      await page.click('#habitNewBtn');
      await page.fill('#habitTitle', habitTitle);
      await page.selectOption('#habitTargetPerWeek', '1');
      await page.click('#habitModalSubmitBtn');
      await expect(page.locator('#habitModal')).toBeHidden({ timeout: 10000 });
    }

    const labelBefore = (await page.locator('#todayLabel').textContent()) || '';

    const firstRow = page.locator('#habitsTableBody tr').first();
    const todayBtn = firstRow.locator('button.habit-dot.is-today').first();

    if ((await todayBtn.count()) === 0) {
      await expect(page.locator('#todayLabel')).toBeVisible();
      return;
    }

    await todayBtn.click();
    await expect.poll(async () => {
      return await todayBtn.evaluate((el) => el.classList.contains('is-pending'));
    }, { timeout: 10000 }).toBe(false);

    const labelAfter = (await page.locator('#todayLabel').textContent()) || '';

    // label should change (usually x / y)
    expect(labelAfter).not.toBe(labelBefore);

    // cleanup: toggle back
    await todayBtn.click();
    await expect.poll(async () => {
      return await todayBtn.evaluate((el) => el.classList.contains('is-pending'));
    }, { timeout: 10000 }).toBe(false);
  });

  test('should switch Sort dropdown and re-render (Created -> Streak -> Consistency -> Needs attention -> Manual)', async ({ page }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#habitsSortSelect')).toBeVisible();

    // Created
    await page.selectOption('#habitsSortSelect', 'created');
    await expect(page.locator('#habitsSortSelect')).toHaveValue('created');

    // Streak
    await page.selectOption('#habitsSortSelect', 'streak');
    await expect(page.locator('#habitsSortSelect')).toHaveValue('streak');

    // Consistency
    await page.selectOption('#habitsSortSelect', 'consistency');
    await expect(page.locator('#habitsSortSelect')).toHaveValue('consistency');

    // At risk
    await page.selectOption('#habitsSortSelect', 'atrisk');
    await expect(page.locator('#habitsSortSelect')).toHaveValue('atrisk');

    // Manual
    await page.selectOption('#habitsSortSelect', 'manual');
    await expect(page.locator('#habitsSortSelect')).toHaveValue('manual');

    // In manual mode drag handles should exist (if there are habits)
    const handles = page.locator('.habit-drag-handle');
    if ((await page.locator('#habitsTableBody tr').count()) > 0) {
      await expect(handles.first()).toBeVisible();
    }
  });

  test('should edit a habit title successfully', async ({ page }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    const originalTitle = `E2E Edit ${Date.now()}`;
    const newTitle = `${originalTitle} (Renamed)`;

    const originalRow = page.locator('#habitsTableBody tr', {
      has: page.locator('.habit-title', { hasText: originalTitle }),
    });

    // Ensure exists
    if ((await originalRow.count()) === 0) {
      await page.click('#habitNewBtn');
      await page.fill('#habitTitle', originalTitle);
      await page.selectOption('#habitTargetPerWeek', '2');
      await page.click('#habitModalSubmitBtn');
      await expect(page.locator('#habitModal')).toBeHidden({ timeout: 10000 });
      await expect(originalRow.first()).toBeVisible({ timeout: 10000 });
    }

    // Open row actions (dropdown)
    await originalRow.first().locator('button.habit-actions-toggle').click();
    await expect(page.locator('.dropdown-menu.show')).toBeVisible();

    // Click edit
    await page.locator('.dropdown-menu.show').locator('.habit-edit-btn').click();

    // Update
    await expect(page.locator('#habitModal')).toBeVisible();
    await page.fill('#habitTitle', newTitle);
    await page.click('#habitModalSubmitBtn');
    await expect(page.locator('#habitModal')).toBeHidden({ timeout: 10000 });

    // Verify renamed row exists
    const renamedRow = page.locator('#habitsTableBody tr', {
      has: page.locator('.habit-title', { hasText: newTitle }),
    });
    await expect(renamedRow.first()).toBeVisible({ timeout: 10000 });
  });

  test('should archive a habit and Undo to restore it', async ({ page }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    const habitTitle = `E2E Archive ${Date.now()}`;

    const row = page.locator('#habitsTableBody tr', {
      has: page.locator('.habit-title', { hasText: habitTitle }),
    });

    // Ensure exists
    if ((await row.count()) === 0) {
      await page.click('#habitNewBtn');
      await page.fill('#habitTitle', habitTitle);
      await page.selectOption('#habitTargetPerWeek', '1');
      await page.click('#habitModalSubmitBtn');
      await expect(page.locator('#habitModal')).toBeHidden({ timeout: 10000 });
      await expect(row.first()).toBeVisible({ timeout: 10000 });
    }

    // Archive via dropdown
    await row.first().locator('button.habit-actions-toggle').click();
    await expect(page.locator('.dropdown-menu.show')).toBeVisible();
    await page.locator('.dropdown-menu.show').locator('.habit-archive-btn').click();

    // Row disappears
    await expect(row).toHaveCount(0, { timeout: 10000 });

    // Undo toast appears (same as your friends pattern)
    const undoBtn = page.locator('#toastHost .undo-toast-btn').last();
    await expect(undoBtn).toBeVisible({ timeout: 7000 });
    await undoBtn.click();

    // Row returns
    await expect(row.first()).toBeVisible({ timeout: 10000 });
  });

  test('should archive a habit without Undo and then restore from Archived list', async ({ page }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    const habitTitle = `E2E Archive2 ${Date.now()}`;

    const row = page.locator('#habitsTableBody tr', {
      has: page.locator('.habit-title', { hasText: habitTitle }),
    });

    // Ensure exists
    if ((await row.count()) === 0) {
      await page.click('#habitNewBtn');
      await page.fill('#habitTitle', habitTitle);
      await page.selectOption('#habitTargetPerWeek', '1');
      await page.click('#habitModalSubmitBtn');
      await expect(page.locator('#habitModal')).toBeHidden({ timeout: 10000 });
      await expect(row.first()).toBeVisible({ timeout: 10000 });
    }

    // Archive via dropdown
    await row.first().locator('button.habit-actions-toggle').click();
    await expect(page.locator('.dropdown-menu.show')).toBeVisible();
    await page.locator('.dropdown-menu.show').locator('.habit-archive-btn').click();

    // Don’t click undo. Wait for undo window to expire.
    await page.waitForTimeout(5500);

    // Verify in archived list
    const archivedItem = page.locator('#archivedHabitsList .archived-habit-item', {
      has: page.locator('.archived-habit-name', { hasText: habitTitle }),
    });
    await expect(archivedItem).toBeVisible({ timeout: 10000 });

    // Restore
    await archivedItem.locator('button.archived-unarchive-btn').click();

    // Back in main table
    await expect(row.first()).toBeVisible({ timeout: 10000 });
  });

  test('should delete a habit and Undo to restore it', async ({ page }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    const habitTitle = `E2E Delete ${Date.now()}`;

    const row = page.locator('#habitsTableBody tr', {
      has: page.locator('.habit-title', { hasText: habitTitle }),
    });

    // Ensure exists
    if ((await row.count()) === 0) {
      await page.click('#habitNewBtn');
      await page.fill('#habitTitle', habitTitle);
      await page.selectOption('#habitTargetPerWeek', '1');
      await page.click('#habitModalSubmitBtn');
      await expect(page.locator('#habitModal')).toBeHidden({ timeout: 10000 });
      await expect(row.first()).toBeVisible({ timeout: 10000 });
    }

    // Delete via dropdown
    await row.first().locator('button.habit-actions-toggle').click();
    await expect(page.locator('.dropdown-menu.show')).toBeVisible();
    await page.locator('.dropdown-menu.show').locator('.habit-delete-btn').click();

    // Confirm modal
    await expect(page.locator('#habitDeleteModal')).toBeVisible();
    await expect(page.locator('#habitDeleteMessage')).toContainText(`Delete "${habitTitle}"?`);
    await page.click('#habitDeleteConfirmBtn');

    await expect(page.locator('#habitDeleteModal')).toBeHidden({ timeout: 10000 });

    // Row removed
    await expect(row).toHaveCount(0, { timeout: 10000 });

    // Undo toast exists
    const undoBtn = page.locator('#toastHost .undo-toast-btn').last();
    await expect(undoBtn).toBeVisible({ timeout: 7000 });
    await undoBtn.click();

    // Row returns
    await expect(row.first()).toBeVisible({ timeout: 10000 });
  });

  test('should delete a habit without Undo and ensure it stays deleted after 10s window', async ({ page }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    const habitTitle = `E2E HardDelete ${Date.now()}`;

    const row = page.locator('#habitsTableBody tr', {
      has: page.locator('.habit-title', { hasText: habitTitle }),
    });

    // Ensure exists
    if ((await row.count()) === 0) {
      await page.click('#habitNewBtn');
      await page.fill('#habitTitle', habitTitle);
      await page.selectOption('#habitTargetPerWeek', '1');
      await page.click('#habitModalSubmitBtn');
      await expect(page.locator('#habitModal')).toBeHidden({ timeout: 10000 });
      await expect(row.first()).toBeVisible({ timeout: 10000 });
    }

    // Delete via dropdown
    await row.first().locator('button.habit-actions-toggle').click();
    await expect(page.locator('.dropdown-menu.show')).toBeVisible();
    await page.locator('.dropdown-menu.show').locator('.habit-delete-btn').click();

    // Confirm modal
    await expect(page.locator('#habitDeleteModal')).toBeVisible();
    await page.click('#habitDeleteConfirmBtn');
    await expect(page.locator('#habitDeleteModal')).toBeHidden({ timeout: 10000 });

    // Row removed immediately
    await expect(row).toHaveCount(0, { timeout: 10000 });

    // Do NOT click undo. Wait past 10s delete window.
    await page.waitForTimeout(10500);

    // Refresh page and ensure it does not come back
    await page.reload();
    await page.waitForLoadState('networkidle');

    const rowAfter = page.locator('#habitsTableBody tr', {
      has: page.locator('.habit-title', { hasText: habitTitle }),
    });
    await expect(rowAfter).toHaveCount(0);
  });

  test('should generate a share progress link (Send may be disabled if no friends)', async ({ page }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    await page.click('#btnShareProgress');
    await expect(page.locator('#shareBackdrop')).toBeVisible();

    // Generate link
    await page.click('#btnShareGenerate');

    await expect(page.locator('#shareLinkWrap')).toBeVisible({ timeout: 10000 });
    const linkValue = await page.locator('#shareLink').inputValue();
    expect(linkValue).toMatch(/\/share\/habits\//);

    // Send area appears
    await expect(page.locator('#shareSendWrap')).toBeVisible();
    await expect(page.locator('#shareFriends')).toBeVisible();

    // If "no friends" hint shows, Send should be disabled
    const hint = page.locator('#shareFriendsHint');
    if (await hint.isVisible().catch(() => false)) {
      const hintText = (await hint.textContent()) || '';
      if (/no friends/i.test(hintText)) {
        await expect(page.locator('#btnShareSend')).toBeDisabled();
      }
    }

    // Copy button works (just verify message changes)
    await page.click('#btnShareCopy');
    const msg = page.locator('#shareMsg');
    await expect(msg).toBeVisible();
    const msgText = (await msg.textContent()) || '';
    expect(msgText.length).toBeGreaterThan(0);

    // Close
    await page.click('#btnShareCancel');
    await expect(page.locator('#shareBackdrop')).toBeHidden();
  });

  test('should open shared link in a new page if share link exists (best-effort)', async ({ page, context }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    await page.click('#btnShareProgress');
    await expect(page.locator('#shareBackdrop')).toBeVisible();

    await page.click('#btnShareGenerate');
    await expect(page.locator('#shareLinkWrap')).toBeVisible({ timeout: 10000 });

    const linkValue = await page.locator('#shareLink').inputValue();
    expect(linkValue).toMatch(/\/share\/habits\//);

    // open share link in new tab (page.goto works too, but new tab simulates real share usage)
    const sharePage = await context.newPage();
    await sharePage.goto(linkValue);

    // shared page should show title + card
    await expect(sharePage.locator('#title')).toContainText(/Habits progress/i);

    // Depending on visibility, it may load or require login.
    // Since this is the same logged-in browser context, it should usually load.
    const stateText = (await sharePage.locator('#shareState').textContent().catch(() => '')) || '';
    if (/Friends-only: please login/i.test(stateText)) {
      await expect(sharePage.locator('#shareState')).toContainText(/please login/i);
    } else if (/access denied/i.test(stateText)) {
      await expect(sharePage.locator('#shareState')).toContainText(/access denied/i);
    } else if (/expired/i.test(stateText)) {
      await expect(sharePage.locator('#shareState')).toContainText(/expired/i);
    } else {
      // if loaded, main body should show
      await expect(sharePage.locator('#shareBody')).toBeVisible({ timeout: 10000 });
      await expect(sharePage.locator('#dailyGrid')).toBeVisible();
      await expect(sharePage.locator('#allHabits')).toBeVisible();
    }

    await sharePage.close();

    await page.click('#btnShareCancel');
    await expect(page.locator('#shareBackdrop')).toBeHidden();
  });

  test('Shared with you card: either empty state OR list items exist', async ({ page }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#sharedWithYouCard')).toBeVisible();

    const empty = await page.locator('#sharedWithYouEmpty').isVisible().catch(() => false);
    const items = await page.locator('#sharedWithYouList li').count().catch(() => 0);

    // at least one of these must be true depending on seed
    expect(empty || items > 0).toBeTruthy();
  });

  test('should logout from sidebar footer and redirect to login', async ({ page }) => {

    await page.goto('http://localhost:3001/habit/habits.html');
    await page.waitForLoadState('networkidle');

    // click logout in sidebar footer
    await page.click('.sidebar-footer a');

    // should go to login
    await page.waitForURL('http://localhost:3001/login.html');

    // token should be cleared -> login form visible
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

});
