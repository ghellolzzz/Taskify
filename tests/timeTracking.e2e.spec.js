const { test, expect } = require('@playwright/test');

test.describe('Time tracking (E2E)', () => {

    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('http://localhost:3001/login.html');

        await page.fill('input[type="email"]', 'MGF_21@ICLOUD.COM');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Wait for dashboard to load
        await page.waitForURL('http://localhost:3001/dashboard/dashboard.html');
    });

    test('should display time tracking page and summary', async ({ page }) => {
        await page.goto('http://localhost:3001/time/time.html');
        await page.waitForLoadState('networkidle');

        await expect(page.getByRole('heading', { name: 'Time log' })).toBeVisible();
        await expect(page.locator('#sumTotal')).toBeVisible();
        await expect(page.locator('#timeTable')).toBeVisible();
        await expect(page.locator('button:has-text("Log time")').first()).toBeVisible();
    });

    test('should allow a user to create a time entry', async ({ page }) => {
        // Create a task first so we can log time against it
        await page.goto('http://localhost:3001/tasks/task.html');
        await page.waitForLoadState('networkidle');

        await page.click('#show-add-form');
        const taskTitle = `E2E Time Task ${Date.now()}`;
        await page.fill('#title', taskTitle);
        await page.selectOption('#priority', 'High');
        await page.click('#add-task-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        // Get task ID from the created task card (edit button onclick)
        const taskCard = page.locator(`.task-card:has-text("${taskTitle}")`);
        await expect(taskCard).toBeVisible({ timeout: 10000 });
        const onclick = await taskCard.locator('.edit-btn').getAttribute('onclick');
        const match = onclick?.match(/openEditModal\((\d+)\)/);
        const taskId = match?.[1];
        if (!taskId) throw new Error('Could not get task ID from edit button');

        // Navigate to time tracking page
        await page.goto('http://localhost:3001/time/time.html');
        await page.waitForLoadState('networkidle');

        // Wait for our task to appear in dropdown, then select by value
        await page.waitForSelector(`#timeTask option[value="${taskId}"]`, { state: 'attached', timeout: 15000 });
        await page.selectOption('#timeTask', taskId);
        await page.fill('#timeMinutes', '45');
        await page.fill('#timeNote', 'E2E test note');

        const postPromise = page.waitForResponse(resp => resp.url().includes('/api/time-entries') && resp.request().method() === 'POST' && resp.ok);
        await page.evaluate(() => createTimeEntry());
        await postPromise;
        await page.waitForLoadState('networkidle');

        // Verify the time entry appears in the table
        const row = page.locator(`#timeTable tbody tr:has-text("${taskTitle}")`);
        await expect(row).toBeVisible({ timeout: 10000 });
        await expect(row).toContainText('45m');
        await expect(row).toContainText('E2E test note');
    });

    test('should allow a user to edit a time entry', async ({ page }) => {
        // Create a task and log time first
        await page.goto('http://localhost:3001/tasks/task.html');
        await page.waitForLoadState('networkidle');

        await page.click('#show-add-form');
        const taskTitle = `E2E Edit Time Task ${Date.now()}`;
        await page.fill('#title', taskTitle);
        await page.click('#add-task-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        const taskCard = page.locator(`.task-card:has-text("${taskTitle}")`);
        await expect(taskCard).toBeVisible({ timeout: 10000 });
        const onclick = await taskCard.locator('.edit-btn').getAttribute('onclick');
        const match = onclick?.match(/openEditModal\((\d+)\)/);
        const taskId = match?.[1];
        if (!taskId) throw new Error('Could not get task ID from edit button');

        await page.goto('http://localhost:3001/time/time.html');
        await page.waitForLoadState('networkidle');

        await page.waitForSelector(`#timeTask option[value="${taskId}"]`, { state: 'attached', timeout: 15000 });
        await page.selectOption('#timeTask', taskId);
        await page.fill('#timeMinutes', '30');
        const postPromise = page.waitForResponse(resp => resp.url().includes('/api/time-entries') && resp.request().method() === 'POST' && resp.ok);
        await page.evaluate(() => createTimeEntry());
        await postPromise;
        await page.waitForLoadState('networkidle');

        // Edit the time entry
        const row = page.locator(`#timeTable tbody tr:has-text("${taskTitle}")`);
        await expect(row).toBeVisible({ timeout: 10000 });
        await row.locator('button[title="Edit"]').click();

        await page.waitForSelector('#editModal', { state: 'visible' });
        await page.fill('#editMinutes', '60');
        await page.fill('#editNote', 'Updated note via E2E');
        await page.click('#editModal button:has-text("Save")');

        await page.waitForLoadState('networkidle');

        // Verify the updated values appear
        const updatedRow = page.locator(`#timeTable tbody tr:has-text("${taskTitle}")`);
        await expect(updatedRow).toContainText('1h');
        await expect(updatedRow).toContainText('Updated note via E2E');
    });

    test('should allow a user to delete a time entry', async ({ page }) => {
        // Create a task and log time first
        await page.goto('http://localhost:3001/tasks/task.html');
        await page.waitForLoadState('networkidle');

        await page.click('#show-add-form');
        const taskTitle = `E2E Delete Time Task ${Date.now()}`;
        await page.fill('#title', taskTitle);
        await page.click('#add-task-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        const taskCard = page.locator(`.task-card:has-text("${taskTitle}")`);
        await expect(taskCard).toBeVisible({ timeout: 10000 });
        const onclick = await taskCard.locator('.edit-btn').getAttribute('onclick');
        const match = onclick?.match(/openEditModal\((\d+)\)/);
        const taskId = match?.[1];
        if (!taskId) throw new Error('Could not get task ID from edit button');

        await page.goto('http://localhost:3001/time/time.html');
        await page.waitForLoadState('networkidle');

        await page.waitForSelector(`#timeTask option[value="${taskId}"]`, { state: 'attached', timeout: 15000 });
        await page.selectOption('#timeTask', taskId);
        await page.fill('#timeMinutes', '15');
        const postPromise = page.waitForResponse(resp => resp.url().includes('/api/time-entries') && resp.request().method() === 'POST' && resp.ok);
        await page.evaluate(() => createTimeEntry());
        await postPromise;
        await page.waitForLoadState('networkidle');

        const row = page.locator(`#timeTable tbody tr:has-text("${taskTitle}")`);
        await expect(row).toBeVisible({ timeout: 10000 });

        // Handle confirm dialog
        page.on('dialog', dialog => dialog.accept());
        await row.locator('button[title="Delete"]').click();

        await page.waitForLoadState('networkidle');

        await expect(page.locator(`#timeTable tbody tr:has-text("${taskTitle}")`)).not.toBeVisible();
    });

    test('should update summary total when time entries are added', async ({ page }) => {
        await page.goto('http://localhost:3001/time/time.html');
        await page.waitForLoadState('networkidle');

        const initialTotal = await page.locator('#sumTotal').innerText();

        // Create a task and log time
        await page.goto('http://localhost:3001/tasks/task.html');
        await page.waitForLoadState('networkidle');

        await page.click('#show-add-form');
        const taskTitle = `E2E Summary Task ${Date.now()}`;
        await page.fill('#title', taskTitle);
        await page.click('#add-task-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        const taskCard = page.locator(`.task-card:has-text("${taskTitle}")`);
        await expect(taskCard).toBeVisible({ timeout: 10000 });
        const onclick = await taskCard.locator('.edit-btn').getAttribute('onclick');
        const match = onclick?.match(/openEditModal\((\d+)\)/);
        const taskId = match?.[1];
        if (!taskId) throw new Error('Could not get task ID from edit button');

        await page.goto('http://localhost:3001/time/time.html');
        await page.waitForLoadState('networkidle');

        await page.waitForSelector(`#timeTask option[value="${taskId}"]`, { state: 'attached', timeout: 15000 });
        await page.selectOption('#timeTask', taskId);
        await page.fill('#timeMinutes', '90');
        const postPromise = page.waitForResponse(resp => resp.url().includes('/api/time-entries') && resp.request().method() === 'POST' && resp.ok);
        await page.evaluate(() => createTimeEntry());
        await postPromise;
        await page.waitForLoadState('networkidle');

        const newTotal = await page.locator('#sumTotal').innerText();
        expect(newTotal).not.toBe(initialTotal);
        await expect(page.locator('#sumTotal')).toContainText('1h');
    });

    test('should apply date filter and show filtered entries', async ({ page }) => {
        await page.goto('http://localhost:3001/time/time.html');
        await page.waitForLoadState('networkidle');

        // Set filter dates
        const today = new Date().toISOString().slice(0, 10);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const fromDate = weekAgo.toISOString().slice(0, 10);

        await page.fill('#filterFrom', fromDate);
        await page.fill('#filterTo', today);
        await page.click('button:has-text("Apply")');

        await page.waitForLoadState('networkidle');

        // Table should still be visible (filter applied)
        await expect(page.locator('#timeTable')).toBeVisible();
    });
});
