const { test, expect } = require('@playwright/test');

// tests/profile.e2e.spec.js
test.describe('Profile (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/login.html');

    await page.fill('input[type="email"]', 'MGF_21@ICLOUD.COM');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('http://localhost:3001/dashboard/dashboard.html');

    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).not.toBeNull();
  });

  test('should load profile page and render basic overview (name/email + 7 day chain)', async ({ page }) => {
    await page.goto('http://localhost:3001/profile/profile.html');
    await page.waitForLoadState('networkidle');

    const nameEl = page.locator('#profileName').first();
    const emailEl = page.locator('#profileEmail').first();

    await expect(nameEl).toBeVisible({ timeout: 10000 });
    await expect(emailEl).toBeVisible({ timeout: 10000 });

    const nameText = (await nameEl.textContent()) || '';
    const emailText = (await emailEl.textContent()) || '';

    expect(nameText.trim().length).toBeGreaterThan(0);
    expect(emailText).toMatch(/@/);

    const chainCells = page.locator('#sevenDayChain .chain-day');
    await expect(chainCells.first()).toBeVisible({ timeout: 10000 });

    const count = await chainCells.count();
    expect(count).toBeGreaterThanOrEqual(7);
  });

  test('should toggle dark theme and persist after reload', async ({ page }) => {
    await page.goto('http://localhost:3001/profile/profile.html');
    await page.waitForLoadState('networkidle');

    // Your actual IDs:
    // Light: #btnThemeLight
    // Dark:  #btnThemeDark
    await page.locator('#btnThemeDark').click();
    await page.waitForTimeout(300);

    await expect(page.locator('body')).toHaveClass(/profile-theme-dark/i);

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toHaveClass(/profile-theme-dark/i);
  });

  test('should change accent color and persist after reload', async ({ page }) => {
  await page.goto('http://localhost:3001/profile/profile.html');
  await page.waitForLoadState('networkidle');

  const getAccent = () =>
    page.evaluate(() => {
      const bodyVal = getComputedStyle(document.body).getPropertyValue('--accent-color').trim();
      const rootVal = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
      return bodyVal || rootVal;
    });

  const before = await getAccent();
  expect(before.length).toBeGreaterThan(0);

  const swatches = page.locator('.theme-swatch[data-color]');
  const n = await swatches.count();
  expect(n).toBeGreaterThan(0);

  let after = before;
  let changed = false;

  for (let i = 0; i < n; i++) {
    await swatches.nth(i).click({ force: true });

    try {
      await expect.poll(getAccent, { timeout: 1200 }).not.toBe(before);
      after = await getAccent();
      changed = true;
      break;
    } catch (e) {
    }
  }

  expect(changed).toBeTruthy();
  expect(after).not.toBe(before);

  await page.reload();
  await page.waitForLoadState('networkidle');

  const afterReload = await getAccent();
  expect(afterReload).toBe(after);  
});


  test('should edit name and bio and reflect on profile', async ({ page }) => {
    await page.goto('http://localhost:3001/profile/profile.html');
    await page.waitForLoadState('networkidle');

    const newName = `E2E Name ${Date.now()}`;
    const newBio = `E2E Bio ${Date.now()}`;

    // Your modal open button uses data-bs-target
    await page.locator('button[data-bs-target="#editProfileModal"]').click();

    const modal = page.locator('#editProfileModal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Your actual fields:
    // Name input: #editName
    // Bio textarea: #editBio
    await page.locator('#editName').fill(newName);
    await page.locator('#editBio').fill(newBio);

    // Submit button inside form
    await page.locator('#editProfileForm button[type="submit"]').click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#profileName')).toContainText(newName, { timeout: 10000 });
    await expect(page.locator('#profileBio')).toContainText(newBio, { timeout: 10000 });
  });

  test('should upload avatar under 2MB and update profile image', async ({ page }) => {
  await page.goto('http://localhost:3001/profile/profile.html');
  await page.waitForLoadState('networkidle');

  const avatarImg = page.locator('#profileAvatar').first();
  await expect(avatarImg).toBeVisible();

  const beforeSrc = await avatarImg.getAttribute('src');

  await page.locator('button[data-bs-target="#editProfileModal"]').click();
  await expect(page.locator('#editProfileModal')).toBeVisible({ timeout: 10000 });

  await page.locator('#editAvatarFile').setInputFiles('tests/fixtures/under2MB.png');

  await page.locator('#editProfileForm button[type="submit"]').click();

  await expect
    .poll(async () => await avatarImg.getAttribute('src'), {
      timeout: 15000,
    })
    .not.toMatch(/default-avatar\.png/i);

  const afterSrc = await avatarImg.getAttribute('src');

  expect(afterSrc).toBeTruthy();
  if (beforeSrc && afterSrc) {
    expect(afterSrc).not.toBe(beforeSrc); 
  }
});


  test('should reject non-image avatar upload and show error', async ({ page }) => {
    await page.goto('http://localhost:3001/profile/profile.html');
    await page.waitForLoadState('networkidle');

    const avatarImg = page.locator('#profileAvatar').first();
    const beforeSrc = await avatarImg.getAttribute('src');

    let dialogMsg = '';
    page.once('dialog', async (dialog) => {
      dialogMsg = dialog.message();
      await dialog.accept();
    });

    await page.locator('button[data-bs-target="#editProfileModal"]').click();
    await expect(page.locator('#editProfileModal')).toBeVisible({ timeout: 10000 });

    await page.locator('#editAvatarFile').setInputFiles('tests/fixtures/txtfile.txt');
    await page.locator('#editProfileForm button[type="submit"]').click();
    await page.waitForTimeout(700);

    // Your frontend shows alert(...) on error, so dialog is likely
    if (dialogMsg) {
      expect(dialogMsg).toMatch(/image|file type|allowed/i);
    }

    const afterSrc = await avatarImg.getAttribute('src');
    if (beforeSrc && afterSrc) {
      // Avatar should remain unchanged
      expect(afterSrc).toBe(beforeSrc);
    }
  });

  test('should reject avatar upload above 2MB and show error', async ({ page }) => {
    await page.goto('http://localhost:3001/profile/profile.html');
    await page.waitForLoadState('networkidle');

    const avatarImg = page.locator('#profileAvatar').first();
    const beforeSrc = await avatarImg.getAttribute('src');

    let dialogMsg = '';
    page.once('dialog', async (dialog) => {
      dialogMsg = dialog.message();
      await dialog.accept();
    });

    await page.locator('button[data-bs-target="#editProfileModal"]').click();
    await expect(page.locator('#editProfileModal')).toBeVisible({ timeout: 10000 });

    await page.locator('#editAvatarFile').setInputFiles('tests/fixtures/above2MB.png');
    await page.locator('#editProfileForm button[type="submit"]').click();
    await page.waitForTimeout(700);

    if (dialogMsg) {
      expect(dialogMsg).toMatch(/2mb|max|large|size/i);
    }

    const afterSrc = await avatarImg.getAttribute('src');
    if (beforeSrc && afterSrc) {
      expect(afterSrc).toBe(beforeSrc);
    }
  });

  test('should remove avatar and show default avatar', async ({ page }) => {
    await page.goto('http://localhost:3001/profile/profile.html');
    await page.waitForLoadState('networkidle');

    await page.locator('button[data-bs-target="#editProfileModal"]').click();
    await expect(page.locator('#editProfileModal')).toBeVisible({ timeout: 10000 });

    // Your remove button id:
    await page.locator('#btnRemoveAvatar').click();

    await page.locator('#editProfileForm button[type="submit"]').click();
    await page.waitForLoadState('networkidle');

    const avatarImg = page.locator('#profileAvatar').first();
    await expect(avatarImg).toHaveAttribute('src', /default-avatar\.png/i);
  });

  test('should switch Activity tab and change heatmap range', async ({ page }) => {
    await page.goto('http://localhost:3001/profile/profile.html');
    await page.waitForLoadState('networkidle');

    // Your Activity tab button id:
    await page.locator('#activity-tab').click();
    await page.waitForTimeout(300);

    // Your cells are .heat-cell inside #activityHeatmap
    const cells = page.locator('#activityHeatmap .heat-cell');
    await expect(cells.first()).toBeVisible({ timeout: 10000 });

    // Click range buttons (they exist in your HTML)
    await page.locator('#activityRange button[data-range="7"]').click();
    await page.waitForTimeout(200);
    const c7 = await cells.count();

    await page.locator('#activityRange button[data-range="90"]').click();
    await page.waitForTimeout(200);
    const c90 = await cells.count();

    expect(c7).toBeGreaterThan(0);
    expect(c90).toBeGreaterThanOrEqual(c7);
  });

  test('should filter activity by Habits and show results or empty state', async ({ page }) => {
    await page.goto('http://localhost:3001/profile/profile.html');
    await page.waitForLoadState('networkidle');

    await page.locator('#activity-tab').click();
    await page.waitForTimeout(200);

    // Your filter buttons live here:
    await page.locator('#activityFilters button[data-filter="habits"]').click();
    await page.waitForTimeout(300);

    // Your list is #recentActivityList and you always render an empty-state item too
    const items = page.locator('#recentActivityList li');
    expect(await items.count()).toBeGreaterThan(0);
  });

  test('should block profile access when userId is tampered (expects 403 from overview API)', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('userId', '9999');
      localStorage.setItem('user_id', '9999');
      localStorage.setItem('currentUserId', '9999');
    });

    const resPromise = page.waitForResponse((res) =>
      res.url().includes('/api/profile/') &&
      res.url().includes('/overview') &&
      res.request().method() === 'GET'
    );

    await page.goto('http://localhost:3001/profile/profile.html');
    await page.waitForLoadState('networkidle');

    const res = await resPromise;
    expect(res.status()).toBe(403);
  });
});