// @ts-check
const { test, expect } = require('@playwright/test');

test.describe.configure({ mode: 'serial' });

test.describe('Focus Mode & Shop System', () => {

  test.beforeEach(async ({ page, request }) => {
    page.on('dialog', dialog => dialog.accept());

    // 1. Reset Database (Gives test user 5000 points)
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
    
    // list of themes to test
    const themes = [
        { name: 'Matcha', cssClass: /theme-matcha/ },
        { name: 'Cyberpunk City', cssClass: /theme-cyberpunk/ },
        { name: 'Midnight Blue', cssClass: /theme-midnight/ }
    ];

    // Loop through themes
    for (const theme of themes) {
        // 1. Open Shop
        const shopResponse = page.waitForResponse(resp => 
            resp.url().includes('/api/shop/themes') && resp.status() === 200
        );
        await page.click('#open-shop-btn');
        await shopResponse;

        // 2. Find the card
        const card = page.locator('.theme-card', { hasText: theme.name });
        const getBtn = () => card.locator('button');
        
        await card.scrollIntoViewIfNeeded();

        // 3. Buy Theme
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
        // We close the shop to check the background color
        await page.waitForTimeout(500); 
        await page.click('#close-shop');
        
        await expect(page.locator('body')).toHaveClass(theme.cssClass);
    }
  });

});