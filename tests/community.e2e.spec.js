const { test, expect } = require('@playwright/test');

test.describe('Community Board E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Shared login and navigation logic
    await page.goto('http://localhost:3001/login.html'); 
    await page.fill('input[type="email"]', 'MGF_21@ICLOUD.COM'); 
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3001/dashboard/dashboard.html');

    // Verify token exists in localStorage
    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).not.toBeNull();

    await page.goto('http://localhost:3001/community/community.html');
  });

  test('should create a new sticky note', async ({ page }) => {
    await page.click('button:has-text("Post a Note")');
    await page.fill('#noteContent', 'New Note for Testing');
    await page.click('button:has-text("Post to Board")');
    
    // Verify visibility
    await expect(page.locator('.sticky-note').first()).toContainText('New Note for Testing');
  });

  test('should toggle a reaction (like/unlike)', async ({ page }) => {
    const note = page.locator('.sticky-note').first();
    const heartBtn = note.locator('.heart-icon');
    const countSpan = note.locator('span[id^="count-"]');

    const initialCount = parseInt(await countSpan.innerText());
    
    // Like the note
    await heartBtn.click();
    await expect(countSpan).toHaveText((initialCount + 1).toString());
    await expect(heartBtn).toContainText('❤️');

    // Unlike the note (Toggle logic)
    await heartBtn.click();
    await expect(countSpan).toHaveText(initialCount.toString());
    await expect(heartBtn).toContainText('🤍');
  });

test('should edit an existing note', async ({ page }) => {
    const note = page.locator('.sticky-note').first();
    
    // Click the pencil icon
    await note.locator('.bi-pencil').click();
    
    // 2. Verify State Transition: Check that the Modal Title and Button text updated correctly
    const modalTitle = page.locator('#modalTitle');
    const submitBtn = page.locator('#submitBtn');

    await expect(modalTitle).toHaveText('Edit Encouragement'); 
    await expect(submitBtn).toHaveText('Save Changes');           

    // Fill in the new content
    const textarea = page.locator('#noteContent');
    await textarea.clear(); 
    await textarea.fill('Testing the edit flow!');

    // Click Save and wait for it to close
    await submitBtn.click();
    await expect(page.locator('#addNoteModal')).not.toBeVisible();

    // Verify update on the board
    await expect(note).toContainText('Testing the edit flow!');
});
test('should delete a sticky note after confirmation', async ({ page }) => {
    // 1. Ensure at least one note exists to delete
    const noteToDelete = page.locator('.sticky-note').first();
    const noteId = await noteToDelete.getAttribute('id');
    await expect(noteToDelete).toBeVisible();

    // 2. Capture the content to verify it's gone later
    const noteText = await noteToDelete.locator('.note-body p').innerText();

    // 3. Setup a listener for the window.confirm() dialog
    page.once('dialog', async dialog => {
        expect(dialog.message()).toContain('Are you sure you want to delete this word of encouragement?');
        await dialog.accept(); // Clicks "OK"
    });

    // 4. Click the trash icon
    await noteToDelete.locator('.bi-trash').click();

    // 5. Verify the note is removed from the DOM
    await expect(page.locator(`#${noteId}`)).toHaveCount(0);
});
});