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

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});


//groups all the tests in the goal management 
test.describe('Goal Management (E2E)', () => {

    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('http://localhost:3000/login.html');
        
        await page.fill('input[type="email"]', 'MGF_21@ICLOUD.COM');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        
      
        await page.waitForURL('http://localhost:3000/dashboard/dashboard.html');
    });

    test('should create, edit, and delete a goal', async ({ page }) => {
      
        await page.goto('http://localhost:3000/goal/goal.html');
        await page.waitForLoadState('networkidle');

        // creating a goal
        await page.click('#show-add-goal-form');
        
        const goalTitle = `E2E Goal ${Date.now()}`;
        await page.fill('#goal-title', goalTitle);
        await page.fill('#goal-description', 'Automated test goal description');
        await page.selectOption('#goal-category', 'Finance');
        await page.click('#add-goal-form button.btn-success');

        await page.waitForLoadState('networkidle');

        // verify that the goal card is visible
        const goalCard = page.locator(`.task-card:has-text("${goalTitle}")`);
        await expect(goalCard).toBeVisible({ timeout: 10000 });
        await expect(goalCard.locator('.goal-category-pill')).toContainText('Finance');

        // edit the goal
        await goalCard.locator('.edit-btn').click();
        
        const updatedTitle = `${goalTitle} - Updated`;
        await page.waitForSelector('#editGoalModal', { state: 'visible' });
        await page.fill('#edit-goal-title', updatedTitle);
        await page.selectOption('#edit-goal-category', 'Health');
        await page.click('#edit-goal-form button.btn-primary');
        
        await page.waitForLoadState('networkidle');
        
        // verify that the updated goal is there
        const updatedCard = page.locator(`.task-card:has-text("${updatedTitle}")`);
        await expect(updatedCard).toBeVisible({ timeout: 10000 });
        await expect(updatedCard.locator('.goal-category-pill')).toContainText('Health');

        // delete the goal
        page.on('dialog', dialog => dialog.accept());
        await updatedCard.locator('.delete-btn').click();
        
        await page.waitForLoadState('networkidle');
        
        // verify that the goal is deleted
        await expect(updatedCard).not.toBeVisible();
    });

    test('should mark a goal as completed and move it to completed section', async ({ page }) => {
        await page.goto('http://localhost:3000/goal/goal.html');
        await page.waitForLoadState('networkidle');

        
        await page.click('#show-add-goal-form');
        const goalTitle = `Complete Me Goal ${Date.now()}`;
        await page.fill('#goal-title', goalTitle);
        await page.selectOption('#goal-category', 'Fitness');
        await page.click('#add-goal-form button.btn-success');

        await page.waitForLoadState('networkidle');

        // verify that the goal is in the acive goal section
        const activeGoalCard = page.locator(`#active-goal-container .task-card:has-text("${goalTitle}")`);
        await expect(activeGoalCard).toBeVisible();

        //mark as completed
        await activeGoalCard.locator('.complete-btn').click();

        await page.waitForLoadState('networkidle');

        // verify goal moved to completed section
        const completedGoalCard = page.locator(`#completed-goal-container .task-card:has-text("${goalTitle}")`);
        await expect(completedGoalCard).toBeVisible();
        
        // verify it has completed styling
        await expect(completedGoalCard).toHaveClass(/goal-completed/);
    });

    test('should update progress bar when goals are completed', async ({ page }) => {
        await page.goto('http://localhost:3000/goal/goal.html');
        await page.waitForLoadState('networkidle');

        //getting the intial progress
        const progressBar = page.locator('#progressBar');
        

    
        await page.click('#show-add-goal-form');
        await page.fill('#goal-title', `Progress Test Goal ${Date.now()}`);
        await page.click('#add-goal-form button.btn-success');
        await page.waitForLoadState('networkidle');

        //mark as completed
        const goalCard = page.locator('.task-card').first();
        await goalCard.locator('.complete-btn').click();
        await page.waitForLoadState('networkidle');

        // verify progress bar updated
        const updatedProgress = await progressBar.textContent();
      
        expect(updatedProgress).toBeTruthy();
    });

test('should filter goals by completion status', async ({ page }) => {
    await page.goto('http://localhost:3000/goal/goal.html');

 
    await page.click('#show-add-goal-form');
    await expect(page.locator('#add-goal-card')).toBeVisible();

    const completedGoalTitle = `Completed Goal ${Date.now()}`;
    await page.fill('#goal-title', completedGoalTitle);
    await page.selectOption('#goal-category', 'Finance');
    await page.click('#add-goal-form button.btn-success');

    // wait for goal to appear
    const goalCard = page.locator('.task-card', { hasText: completedGoalTitle });
    await expect(goalCard).toBeVisible();

    // mark goal completed
    await goalCard.locator('.complete-btn').click();
    await page.waitForTimeout(600);

    // apply filter
    await page.selectOption('#filterCompleted', 'true');
    await page.click('#applyGoalFilters');

    // verify only completed goals are shown
    const completedContainer = page.locator('#completed-goal-container');
    await expect(completedContainer).toContainText(completedGoalTitle);
});


    test('should filter goals by category', async ({ page }) => {
        await page.goto('http://localhost:3000/goal/goal.html');
        await page.waitForLoadState('networkidle');

        // create Finance goal
        await page.click('#show-add-goal-form');
        await page.fill('#goal-title', `Finance Goal ${Date.now()}`);
        await page.selectOption('#goal-category', 'Finance');
        await page.click('#add-goal-form button.btn-success');
        await page.waitForLoadState('networkidle');

        // create Health goal
        await page.click('#show-add-goal-form');
        await page.fill('#goal-title', `Health Goal ${Date.now()}`);
        await page.selectOption('#goal-category', 'Health');
        await page.click('#add-goal-form button.btn-success');
        await page.waitForLoadState('networkidle');

        // filter by Finance
        await page.selectOption('#filterCategory', 'Finance');
        await page.click('#applyGoalFilters');
        await page.waitForLoadState('networkidle');

        // verify only Finance goals show
        const financePills = page.locator('.goal-category-pill.category-Finance');
        await expect(financePills.first()).toBeVisible();
        
        const healthPills = page.locator('.goal-category-pill.category-Health');
        await expect(healthPills.first()).not.toBeVisible();
    });

