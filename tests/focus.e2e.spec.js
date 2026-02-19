// @ts-check
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3001';

test.describe('Focus Mode Integration', () => {

  test.beforeEach(async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

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

  test('User can select Matcha and see 30:00 timer', async ({ page }) => {
    await page.locator('text=Matcha Latte').click();

    await expect(page.locator('#menu-view')).toBeHidden();
    await expect(page.locator('#focus-view')).toBeVisible();
    await expect(page.locator('#timer-display')).toHaveText('30:00');
  });

  test('User can select Espresso and see correct timer', async ({ page }) => {
    await page.locator('text=Espresso').click();

    await expect(page.locator('#menu-view')).toBeHidden();
    await expect(page.locator('#focus-view')).toBeVisible();
    await expect(page.locator('#timer-display')).toHaveText('05:00');
  });

  test('User can select Ice Water and see correct timer', async ({ page }) => {
    await page.locator('text=Ice Water').click();

    await expect(page.locator('#menu-view')).toBeHidden();
    await expect(page.locator('#focus-view')).toBeVisible();
    await expect(page.locator('#timer-display')).toHaveText('60:00');
  });

  test('User can Give Up (Espresso) and Try Again', async ({ page }) => {
    await page.locator('text=Espresso').click();

    const actionBtn = page.locator('.btn-giveup');
    await actionBtn.click();

    await expect(page.locator('#liquid')).toHaveCSS('height', '0px');
    await expect(actionBtn).toHaveText('Try Again');

    await actionBtn.click();

    await expect(page.locator('#menu-view')).toBeVisible();
    await expect(page.locator('#focus-view')).toBeHidden();
  });

  test('User can buy and equip all themes in one session', async ({ page }) => {
    test.setTimeout(180000);

    await page.request.post(`${BASE_URL}/api/test/reset`);

    const themes = [
      { name: 'Matcha', cssClass: /theme-matcha/ },
      { name: 'Cyberpunk City', cssClass: /theme-cyberpunk/ },
      { name: 'Midnight Blue', cssClass: /theme-midnight/ }
    ];

    for (const theme of themes) {
      // Open shop and wait for data load
      const shopResponse = page.waitForResponse(r =>
        r.url().includes('/api/shop/themes') && r.status() === 200
      );
      const inventoryResponse = page.waitForResponse(r =>
        r.url().includes('/api/shop/inventory') && r.status() === 200
      );

      await page.click('#open-shop-btn');
      await Promise.all([shopResponse, inventoryResponse]);

      const card = page.locator('.theme-card', { hasText: theme.name });
      const btn = card.locator('button');

      await expect(card).toBeVisible();
      await btn.scrollIntoViewIfNeeded();
      await expect(btn).toBeVisible();

      const btnText = (await btn.innerText()).trim().replace(/\s+/g, ' ').toLowerCase();

      if (btnText.includes('buy')) {
        const [buyResp] = await Promise.all([
          page.waitForResponse(r =>
            r.url().includes('/api/shop/buy') &&
            r.request().method() === 'POST'
          ),
          btn.click()
        ]);

        expect(buyResp.ok()).toBeTruthy();

        await expect(btn).toHaveText(/equip/i, { timeout: 10000 });
      }

      const [equipResp] = await Promise.all([
        page.waitForResponse(r =>
          r.url().includes('/api/shop/equip') &&
          r.request().method() === 'POST'
        ),
        btn.click()
      ]);

      expect(equipResp.ok()).toBeTruthy();

      await page.click('#close-shop');
      await expect(page.locator('body')).toHaveClass(theme.cssClass);
    }
  });

  test('User can Turn Off Focus Mode and return to Dashboard', async ({ page }) => {
    const turnOffBtn = page.locator('.btn-home');
    await expect(turnOffBtn).toBeVisible();

    await turnOffBtn.click();

    await expect(page).toHaveURL(/dashboard\/dashboard\.html/);
  });
});
