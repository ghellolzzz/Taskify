const { test, expect } = require('@playwright/test');

test.describe('Task Categories Feature', () => {

  // Create a User & Login
  test.beforeEach(async ({ page }) => {
    // 1. Go to Login Page
    await page.goto('http://localhost:3001/login.html');

    // 2. Fill Credentials
    await page.fill('input[type="email"]', 'MGF_21@ICLOUD.COM'); 
    await page.fill('input[type="password"]', 'password123');

    // 3. Click Login
    await page.click('button[type="submit"]');

    // 4. Wait for Dashboard
    await page.waitForURL('**/dashboard/dashboard.html');

    // 5. Go to Categories
    await page.goto('http://localhost:3001/categories/categories.html');
  });

 // --- Create Category ---
  test('User can Create a new Category', async ({ page }) => {
    const randomNum = Math.floor(Math.random() * 1000);
    const uniqueName = `PW Test ${randomNum}`; 

    // 1. Open Modal
    await page.click('.add-category-btn');

    // 2. Fill Name
    await page.fill('#new-category-name', uniqueName);
    
    // 3. Pick Color
    await page.waitForTimeout(500); // Wait for animation
    await page.locator('.color-swatch:visible').nth(1).click({ force: true });

    // 4. Submit
    await page.click('#submit-category');

    // 5. Reload
    await page.waitForTimeout(1000); 
    await page.reload(); 
    await page.waitForLoadState('domcontentloaded');

    // 6. Verify
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible();
  });

 // --- Test 2: Edit Category color and name ---
  test('User can Edit a Category Name and Color', async ({ page }) => {
    // 1. Generate unique names to avoid "Zombie" data clashes
    const uniqueId = Date.now(); 
    const oldName = `Old Blue ${uniqueId}`;
    const newName = `New Red ${uniqueId}`;

    // 2. Create a category
    await page.click('.add-category-btn');
    await page.locator('#new-category-name:visible').fill(oldName); 
    await page.locator('.color-swatch:visible').nth(1).click(); // Blue
    await page.locator('#submit-category:visible').click();
    
    // Wait for it to appear
    await expect(page.locator(`text=${oldName}`).first()).toBeVisible();

    // 3. Click "Edit" on THAT SPECIFIC card
    // We look for the card with our unique random name
    await page.locator('.category-card', { hasText: oldName })
              .locator('.update-category-btn').click();
    
    // 4. Update the Name to the NEW unique name
    await page.locator('#new-category-name:visible').fill(newName);

    // 5. Change Color to RED (4th visible swatch)
    await page.locator('.color-swatch:visible').nth(3).click();

    // 6. Press Update
    await page.locator('#submit-category:visible').click(); 

    // 7. Verify
    await expect(page.locator(`text=${oldName}`)).toHaveCount(0);
    await expect(page.locator('h4', { hasText: newName })).toBeVisible();
  });

  // --- TEST 3: DELETE CATEGORY ---
  test('User can Delete a Category', async ({ page }) => {
    // 1. Create a category
    await page.click('.add-category-btn');
    await page.fill('#new-category-name', 'Delete Me');
    await page.click('#submit-category');

    // 2. Handle the "Are you sure?" popup
    page.on('dialog', dialog => dialog.accept());

    // 3. Click Delete
    await page.locator('.category-card', { hasText: 'Delete Me' })
              .locator('.delete-category-btn').click();

    // 4. Verify the CARD is gone
    await expect(page.locator('.category-card', { hasText: 'Delete Me' })).toHaveCount(0);
  });

// --- TEST 4: View tasks inside a category ---
  test('User can View Tasks inside a Category and go Back', async ({ page }) => {
    const drillDownName = 'DrillDown View';

    // 1. Create category
    await page.click('.add-category-btn');
    await page.fill('#new-category-name', drillDownName);
    await page.click('#submit-category');

await expect(page.locator('#category-preview')).toBeHidden();

    // 2. Click the Title (H4) inside that SPECIFIC card
    await page.locator('.category-card')
              .filter({ hasText: drillDownName }) // Matches ONLY the new card
              .locator('h4')
              .click();
    // 3. Verify Grid is hidden & Tasks are visible
    await expect(page.locator('.categories-grid')).toBeHidden();
    await expect(page.locator('#category-tasks-section')).toBeVisible();
    
    // Verify Title matches
    await expect(page.locator('#selected-category-title')).toContainText(`Tasks in ${drillDownName}`);

    // 4. Click "Back to Categories"
    await page.click('#backToCategoriesBtn');

    // 5. Verify we are back at the Grid
    await expect(page.locator('#category-tasks-section')).toBeHidden();
    await expect(page.locator('.categories-grid')).toBeVisible();
  });

});