test('should sort active goals alphabetically by title', async ({ page }) => {
    await page.goto('http://localhost:3000/goal/goal.html');

   //sort by title
    await page.selectOption('#sortBy', 'title');
    await page.click('#applyGoalFilters');
    await page.waitForLoadState('networkidle');

   //get all active goal titles
    const titles = await page
        .locator('#active-goal-container .goal-title')
        .allTextContents();

    //creating a sorted copy
    const sorted = [...titles].sort((a, b) => a.localeCompare(b));

    //compare
    expect(titles).toEqual(sorted);
});


    test('should reset filters and show all goals', async ({ page }) => {
        await page.goto('http://localhost:3000/goal/goal.html');
        await page.waitForLoadState('networkidle');

        // apply filters
        await page.selectOption('#filterCompleted', 'false');
        await page.selectOption('#filterCategory', 'Finance');
        await page.selectOption('#sortBy', 'title');
        await page.click('#applyGoalFilters');
        await page.waitForLoadState('networkidle');

        // reset filters
        await page.click('#resetGoalFilters');
        await page.waitForLoadState('networkidle');

        // verify filters are cleared
        await expect(page.locator('#filterCompleted')).toHaveValue('');
        await expect(page.locator('#filterCategory')).toHaveValue('');
        await expect(page.locator('#sortBy')).toHaveValue('newest');
    });

    test('should toggle completed goals section', async ({ page }) => {
        await page.goto('http://localhost:3000/goal/goal.html');
        await page.waitForLoadState('networkidle');

        // initially collapsed
        const completedContainer = page.locator('#completed-goal-container');
        await expect(completedContainer).toHaveClass(/collapsed/);

        // click to expand
        await page.click('.collapsible-header');
        await page.waitForTimeout(300);
        await expect(completedContainer).not.toHaveClass(/collapsed/);

        // verify arrow changed
        const arrow = page.locator('#goalArrow');
        await expect(arrow).toHaveClass(/bi-chevron-up/);
    });

    test('should toggle SMART goals guide', async ({ page }) => {
        await page.goto('http://localhost:3000/goal/goal.html');
        await page.waitForLoadState('networkidle');

     
        const smartContent = page.locator('#smartContent');
        await expect(smartContent).toHaveClass(/collapsed/);

       
        await page.click('.smart-header');
        await page.waitForTimeout(300);
        await expect(smartContent).not.toHaveClass(/collapsed/);

        // verify content is visible
        await expect(smartContent.locator('text=Specific')).toBeVisible();
        await expect(smartContent.locator('text=Measurable')).toBeVisible();

        // click to collapse
        await page.click('.smart-header');
        await page.waitForTimeout(300);
        await expect(smartContent).toHaveClass(/collapsed/);
    });

    test('should display goal categories correctly', async ({ page }) => {
        await page.goto('http://localhost:3000/goal/goal.html');
        await page.waitForLoadState('networkidle');

        // test each category
        const categories = ['Finance', 'Health', 'PersonalGrowth', 'Career', 'Education', 'Fitness'];
        
        for (const category of categories.slice(0, 2)) { 
            await page.click('#show-add-goal-form');
            await page.fill('#goal-title', `${category} Goal ${Date.now()}`);
            await page.selectOption('#goal-category', category);
            await page.click('#add-goal-form button.btn-success');
            await page.waitForLoadState('networkidle');

            // verify category pill
            const categoryPill = page.locator(`.goal-category-pill.category-${category}`);
            await expect(categoryPill.first()).toBeVisible();
            await expect(categoryPill.first()).toContainText(category);
        }
    });

    test('should create goal without category', async ({ page }) => {
        await page.goto('http://localhost:3000/goal/goal.html');
        await page.waitForLoadState('networkidle');

        // create goal without selecting category
        await page.click('#show-add-goal-form');
        const goalTitle = `No Category Goal ${Date.now()}`;
        await page.fill('#goal-title', goalTitle);
        await page.fill('#goal-description', 'Goal without category');
        await page.click('#add-goal-form button.btn-success');

        await page.waitForLoadState('networkidle');

        // verify goal exists
        const goalCard = page.locator(`.task-card:has-text("${goalTitle}")`);
        await expect(goalCard).toBeVisible();
        
        // verify no category pill
        await expect(goalCard.locator('.goal-category-pill')).not.toBeVisible();
    });
});