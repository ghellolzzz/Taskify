

const { test, expect } = require('@playwright/test')

// Group all tests related to Personal Task Management
test.describe('Personal Task Management (E2E)', () => {

    test.beforeEach(async ({ page }) => {
        // Go to login page
        await page.goto('/login.html'); // Adjust if your login page URL is different

      //filling in the credentials
        await page.fill('input[type="email"]', 'MGF_21@ICLOUD.COM'); // Use a valid test user from your DB
        await page.fill('input[type="password"]', 'password123'); // Use the correct password
        await page.click('button[type="submit"]');

     
        await page.waitForURL('dashboard/dashboard.html');
    });
})


 test('should allow a user to create, edit, and delete a personal task', async ({ page }) => {
        
    //create
        await page.click('a[href*="tasks/task.html"]');
        await page.waitForURL('**/tasks/task.html');

       // Open the form and create a new task
        await page.click('#show-add-form');
        const taskTitle = `E2E Test - Review PR #${Date.now()}`;
        await page.fill('#title', taskTitle);
        await page.fill('#description', 'This was created by an automated Playwright test.');
        await page.selectOption('#priority', 'High');
        await page.click('#add-task-form button[type="submit"]');

       // checking if the new task card is visble 
        const newTaskCard = page.locator(`.task-card:has-text("${taskTitle}")`);
        await expect(newTaskCard).toBeVisible();
        await expect(newTaskCard.locator('.badge-priority-high')).toBeVisible();

      //edit
       //finding the edit button on the new card and editing it
        await newTaskCard.locator('.edit-btn').click();
        
        //see if the updates are made
        const updatedTitle = `${taskTitle} - Updated`;
        await page.waitForSelector('#editModal', { state: 'visible' });
        await page.fill('#edit-title', updatedTitle);
        await page.click('#edit-task-form button:has-text("Save Changes")');
        
       // Checking  that the original card is gone and the updated one is visible
        await expect(newTaskCard).not.toBeVisible();
        const updatedCard = page.locator(`.task-card:has-text("${updatedTitle}")`);
        await expect(updatedCard).toBeVisible();

      
        //delete
        page.on('dialog', dialog => dialog.accept());
       //finding the delete button and clicking on it
        await updatedCard.locator('.delete-btn').click();
        
        //check that the card is deleted and gone
        await expect(updatedCard).not.toBeVisible();
    });
