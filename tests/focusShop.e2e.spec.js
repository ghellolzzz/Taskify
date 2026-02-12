// @ts-check
const { test, expect } = require('@playwright/test');

test.describe.configure({ mode: 'serial' });

test.describe('Focus Mode & Shop System', () => {

  test.beforeEach(async ({ page, request }) => {
    page.on('dialog', dialog => dialog.accept());

    await request.post('http://localhost:3001/api/test/reset');

    // 2. Login
    await page.goto('http://localhost:3001/login.html');
    await page.fill('#email', 'MGF_21@ICLOUD.COM'); 
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    
    // 3. Go to Focus Mode
    await page.getByRole('link', { name: 'Focus Mode' }).click();
    await expect(page).toHaveURL(/focus-mode\/focus\.html/);
  });

  test('User can buy and equip all themes in one session', async ({ page }) => {
    
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

        // 3. Buy Theme (Check if button is 'Buy' or 'Equip')
        if ((await getBtn().innerText()).includes('Buy')) {
            const buyResp = page.waitForResponse(r => r.url().includes('/api/shop/buy'));
            await getBtn().click(); 
            await buyResp; 
            await expect(getBtn()).toHaveText('Equip');
        }

        // 4. Equip Theme
        const equipResp = page.waitForResponse(r => r.url().includes('/api/shop/equip'));
        await getBtn().click();
        await equipResp;

        // 5. Verify & Reset UI
        await page.waitForTimeout(500); // Small visual wait
        await page.click('#close-shop');
        
        await expect(page.locator('body')).toHaveClass(theme.cssClass);
    }
  });

});