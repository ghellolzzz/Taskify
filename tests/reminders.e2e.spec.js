const { test, expect } = require('@playwright/test');

test.describe('Personal Task Management (E2E)', () => {

    test.beforeEach(async ({ page }) => {
        // login before each test
        await page.goto('http://localhost:3001/login.html');

        await page.fill('input[type="email"]', 'MGF_21@ICLOUD.COM');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Wait for dashboard to load
        await page.waitForURL('http://localhost:3001/dashboard/dashboard.html');
    });

    test('should allow a user to create a reminder', async ({ page }) => {
    
            //navigate to the reminder page
            await page.goto('http://localhost:3001/reminder/reminder.html');
            await page.waitForLoadState('networkidle');
    
            const initialUpcoming = await page.locator('#sumUpcoming').innerText();

            // 1. Creating the Reminder
            const reminderTitle = `E2E Test Reminder ${Date.now()}`;
            await page.fill('#rTitle', reminderTitle);
            await page.fill('#rNotes', 'Automated reminder notes content.');

            const futureDate = "2026-12-25T14:30";
            await page.fill('#rDate', futureDate);
            await page.selectOption('#rRepeat', 'daily');

            //click the button
            await page.click('button:has-text("Create Reminder")');

            await page.waitForLoadState('networkidle');

            // Verify that the reminder is in the table
            const row = page.locator(`#reminderTable tbody tr:has-text("${reminderTitle}")`);
            await expect(row).toBeVisible({ timeout: 10000 });
            await expect(row.locator('.status-badge')).toContainText('Upcoming');

            const newUpcoming = await page.locator('#sumUpcoming').innerText();
            expect(newUpcoming).not.toBe(initialUpcoming);
        });

    test('should allow a user to edit an existing reminder', async ({ page }) => {
        await page.goto('http://localhost:3001/reminder/reminder.html');
        await page.waitForLoadState('networkidle');

        // 1. Target the first row's edit button (blue pencil icon)
        const firstRow = page.locator('#reminderTable tbody tr').first();
        const originalTitle = await firstRow.locator('td').nth(2).innerText();
        
        await firstRow.locator('.btn-primary').click(); // Blue Edit button

        // 2. Wait for modal and update fields
        await page.waitForSelector('#editModal', { state: 'visible' });
        const updatedTitle = `Updated ${originalTitle}`;
        await page.fill('#editTitle', updatedTitle);
        await page.fill('#editNotes', 'Updated note content via E2E');

        // 3. Save changes
        await page.click('#editModal button:has-text("Save")');

        // 4. Verify the title changed in the table
        await expect(page.locator(`#reminderTable tbody tr:has-text("${updatedTitle}")`)).toBeVisible();
    });


    test('should mark a one-time reminder as done', async ({ page }) => {
        await page.goto('http://localhost:3001/reminder/reminder.html');
        await page.waitForLoadState('networkidle');

        // 1. Capture initial summary count
        const initialDoneText = await page.locator('#sumDone').innerText();

        // 2. Create a ONE-TIME reminder (Repeat: None)
        // This is crucial because recurring tasks won't show the "Done" badge
        const reminderTitle = `One-time Task ${Date.now()}`;
        await page.fill('#rTitle', reminderTitle);
        await page.fill('#rDate', '2026-01-21T10:00'); 
        await page.selectOption('#rRepeat', 'none'); // Must be 'none' to see "Done" status
        await page.click('button:has-text("Create Reminder")');
        
        await page.waitForLoadState('networkidle');

        // 3. Locate the specific row we just created
        const targetRow = page.locator(`#reminderTable tbody tr:has-text("${reminderTitle}")`);
        
        // 4. Setup Dialog Handler to accept the confirm() and success alert()
        page.on('dialog', async dialog => {
            await dialog.accept();
        });

        // 5. Click the green checkmark button
        await targetRow.locator('.btn-success').click();

        // 6. Wait for the table to reload
        await page.waitForLoadState('networkidle');

        // 7. Verify the status badge is now "Done"
        const updatedRow = page.locator(`#reminderTable tbody tr:has-text("${reminderTitle}")`);
        const doneBadge = updatedRow.locator('.status-done');
        await expect(doneBadge).toBeVisible({ timeout: 10000 });
        await expect(doneBadge).toHaveText('Done');

        // 8. Verify the summary count for "Done" increased
        await expect(async () => {
            const newDoneText = await page.locator('#sumDone').innerText();
            expect(newDoneText).not.toBe(initialDoneText);
        }).toPass();
    });

    test('should delete a reminder', async ({ page }) => {
        await page.goto('http://localhost:3001/reminder/reminder.html');
        await page.waitForLoadState('networkidle');

        // Identify the reminder to delete
        const firstRow = page.locator('#reminderTable tbody tr').first();
        const titleToDelete = await firstRow.locator('td').nth(2).innerText();

        // Handle the browser confirm() dialog
        page.on('dialog', dialog => dialog.accept());

        // Click the red trash button
        await firstRow.locator('.btn-danger').click();

        // Verify the row is removed from the table
        await expect(page.locator(`#reminderTable tbody tr:has-text("${titleToDelete}")`)).not.toBeVisible();
    });


});