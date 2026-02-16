// @ts-check
import { test, expect } from '@playwright/test';
const BASE_URL = 'http://127.0.0.1:3001';
test.describe('Focus Mode Integration', () => {

  // Login & Navigate to Focus Mode before all tests
  test.beforeEach(async ({ page }) => {
    // 1. Login
    await page.goto(`${BASE_URL}/login.html`);
    await page.fill('#email', 'MGF_21@ICLOUD.COM'); 
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    // 2. Dashboard Integration (button to focus mode)
    await expect(page).toHaveURL(/dashboard\.html/);
    await page.locator('a[href="../focus-mode/focus.html"]').click();

    // 3. Verify we are at the Menu
    await expect(page).toHaveURL(/focus-mode\/focus\.html/);
    await expect(page.locator('#menu-view')).toBeVisible();
  });

  // Mathca Latte Test
  test('User can select Matcha and see 30:00 timer', async ({ page }) => {
    await page.locator('text=Matcha Latte').click();
    
    // Check View
    await expect(page.locator('#menu-view')).toBeHidden();
    await expect(page.locator('#focus-view')).toBeVisible();

    // Check time accuracy
    await expect(page.locator('#timer-display')).toHaveText('30:00');
  });

  // Espresso Test
  test('User can select Espresso and see correct timer', async ({ page }) => {
    await page.locator('text=Espresso').click();

    await expect(page.locator('#menu-view')).toBeHidden();
    await expect(page.locator('#focus-view')).toBeVisible();

    await expect(page.locator('#timer-display')).toHaveText('05:00'); 
  });

  // Ice Water Test
  test('User can select Ice Water and see correct timer', async ({ page }) => {
    await page.locator('text=Ice Water').click();

    await expect(page.locator('#menu-view')).toBeHidden();
    await expect(page.locator('#focus-view')).toBeVisible();

    await expect(page.locator('#timer-display')).toHaveText('60:00'); 
  });

  // Give Up Functionality Test
  test('User can Give Up (Espresso) and Try Again', async ({ page }) => {
    // Start Espresso
    await page.locator('text=Espresso').click();

    // Confirm give up
    page.on('dialog', dialog => dialog.accept()); 

    // Click give up
    const actionBtn = page.locator('.btn-giveup');
    await actionBtn.click();

    // Verify liquid draining animation
    await expect(page.locator('#liquid')).toHaveCSS('height', '0px');

    // Verify button changes to "Try Again"
    await expect(actionBtn).toHaveText('Try Again');

    // Click "Try Again"
    await actionBtn.click();

    // Verify return to menu
    await expect(page.locator('#menu-view')).toBeVisible();
    await expect(page.locator('#focus-view')).toBeHidden();
  });

  test('User can buy and equip all themes in one session', async ({ page }) => {
    test.setTimeout(120000);
    const themes = [
        { name: 'Matcha', cssClass: /theme-matcha/ },
        { name: 'Cyberpunk City', cssClass: /theme-cyberpunk/ },
        { name: 'Midnight Blue', cssClass: /theme-midnight/ }
    ];

    for (const theme of themes) {
        // Wait for BOTH responses
        const shopResponse = page.waitForResponse(r => r.url().includes('/api/shop/themes') && r.status() === 200);
        const inventoryResponse = page.waitForResponse(r => r.url().includes('/api/shop/inventory') && r.status() === 200);
        
        await page.click('#open-shop-btn');
        
        // Wait for both to finish before touching the UI
        await Promise.all([shopResponse, inventoryResponse]);


        const card = page.locator('.theme-card', { hasText: theme.name });
        const getBtn = () => card.locator('button');
        await expect(card).toBeVisible(); 
        
        await card.scrollIntoViewIfNeeded();

        // 3. Buy Theme (Only wait for response IF we are clicking 'Buy')
        const btnText = await getBtn().innerText();
        if (btnText.includes('Buy')) {
            console.log(`Buying ${theme.name}...`);
            // Create the promise first
            const [response] = await Promise.all([
                page.waitForResponse(r => r.url().includes('/api/shop/buy')), 
                getBtn().click()
            ]);

            // This prints the status if it fails!
            console.log(`Buy Request Status: ${response.status()}`);
            expect(response.ok()).toBeTruthy(); // Fails fast if not 200 OK
            
            await expect(getBtn()).toHaveText('Equip');
        } else {
             console.log(`${theme.name} already owned. Skipping purchase.`);
        }

        // 4. Equip Theme (Always wait for this because we always click it)
        const [equipResponse] = await Promise.all([
            page.waitForResponse(r => r.url().includes('/api/shop/equip')),
            getBtn().click()
        ]);

        // 5. Verify & Reset UI
        await page.waitForTimeout(500); // Small visual wait
        await page.click('#close-shop');
        
        await expect(page.locator('body')).toHaveClass(theme.cssClass);
    }
  });

    // Turn Off Focus Mode Test
  test('User can Turn Off Focus Mode and return to Dashboard', async ({ page }) => {
    // Verify the button exists
    const turnOffBtn = page.locator('.btn-home');
    await expect(turnOffBtn).toBeVisible();

    // Click it
    await turnOffBtn.click();

    // Verify user is back on the Dashboard
    await expect(page).toHaveURL(/dashboard\/dashboard\.html/);
  });
});
