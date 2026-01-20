const { test, expect } = require('@playwright/test');

// Group all password reset tests
test.describe('Password Reset Feature (E2E)', () => {

    test('should display forgot password page with form', async ({ page }) => {
        await page.goto('http://localhost:3001/forgot-password.html');
        
        // Check page title
        await expect(page).toHaveTitle(/Forgot Password/);
        
        // Check form elements are visible
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
        await expect(page.locator('button:has-text("Send Reset Link")')).toBeVisible();
        
        // Check navigation links
        await expect(page.locator('a:has-text("Login here")')).toBeVisible();
        await expect(page.locator('a:has-text("Register here")')).toBeVisible();
    });

    test('should request password reset with valid email', async ({ page }) => {
        await page.goto('http://localhost:3001/forgot-password.html');
        
        // Fill in email
        await page.fill('input[type="email"]', 'MGF_21@ICLOUD.COM');
        
        // Submit form
        await page.click('button[type="submit"]');
        
        // Wait for response
        await page.waitForLoadState('networkidle');
        
        // Check for success message (in development, it shows the reset URL)
        const successMessage = page.locator('#successMessage');
        await expect(successMessage).toBeVisible({ timeout: 5000 });
        
        // In development mode, check if reset URL is shown
        const messageText = await successMessage.textContent();
        expect(messageText).toContain('reset');
    });

    test('should show error for invalid email format', async ({ page }) => {
        await page.goto('http://localhost:3001/forgot-password.html');
        
        // Try to submit with invalid email
        await page.fill('input[type="email"]', 'invalid-email');
        await page.click('button[type="submit"]');
        
        // HTML5 validation should prevent submission
        // Check if email input has validation error
        const emailInput = page.locator('input[type="email"]');
        const isValid = await emailInput.evaluate((el) => {
            const input = el instanceof HTMLInputElement ? el : null;
            return input ? input.validity.valid : false;
        });
        expect(isValid).toBe(false);
    });

    test('should display reset password page with valid token', async ({ page }) => {
        // First, get a valid reset token by requesting password reset
        const response = await page.request.post('http://localhost:3001/api/password-reset/request', {
            data: { email: 'MGF_21@ICLOUD.COM' }
        });
        
        const responseData = await response.json();
        
        // Only proceed if we got a token
        if (responseData.token) {
            const resetToken = responseData.token;
            await page.goto(`http://localhost:3001/reset-password.html?token=${resetToken}`);
            await page.waitForLoadState('networkidle');
            
            // Wait for token verification to complete
            await page.waitForTimeout(1000);
            
            // Check page loads
            await expect(page).toHaveTitle(/Reset Password/);
            
            // Check form elements are visible (form should be visible with valid token)
            await expect(page.locator('input#newPassword')).toBeVisible({ timeout: 5000 });
            await expect(page.locator('input#confirmPassword')).toBeVisible();
            await expect(page.locator('button:has-text("Reset Password")')).toBeVisible();
        }
    });

    test('should show error for invalid or missing token', async ({ page }) => {
        await page.goto('http://localhost:3001/reset-password.html?token=invalid-token-123');
        
        // Wait for page to load and token verification to complete
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        // The page should show an error message for invalid token
        const errorMessage = page.locator('#errorMessage');
        // Check if error message has text content
        await expect(errorMessage).toContainText(/Invalid|expired|token/i, { timeout: 5000 });
        
        // Form should be hidden
        const form = page.locator('#resetPasswordForm');
        await expect(form).toHaveCSS('display', 'none');
    });

    test('should validate password confirmation match', async ({ page }) => {
        // Get a valid token first
        const response = await page.request.post('http://localhost:3001/api/password-reset/request', {
            data: { email: 'MGF_21@ICLOUD.COM' }
        });
        
        const responseData = await response.json();
        
        if (responseData.token) {
            await page.goto(`http://localhost:3001/reset-password.html?token=${responseData.token}`);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000); // Wait for token verification
            
            // Check form is visible before proceeding
            const form = page.locator('#resetPasswordForm');
            const isFormVisible = await form.evaluate(el => window.getComputedStyle(el).display !== 'none');
            
            if (isFormVisible) {
                // Fill in passwords that don't match
                await page.fill('input#newPassword', 'newpassword123');
                await page.fill('input#confirmPassword', 'differentpassword');
                
                // Try to submit
                await page.click('button[type="submit"]');
                
                // Wait for validation error
                await page.waitForTimeout(500);
                
                // Check if error message appears
                const errorMessage = page.locator('#errorMessage');
                await expect(errorMessage).toContainText(/match/i, { timeout: 3000 });
            }
        }
    });

    test('should validate minimum password length', async ({ page }) => {
        // Get a valid token first
        const response = await page.request.post('http://localhost:3001/api/password-reset/request', {
            data: { email: 'MGF_21@ICLOUD.COM' }
        });
        
        const responseData = await response.json();
        
        if (responseData.token) {
            await page.goto(`http://localhost:3001/reset-password.html?token=${responseData.token}`);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000); // Wait for token verification
            
            // Check form is visible
            const form = page.locator('#resetPasswordForm');
            const isFormVisible = await form.evaluate(el => window.getComputedStyle(el).display !== 'none');
            
            if (isFormVisible) {
                // Fill in password that's too short
                await page.fill('input#newPassword', '12345'); // 5 characters, min is 6
                await page.fill('input#confirmPassword', '12345');
                
                // Try to submit - should show error
                await page.click('button[type="submit"]');
                await page.waitForTimeout(500);
                
                // Check for error message about password length
                const errorMessage = page.locator('#errorMessage');
                await expect(errorMessage).toContainText(/6|characters|length/i, { timeout: 3000 });
            }
        }
    });

    test('should navigate to login from forgot password page', async ({ page }) => {
        await page.goto('http://localhost:3001/forgot-password.html');
        
        // Click login link
        await page.click('a:has-text("Login here")');
        
        // Should navigate to login page
        await expect(page).toHaveURL(/login\.html/);
    });

    test('should navigate to forgot password from login page', async ({ page }) => {
        await page.goto('http://localhost:3001/login.html');
        
        // Click forgot password link
        await page.click('a:has-text("Forgot Password?")');
        
        // Should navigate to forgot password page
        await expect(page).toHaveURL(/forgot-password\.html/);
    });

    test('should navigate to forgot password from register page', async ({ page }) => {
        await page.goto('http://localhost:3001/register.html');
        
        // Click forgot password link in footer
        await page.click('a:has-text("Forgot Password?")');
        
        // Should navigate to forgot password page
        await expect(page).toHaveURL(/forgot-password\.html/);
    });

    test('should complete full password reset flow', async ({ page }) => {
        // Step 1: Request password reset
        await page.goto('http://localhost:3001/forgot-password.html');
        await page.fill('input[type="email"]', 'MGF_21@ICLOUD.COM');
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
        
        // Step 2: Get reset token from API response (in development mode)
        const response = await page.request.post('http://localhost:3001/api/password-reset/request', {
            data: { email: 'MGF_21@ICLOUD.COM' }
        });
        
        const responseData = await response.json();
        expect(response.status()).toBe(200);
        
        // If token is returned (development mode), use it
        if (responseData.token) {
            const resetToken = responseData.token;
            
            // Step 3: Navigate to reset password page with token
            await page.goto(`http://localhost:3001/reset-password.html?token=${resetToken}`);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000); // Wait for token verification
            
            // Step 4: Fill in new password (check form is visible first)
            const form = page.locator('#resetPasswordForm');
            await expect(form).toBeVisible({ timeout: 5000 });
            
            const newPassword = `TestPassword${Date.now()}`;
            await page.fill('input#newPassword', newPassword);
            await page.fill('input#confirmPassword', newPassword);
            
            // Step 5: Submit reset
            await page.click('button[type="submit"]');
            await page.waitForLoadState('networkidle');
            
            // Step 6: Should redirect to login page
            await expect(page).toHaveURL(/login\.html/, { timeout: 5000 });
            
            // Step 7: Verify login works with new password
            await page.fill('input[type="email"]', 'MGF_21@ICLOUD.COM');
            await page.fill('input[type="password"]', newPassword);
            await page.click('button[type="submit"]');
            
            // Should successfully login
            await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
        }
    });

    test('should prevent reusing the same reset token', async ({ page }) => {
        // Request password reset
        const response = await page.request.post('http://localhost:3001/api/password-reset/request', {
            data: { email: 'MGF_21@ICLOUD.COM' }
        });
        
        const responseData = await response.json();
        
        if (responseData.token) {
            const resetToken = responseData.token;
            
            // Use token first time
            await page.goto(`http://localhost:3001/reset-password.html?token=${resetToken}`);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            
            const newPassword = `TestPassword${Date.now()}`;
            await page.fill('input#newPassword', newPassword);
            await page.fill('input#confirmPassword', newPassword);
            await page.click('button[type="submit"]');
            await page.waitForLoadState('networkidle');
            
            // Try to use the same token again
            await page.goto(`http://localhost:3001/reset-password.html?token=${resetToken}`);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000); // Wait for token verification
            
            // Should show error that token is invalid/used
            const errorMessage = page.locator('#errorMessage');
            await expect(errorMessage).toContainText(/Invalid|expired|used/i, { timeout: 5000 });
        }
    });
});
