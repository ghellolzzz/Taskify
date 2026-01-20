const { test, expect } = require('@playwright/test');

//group alll tests under personal task managemnet
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

    test('should allow a user to create, edit, and delete a personal task', async ({ page }) => {

        //navigate to the task page
        await page.goto('http://localhost:3001/tasks/task.html');
        await page.waitForLoadState('networkidle');

        //creating the task
        await page.click('#show-add-form');

        const taskTitle = `E2E Test Task ${Date.now()}`;
        await page.fill('#title', taskTitle);
        await page.fill('#description', 'This was created by an automated Playwright test.');
        await page.selectOption('#priority', 'High');
        await page.click('#add-task-form button[type="submit"]');

        // verify that the task card is visible
        const newTaskCard = page.locator(`.task-card:has-text("${taskTitle}")`);
        await expect(newTaskCard).toBeVisible({ timeout: 10000 });
        await expect(newTaskCard.locator('.badge-priority-high')).toBeVisible();

        //editing the task

        // click the edit button on the task card
        await newTaskCard.locator('.edit-btn').click();

        //  wait for the modal to appear
        await page.waitForSelector('#editModal', { state: 'visible' });

        // Fill in the updated title
        const updatedTitle = `${taskTitle} - Updated`;
        await page.fill('#edit-title', updatedTitle);

        // save changes
        await page.click('#edit-task-form button:has-text("Save Changes")');

        // wait for modal to fully close 
        await page.waitForFunction(() => {
            const modal = document.querySelector('#editModal');
            return modal && !modal.classList.contains('show');
        }, { timeout: 5000 });


        await page.waitForLoadState('networkidle');

        //  locate the updated task card
        const updatedCard = page.locator(`.task-card:has-text("${updatedTitle}")`);
        await expect(updatedCard).toBeVisible({ timeout: 10000 });
        //deleting the task
        page.on('dialog', dialog => dialog.accept());
        await updatedCard.locator('.delete-btn').click();

        await page.waitForLoadState('networkidle');


        await expect(updatedCard).not.toBeVisible();
    });

    test('should mark a task as completed and move it to completed section', async ({ page }) => {
        await page.goto('http://localhost:3001/tasks/task.html');
        await page.waitForLoadState('networkidle');

        //creating a task
        await page.click('#show-add-form');
        const taskTitle = `Complete Me ${Date.now()}`;
        await page.fill('#title', taskTitle);
        await page.selectOption('#priority', 'Medium');
        await page.click('#add-task-form button[type="submit"]');

        await page.waitForLoadState('networkidle');

        //verify the task card is in the acitve container
        const activeTaskCard = page.locator(`#active-task-container .task-card:has-text("${taskTitle}")`);
        await expect(activeTaskCard).toBeVisible();

        //mark the card as completed
        await activeTaskCard.locator('.complete-btn').click();

        await page.waitForLoadState('networkidle');

        //verify that the completed card is in the completed container
        const completedTaskCard = page.locator(`#completed-task-container .task-card:has-text("${taskTitle}")`);
        await expect(completedTaskCard).toBeVisible();


        await expect(completedTaskCard).toHaveClass(/task-completed/);
    });

    test('should add and display comments on a task', async ({ page }) => {
        await page.goto('http://localhost:3001/tasks/task.html');
        await page.waitForLoadState('networkidle');


        await page.click('#show-add-form');
        const taskTitle = `Task with Comments ${Date.now()}`;
        await page.fill('#title', taskTitle);
        await page.click('#add-task-form button[type="submit"]');

        await page.waitForLoadState('networkidle');


        const taskCard = page.locator(`.task-card:has-text("${taskTitle}")`);
        await expect(taskCard).toBeVisible();

        //adding the commnet
        const commentText = 'This is a test comment from Playwright!';
        const commentInput = taskCard.locator('input[id^="comment-input-"]');
        await commentInput.fill(commentText);

        const postButton = taskCard.locator('button:has-text("Post")');
        await postButton.click();

        await page.waitForTimeout(1000);


        await expect(taskCard.locator(`.comment:has-text("${commentText}")`)).toBeVisible();
    });

    test('should filter tasks by priority', async ({ page }) => {
        await page.goto('http://localhost:3001/tasks/task.html');
        await page.waitForLoadState('networkidle');

        //creating a high priority task list
        await page.click('#show-add-form');
        await page.fill('#title', `High Priority Task ${Date.now()}`);
        await page.selectOption('#priority', 'High');
        await page.click('#add-task-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        // creating a low priority task
        await page.click('#show-add-form');
        await page.fill('#title', `Low Priority Task ${Date.now()}`);
        await page.selectOption('#priority', 'Low');
        await page.click('#add-task-form button[type="submit"]');
        await page.waitForLoadState('networkidle');


        await page.selectOption('#filterPriority', 'High');
        await page.click('#applyFiltersBtn');

        await page.waitForLoadState('networkidle');

        // verify only high priority tasks are shown
        const highPriorityBadges = page.locator('.badge-priority-high');
        const lowPriorityBadges = page.locator('.badge-priority-low');

        await expect(highPriorityBadges.first()).toBeVisible();
        await expect(lowPriorityBadges.first()).not.toBeVisible();
    });

    test('should filter tasks by status', async ({ page }) => {
        await page.goto('http://localhost:3001/tasks/task.html');
        await page.waitForLoadState('networkidle');


        await page.click('#show-add-form');
        const taskTitle = `Status Filter Test ${Date.now()}`;
        await page.fill('#title', taskTitle);
        await page.click('#add-task-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        // filter by Pending status
        await page.selectOption('#filterStatus', 'Pending');
        await page.click('#applyFiltersBtn');
        await page.waitForLoadState('networkidle');

        // verify task is visible
        await expect(page.locator(`.task-card:has-text("${taskTitle}")`)).toBeVisible();

        // filter by Completed status
        await page.selectOption('#filterStatus', 'Completed');
        await page.click('#applyFiltersBtn');
        await page.waitForLoadState('networkidle');

        // verify task is not shown
        await expect(page.locator(`.task-card:has-text("${taskTitle}")`)).not.toBeVisible();
    });

    test('should reset filters and show all tasks', async ({ page }) => {
        await page.goto('http://localhost:3001/tasks/task.html');
        await page.waitForLoadState('networkidle');

        // apply some filters
        await page.selectOption('#filterPriority', 'High');
        await page.selectOption('#filterStatus', 'Completed');
        await page.click('#applyFiltersBtn');
        await page.waitForLoadState('networkidle');

        // reset filters
        await page.click('#resetFiltersBtn');
        await page.waitForLoadState('networkidle');

        // verify filter inputs are cleared
        await expect(page.locator('#filterPriority')).toHaveValue('');
        await expect(page.locator('#filterStatus')).toHaveValue('');
    });

    test('should toggle completed tasks section', async ({ page }) => {
        await page.goto('http://localhost:3001/tasks/task.html');
        await page.waitForLoadState('networkidle');


        const completedContainer = page.locator('#completed-task-container');
        await expect(completedContainer).toHaveClass(/collapsed/);


        await page.click('.collapsible-header');
        await expect(completedContainer).not.toHaveClass(/collapsed/);


        await page.click('.collapsible-header');
        await expect(completedContainer).toHaveClass(/collapsed/);
    });

    test('should delete a comment', async ({ page }) => {
        await page.goto('http://localhost:3001/tasks/task.html');
        await page.waitForLoadState('networkidle');


        await page.click('#show-add-form');
        const taskTitle = `Delete Comment Test ${Date.now()}`;
        await page.fill('#title', taskTitle);
        await page.click('#add-task-form button[type="submit"]');
        await page.waitForLoadState('networkidle');


        const taskCard = page.locator(`.task-card:has-text("${taskTitle}")`);
        const commentText = 'Comment to be deleted';
        await taskCard.locator('input[id^="comment-input-"]').fill(commentText);
        await taskCard.locator('button:has-text("Post")').click();
        await page.waitForTimeout(1000);


        const comment = taskCard.locator(`.comment:has-text("${commentText}")`);
        await expect(comment).toBeVisible();

        //deleting the comment
        await comment.locator('button:has-text("Delete")').click();
        await page.waitForTimeout(1000);


        await expect(comment).not.toBeVisible();
    });

    test('should create task with category', async ({ page }) => {
        await page.goto('http://localhost:3001/tasks/task.html');
        await page.waitForLoadState('networkidle');


        await page.click('#show-add-form');
        const taskTitle = `Task with Category ${Date.now()}`;
        await page.fill('#title', taskTitle);

        //select available categories
        const categoryDropdown = page.locator('#category');
        const options = await categoryDropdown.locator('option').count();

        if (options > 1) {
            await categoryDropdown.selectOption({ index: 1 });
        }

        await page.click('#add-task-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        // verify task card shows category badge
        const taskCard = page.locator(`.task-card:has-text("${taskTitle}")`);
        await expect(taskCard).toBeVisible();
        await expect(taskCard.locator('.badge-category')).toBeVisible();
    });

    test('should show task due date correctly', async ({ page }) => {
        await page.goto('http://localhost:3001/tasks/task.html');
        await page.waitForLoadState('networkidle');


        await page.click('#show-add-form');
        const taskTitle = `Task with Due Date ${Date.now()}`;
        await page.fill('#title', taskTitle);


        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dueDateString = tomorrow.toISOString().split('T')[0];
        await page.fill('#dueDate', dueDateString);

        await page.click('#add-task-form button[type="submit"]');
        await page.waitForLoadState('networkidle');


        const taskCard = page.locator(`.task-card:has-text("${taskTitle}")`);
        await expect(taskCard).toBeVisible();
        await expect(taskCard.locator('p:has-text("Due:")')).toBeVisible();
    });
});