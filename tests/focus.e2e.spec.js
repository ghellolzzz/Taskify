const { test, expect } = require('@playwright/test');

test.describe('Focus Mode', () => {

  test('User can select Matcha and see the timer start', async ({ page }) => {
    // 1. Go to the page (Port 3001 matches your config)
    await page.goto('http://127.0.0.1:3001/focus-mode/focus.html');

    // 2. Verify Menu is visible
    await expect(page.locator('#menu-view')).toBeVisible();

    // 3. Select Matcha
    await page.locator('text=Matcha Latte').click();

    // 4. Verify View Swaps
    await expect(page.locator('#menu-view')).toBeHidden();
    await expect(page.locator('#focus-view')).toBeVisible();

    // 5. Verify Timer (Matcha is 30 mins)
    await expect(page.locator('#timer-display')).toHaveText('30:00');
  });

  test('User can Give Up', async ({ page }) => {
    // 1. Setup
    await page.goto('http://127.0.0.1:3001/focus-mode/focus.html');
    await page.locator('text=Matcha Latte').click();

    // 2. Handle the "Are you sure?" Popup
    page.on('dialog', dialog => dialog.accept()); 

    // 3. Click Give Up
    await page.click('.btn-giveup');

    // 4. Verify Liquid is gone
    await expect(page.locator('#liquid')).toHaveCSS('height', '0px'); 
  });

});