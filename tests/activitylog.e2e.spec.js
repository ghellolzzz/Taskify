import { test, expect } from '@playwright/test';

const ownerUser = { email: 'MGF_21@ICLOUD.COM', password: 'password123', name: 'Mee Ghel' };

test.describe('Activity Log - Core Task Actions (E2E)', () => {

    test.beforeEach(async ({ page }) => {
       
        await page.goto('http://localhost:3001/login.html');
        await page.fill('#email', ownerUser.email);
        await page.fill('#password', ownerUser.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:3001/dashboard/dashboard.html');
    });

    test('should log actions correctly and filter them', async ({ page, request }) => {
        
      //creating a team and the task
        await page.goto('http://localhost:3001/teams/teams.html');
        await page.click('button:has-text("Create New Team")');
        const teamName = `Activity Core Test ${Date.now()}`;
        await page.fill('#team-name', teamName);
        await page.click('#create-team-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        
        await page.click(`.team-card h5:has-text("${teamName}")`);
         await page.waitForURL('http://localhost:3001/teams/team-view.html?id=*');
        await page.waitForLoadState('networkidle');

        const activityContainer = page.locator('#activity-feed-container');
        const taskTitle = 'Core Log Test Task';

        ///creating the team task
        await page.click('button:has-text("New Team Task")');
        await page.fill('#task-title', taskTitle);
        await page.click('#add-team-task-form button[type="submit"]');
        await page.waitForLoadState('networkidle');
        
        
        await expect(activityContainer).toContainText(`E2E Test User created task: "${taskTitle}"`);

        await expect(activityContainer.locator('small.text-muted').first()).toHaveText(/just now|1m ago/);
        
       //updating the status
        await page.locator('.status-select').first().selectOption('In Progress');
        await page.waitForLoadState('networkidle');

      
        await expect(activityContainer).toContainText('E2E Test User updated status of "Core Log Test Task" to In Progress');

         await expect(activityContainer.locator('small.text-muted').first()).toHaveText(/just now|1m ago/);

        //posting a commment
        const commentText = 'Test log comment';
        await page.locator('.team-task-card').first().locator('button:has(i.bi-chat)').click(); 
        await page.locator('.comment-section').first().locator('input').fill(commentText);
        await page.locator('.comment-section').first().locator('button:has-text("Send")').click();
        await page.waitForTimeout(1000); 

       
        await expect(activityContainer).toContainText(`E2E Test User commented on task "${taskTitle}"`);

        await expect(activityContainer.locator('small.text-muted').first()).toHaveText(/just now|1m ago/);

       
        const logEntries = activityContainer.locator('.d-flex.mb-3');
        await expect(logEntries).toHaveCount(3);

        await page.selectOption('#activity-filter', 'CREATE_TASK');
        await page.waitForTimeout(500); 

      
        await expect(activityContainer).toContainText('created task');
        await expect(activityContainer).not.toContainText('updated status');
        await expect(activityContainer).not.toContainText('commented');
        await expect(activityContainer.locator('.d-flex.mb-3')).toHaveCount(1);

        // filter by status updates
        await page.selectOption('#activity-filter', 'UPDATE_STATUS');
        await page.waitForTimeout(500);

        
        await expect(activityContainer).not.toContainText('created task');
        await expect(activityContainer).toContainText('updated status');
        await expect(activityContainer).not.toContainText('commented');
        await expect(activityContainer.locator('.d-flex.mb-3')).toHaveCount(1);

        //filter by comments
        await page.selectOption('#activity-filter', 'POST_COMMENT');
        await page.waitForTimeout(500);

       
        await expect(activityContainer).not.toContainText('created task');
        await expect(activityContainer).not.toContainText('updated status');
        await expect(activityContainer).toContainText('commented');
        await expect(activityContainer.locator('.d-flex.mb-3')).toHaveCount(1);

        //reset to all activity
        await page.selectOption('#activity-filter', ''); 
        await page.waitForTimeout(500);

        
        await expect(activityContainer).toContainText('created task');
        await expect(activityContainer).toContainText('updated status');
        await expect(activityContainer).toContainText('commented');
        await expect(activityContainer.locator('.d-flex.mb-3')).toHaveCount(3);
    });
});
