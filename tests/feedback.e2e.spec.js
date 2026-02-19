const { test, expect } = require('@playwright/test');

test.describe('Feedback Form Feature', () => {

    //Login and Navigation
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

        // 5. Navigate to Feedback Page 
        await page.goto('http://localhost:3001/feedback/feedback.html');
        
        // Ensure the form is visible before starting
        await expect(page.locator('#feedbackForm')).toBeVisible();
    });

    // Successful submission
    test('User can successfully submit a General Comment', async ({ page }) => {
        const feedbackText = `This is a automated test comment generated at ${Date.now()}`;

        // 1. Select Feedback Type
        await page.selectOption('#type', 'GENERAL_COMMENT');

        // 2. Fill Description
        await page.fill('#description', feedbackText);

        // 3. Verify API call
        const [response] = await Promise.all([
            page.waitForResponse(res => 
                res.url().includes('/api/feedback') && res.status() === 201
            ),
            page.click('#submitFeedbackBtn')
        ]);

        // 4. Verify UI Success State
        const successMessage = page.locator('#feedback-message');
        await expect(successMessage).toBeVisible();
        await expect(successMessage).toHaveClass(/alert-success/);
        await expect(successMessage).toContainText('successfully submitted');

        // 5. Verify Form Reset
        await expect(page.locator('#description')).toHaveValue('');
    });

    // Bug report submission
    test('User can submit a Bug Report with structured data', async ({ page }) => {
        // 1. Select Bug Report
        await page.selectOption('#type', 'BUG');

        // 2. Fill Details
        await page.fill('#description', 'Automated Bug Report: Sidebar icons are not loading properly.');

        // 3. Submit
        await page.click('#submitFeedbackBtn');

        // 4. Verify Success
        await expect(page.locator('#feedback-message')).toContainText('successfully submitted');
    });

    test('User can submit a Feature Request', async ({ page }) => {
        const featureIdea = 'Feature Request: Add a dark mode toggle to the dashboard.';

        // 1. Select Feature Request from the dropdown
        await page.selectOption('#type', 'FEATURE_REQUEST');

        // 2. Fill in the details
        await page.fill('#description', featureIdea);

        // 3. Submit and verify the 201 response
        const [response] = await Promise.all([
            page.waitForResponse(res => 
                res.url().includes('/api/feedback') && res.status() === 201
            ),
            page.click('#submitFeedbackBtn')
        ]);

        // 4. Verify the UI reflects the success state
        await expect(page.locator('#feedback-message')).toContainText('successfully submitted');
    });

    // Verify empty description will not submit
    test('Submit button disables during network request', async ({ page }) => {
    await page.fill('#description', 'Testing button states');

    // 1. Intercept the network request and delay it by 1 second
    await page.route('**/api/feedback', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000)); 
        await route.continue();
    });

    // 2. Click the button
    await page.click('#submitFeedbackBtn');

    // 3. Verify the state while the request is "pending"
    const submitBtn = page.locator('#submitFeedbackBtn');
    await expect(submitBtn).toBeDisabled();
    await expect(submitBtn).toHaveText('Submitting...');
});
});
