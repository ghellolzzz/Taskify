// @ts-check
import { test, expect } from '@playwright/test';

// Helper function to create a task via API (more reliable than UI)
async function createTaskViaAPI(page, taskData) {
  // Get the auth token from localStorage
  const token = await page.evaluate(() => localStorage.getItem('token'));
  
  if (!token) {
      throw new Error('No authentication token found. Please login first.');
  }

  const response = await page.request.post('http://localhost:3001/api/tasks', {
      headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
      },
      data: {
          title: taskData.title,
          description: taskData.description || '',
          priority: taskData.priority || 'Medium',
          status: taskData.status || 'Pending',
          dueDate: taskData.dueDate || null,
          categoryId: taskData.categoryId || null
      }
  });

  if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Failed to create task: ${error}`);
  }

  const result = await response.json();
  return result.task || result;
}

// Helper function to clear all tasks for the logged-in user
async function clearAllTasks(page) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  
  if (!token) {
      throw new Error('No authentication token found. Please login first.');
  }

  try {
      // Get all tasks for the user
      const getResponse = await page.request.get('http://localhost:3001/api/tasks', {
          headers: {
              'Authorization': `Bearer ${token}`
          }
      });

      if (getResponse.ok()) {
          const data = await getResponse.json();
          const tasks = data.tasks || [];
          
          // Delete each task
          for (const task of tasks) {
              try {
                  await page.request.delete(`http://localhost:3001/api/tasks/${task.id}`, {
                      headers: {
                          'Authorization': `Bearer ${token}`
                      }
                  });
              } catch (error) {
                  // Continue deleting other tasks even if one fails
                  console.log(`Failed to delete task ${task.id}:`, error.message);
              }
          }
          
          return tasks.length;
      }
  } catch (error) {
      console.log('Error clearing tasks:', error.message);
      return 0;
  }
  
  return 0;
}

// Returns a due date and day number in the CURRENT month so the task is visible when calendar opens.
function getDueDateInCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(15, lastDay);
  const dueDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { dueDateString, dayNumber: day };
}

// Helper: create tasks with due dates relative to current system date (no fixed December).
async function createTestTasks(page) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  
  if (!token) {
      throw new Error('No authentication token found. Please login first.');
  }

  const createdTasks = [];
  const now = new Date();
  
  // Helper to format date as YYYY-MM-DD
  const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  // All dates relative to current system date – no fixed December.
  // Keeps tasks on the visible calendar and lets Priority Suggestions use current date.
  const postTask = async (title, dueDateString, priority = 'Medium') => {
    const response = await page.request.post('http://localhost:3001/api/tasks', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        title: `${title} ${Date.now()}`,
        description: 'Test task created for calendar E2E tests',
        priority,
        status: 'Pending',
        dueDate: dueDateString
      }
    });
    if (response.ok()) {
      const result = await response.json();
      createdTasks.push(result.task || result);
    }
  };

  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  await postTask('Overdue 2 days ago', formatDate(twoDaysAgo), 'Medium');
  await postTask('Overdue yesterday', formatDate(yesterday), 'High');

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDate(tomorrow);
  await postTask('Tomorrow Task', tomorrowStr, 'High');
  await postTask('Tomorrow Task 2', tomorrowStr, 'Medium');
  await postTask('Tomorrow Task 3', tomorrowStr, 'Low');
  await postTask('Tomorrow Task 4', tomorrowStr, 'Medium');

  const dayAfterTomorrow = new Date(now);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  await postTask('Day After Tomorrow Task', formatDate(dayAfterTomorrow), 'Medium');
  await postTask('Next Week Task', formatDate(nextWeek), 'Low');

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 5);
  await postTask('Next Month Task', formatDate(nextMonth), 'Medium');

  return createdTasks;
}

// Group all calendar tests
test.describe('Calendar Feature (E2E)', () => {

  // Clear all tasks once before all tests start
  test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      try {
          // Login first
          await page.goto('http://localhost:3001/login.html');
          await page.fill('input[type="email"]', 'MGF_21@ICLOUD.COM');
          await page.fill('input[type="password"]', 'password123');
          await page.click('button[type="submit"]');
          await page.waitForURL('http://localhost:3001/dashboard/dashboard.html');
          
          // Clear all existing tasks to start with a clean state
          const deletedCount = await clearAllTasks(page);
          if (deletedCount > 0) {
              console.log(`Cleared ${deletedCount} existing tasks`);
          }
          await page.waitForTimeout(500);
          
          // Create test tasks with due dates relative to current system date
          await createTestTasks(page);
          await page.waitForTimeout(500);
      } catch (error) {
          console.log('Note: Setup error:', error.message);
      } finally {
          await context.close();
      }
  });

  test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('http://localhost:3001/login.html');

      await page.fill('input[type="email"]', 'MGF_21@ICLOUD.COM');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Wait for dashboard to load
      await page.waitForURL('http://localhost:3001/dashboard/dashboard.html');
  });

test('should display calendar page with month view', async ({ page }) => {
    await page.goto('http://localhost:3001/calendar/calendar.html');
    await page.waitForLoadState('networkidle');

    // Check page title
    await expect(page).toHaveTitle(/Calendar/);

    // Check calendar header elements
    await expect(page.locator('#current-month-year')).toBeVisible();
    await expect(page.locator('#prev-month')).toBeVisible();
    await expect(page.locator('#next-month')).toBeVisible();
    await expect(page.locator('#back-btn')).toBeVisible();

    // Check month view is visible
    await expect(page.locator('#month-view')).toBeVisible();
    await expect(page.locator('#calendar-grid')).toBeVisible();

    // Check weekday headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of weekdays) {
        await expect(page.locator(`.weekday:has-text("${day}")`)).toBeVisible();
    }
});

test('should display current month and year correctly', async ({ page }) => {
    await page.goto('http://localhost:3001/calendar/calendar.html');
    await page.waitForLoadState('networkidle');

    const monthYearTitle = page.locator('#current-month-year');
    await expect(monthYearTitle).toBeVisible();

    // Get current date
    const now = new Date();
    const expectedMonthYear = now.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });

    // Check that the displayed month/year matches current date
    const displayedText = await monthYearTitle.textContent();
    expect(displayedText).toContain(now.toLocaleDateString('en-US', { month: 'long' }));
    expect(displayedText).toContain(now.getFullYear().toString());
});

test('should highlight today\'s date', async ({ page }) => {
    await page.goto('http://localhost:3001/calendar/calendar.html');
    await page.waitForLoadState('networkidle');

    // Get today's date
    const today = new Date();
    const todayDay = today.getDate();

    // Find the day element with today's number that has the 'today' class
    const todayElement = page.locator(`.calendar-day.today .day-number:has-text("${todayDay}")`);
    await expect(todayElement).toBeVisible({ timeout: 5000 });
});

test('should navigate to previous month', async ({ page }) => {
    await page.goto('http://localhost:3001/calendar/calendar.html');
    await page.waitForLoadState('networkidle');

    // Get current month/year
    const currentMonthYear = await page.locator('#current-month-year').textContent();
    
    // Click previous month button
    await page.click('#prev-month');
    await page.waitForLoadState('networkidle');

    // Check that month/year has changed
    const newMonthYear = await page.locator('#current-month-year').textContent();
    expect(newMonthYear).not.toBe(currentMonthYear);
});

test('should navigate to next month', async ({ page }) => {
    await page.goto('http://localhost:3001/calendar/calendar.html');
    await page.waitForLoadState('networkidle');

    // Get current month/year
    const currentMonthYear = await page.locator('#current-month-year').textContent();
    
    // Click next month button
    await page.click('#next-month');
    await page.waitForLoadState('networkidle');

    // Check that month/year has changed
    const newMonthYear = await page.locator('#current-month-year').textContent();
    expect(newMonthYear).not.toBe(currentMonthYear);
});

test('should switch to year view when back button is clicked', async ({ page }) => {
    await page.goto('http://localhost:3001/calendar/calendar.html');
    await page.waitForLoadState('networkidle');

    // Initially, month view should be visible
    await expect(page.locator('#month-view')).toBeVisible();
    await expect(page.locator('#year-view')).toHaveCSS('display', 'none');

    // Click back button
    await page.click('#back-btn');
    await page.waitForLoadState('networkidle');

    // Year view should now be visible
    await expect(page.locator('#year-view')).toBeVisible();
    await expect(page.locator('#month-view')).toHaveCSS('display', 'none');

    // Check year title is displayed
    const yearTitle = await page.locator('#current-month-year').textContent();
    const currentYear = new Date().getFullYear().toString();
    expect(yearTitle).toBe(currentYear);
});

test('should switch back to month view from year view', async ({ page }) => {
    await page.goto('http://localhost:3001/calendar/calendar.html');
    await page.waitForLoadState('networkidle');

    // Go to year view first
    await page.click('#back-btn');
    await page.waitForLoadState('networkidle');

    // Click back button again to return to month view
    await page.click('#back-btn');
    await page.waitForLoadState('networkidle');

    // Month view should be visible again
    await expect(page.locator('#month-view')).toBeVisible();
    await expect(page.locator('#year-view')).toHaveCSS('display', 'none');
});

  test('should display tasks on calendar days with due dates', async ({ page }) => {
      const { dueDateString, dayNumber } = getDueDateInCurrentMonth();
      const taskTitle = `Calendar Test Task ${Date.now()}`;

      const createdTask = await createTaskViaAPI(page, {
        title: taskTitle,
        priority: 'High',
        dueDate: dueDateString
      });
      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBeDefined();
      await page.waitForTimeout(1000);

      const token = await page.evaluate(() => localStorage.getItem('token'));
      const verifyResponse = await page.request.get('http://localhost:3001/api/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const verifyData = await verifyResponse.json();
      const taskExists = verifyData.tasks?.some(t => t.id === createdTask.id && t.title === taskTitle);
      expect(taskExists).toBe(true);

      await page.goto('http://localhost:3001/calendar/calendar.html');
      await page.waitForResponse(response => 
        response.url().includes('/api/tasks') && response.status() === 200
      );
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('#calendar-grid')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      const taskItem = page.locator(`.calendar-day:not(.other-month):has(.day-number:has-text("${dayNumber}")) .task-item`).filter({ hasText: /Calendar Test Task/ });
      await expect(taskItem).toBeVisible({ timeout: 25000 });
  });

test('should display priority suggestions button', async ({ page }) => {
    await page.goto('http://localhost:3001/calendar/calendar.html');
    await page.waitForLoadState('networkidle');

    // Check for priority suggestions button
    const suggestionsBtn = page.locator('#show-suggestions-btn');
    await expect(suggestionsBtn).toBeVisible({ timeout: 5000 });
    await expect(suggestionsBtn).toContainText('Priority Suggestions');
});

test('should open priority suggestions panel when button is clicked', async ({ page }) => {
    await page.goto('http://localhost:3001/calendar/calendar.html');
    await page.waitForLoadState('networkidle');

    // Click priority suggestions button
    await page.click('#show-suggestions-btn');
    await page.waitForLoadState('networkidle');

    // Check that suggestions panel appears
    const suggestionsPanel = page.locator('#priority-suggestions-panel');
    await expect(suggestionsPanel).toBeVisible({ timeout: 5000 });

    // Check for panel header
    await expect(page.locator('.suggestions-header')).toBeVisible();
    await expect(page.locator('.suggestions-header h3')).toContainText('Priority Suggestions');
});

test('should close priority suggestions panel when close button is clicked', async ({ page }) => {
    await page.goto('http://localhost:3001/calendar/calendar.html');
    await page.waitForLoadState('networkidle');

    // Open suggestions panel
    await page.click('#show-suggestions-btn');
    await page.waitForLoadState('networkidle');

    // Wait for panel to appear
    await expect(page.locator('#priority-suggestions-panel')).toBeVisible({ timeout: 5000 });

    // Click close button
    await page.click('#close-suggestions');
    await page.waitForTimeout(500);

    // Panel should be removed
    await expect(page.locator('#priority-suggestions-panel')).not.toBeVisible();
});

  test('should display tasks with correct priority styling', async ({ page }) => {
      const { dueDateString, dayNumber } = getDueDateInCurrentMonth();
      const highTaskTitle = `High Priority Task ${Date.now()}`;

      const createdTask = await createTaskViaAPI(page, {
        title: highTaskTitle,
        priority: 'High',
        dueDate: dueDateString
      });
      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBeDefined();
      await page.waitForTimeout(1000);

      await page.goto('http://localhost:3001/calendar/calendar.html');
      await page.waitForResponse(response => 
        response.url().includes('/api/tasks') && response.status() === 200
      );
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('#calendar-grid')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      const highTask = page.locator(`.calendar-day:not(.other-month):has(.day-number:has-text("${dayNumber}")) .task-item.high-priority`).filter({ hasText: /High Priority Task/ });
      await expect(highTask).toBeVisible({ timeout: 20000 });
  });

  test('should allow dragging and dropping tasks to different dates', async ({ page }) => {
      const { dueDateString, dayNumber } = getDueDateInCurrentMonth();
      const taskTitle = `Draggable Task ${Date.now()}`;
      const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      let targetDayNum = dayNumber + 2;
      if (targetDayNum > lastDay) targetDayNum = Math.max(1, dayNumber - 2);
      if (targetDayNum === dayNumber) throw new Error('Need two different days in month for drag');

      const createdTask = await createTaskViaAPI(page, {
        title: taskTitle,
        priority: 'Medium',
        dueDate: dueDateString
      });
      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBeDefined();
      await page.waitForTimeout(1000);

      await page.goto('http://localhost:3001/calendar/calendar.html');
      await page.waitForResponse(response => 
        response.url().includes('/api/tasks') && response.status() === 200
      );
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('#calendar-grid')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      const suggestionsPanel = page.locator('#priority-suggestions-panel');
      if (await suggestionsPanel.isVisible().catch(() => false)) {
          await page.click('#close-suggestions').catch(() => {});
          await page.waitForTimeout(500);
      }

      const taskItem = page.locator(`.calendar-day:not(.other-month):has(.day-number:has-text("${dayNumber}")) .task-item`).filter({ hasText: /Draggable Task/ });
      await expect(taskItem).toBeVisible({ timeout: 20000 });

      const targetDayElement = page.locator(`.calendar-day:not(.other-month):has(.day-number:has-text("${targetDayNum}"))`).first();
      await targetDayElement.scrollIntoViewIfNeeded();
      await taskItem.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      const putPromise = page.waitForResponse(res => res.url().includes('/api/tasks/') && res.request().method() === 'PUT' && res.status() === 200, { timeout: 15000 }).catch(() => null);
      const sourceBox = await taskItem.boundingBox();
      const targetBox = await targetDayElement.boundingBox();
      if (sourceBox && targetBox) {
        const src = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
        const tgt = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };
        await page.mouse.move(src.x, src.y);
        await page.mouse.down();
        await page.mouse.move(tgt.x, tgt.y, { steps: 10 });
        await page.mouse.up();
      } else {
        await taskItem.dragTo(targetDayElement, { force: true });
      }
      await putPromise;
      await page.waitForTimeout(1500);

      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('#calendar-grid')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      const newDateTask = page.locator(`.calendar-day:not(.other-month):has(.day-number:has-text("${targetDayNum}")) .task-item`).filter({ hasText: /Draggable Task/ });
      await expect(newDateTask).toBeVisible({ timeout: 20000 });
  });

  test('should not allow dragging completed tasks', async ({ page }) => {
      const { dueDateString, dayNumber } = getDueDateInCurrentMonth();
      const taskTitle = `Completed Task ${Date.now()}`;

      const createdTask = await createTaskViaAPI(page, {
        title: taskTitle,
        dueDate: dueDateString
      });
      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBeDefined();
      await page.waitForTimeout(500);

      await page.goto('http://localhost:3001/tasks/task.html');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForResponse(response => response.url().includes('/api/tasks') && response.status() === 200).catch(() => null);
      const taskCard = page.locator('.task-card').filter({ hasText: /Completed Task/ });
      await expect(taskCard).toBeVisible({ timeout: 10000 });
      await taskCard.locator('button.complete-btn').click();
      await page.waitForTimeout(1000);

      await page.goto('http://localhost:3001/calendar/calendar.html');
      await page.waitForResponse(response => 
        response.url().includes('/api/tasks') && response.status() === 200
      );
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('#calendar-grid')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      const taskItem = page.locator(`.calendar-day:not(.other-month):has(.day-number:has-text("${dayNumber}")) .task-item.completed`).filter({ hasText: /Completed Task/ });
      await expect(taskItem).toBeVisible({ timeout: 20000 });
      const isDraggable = await taskItem.getAttribute('draggable');
      expect(isDraggable).toBe('false');
  });

  test('should navigate to year view and back to month view when clicking a month', async ({ page }) => {
      await page.goto('http://localhost:3001/calendar/calendar.html');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('#calendar-grid')).toBeVisible({ timeout: 10000 });

      const suggestionsPanel = page.locator('#priority-suggestions-panel');
      if (await suggestionsPanel.isVisible().catch(() => false)) {
          await page.click('#close-suggestions').catch(() => {});
          await page.waitForTimeout(500);
      }

      await page.click('#back-btn');
      await expect(page.locator('#year-view')).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);

      if (await suggestionsPanel.isVisible().catch(() => false)) {
          await page.click('#close-suggestions').catch(() => {});
          await page.waitForTimeout(500);
      }

      const januaryMonth = page.locator('.year-month:has(.year-month-title:has-text("January"))');
      await januaryMonth.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await januaryMonth.first().click({ force: true });
      await expect(page.locator('#month-view')).toBeVisible({ timeout: 5000 });
      await page.waitForLoadState('domcontentloaded');

      const monthYear = await page.locator('#current-month-year').textContent();
      expect(monthYear?.toLowerCase().trim()).toContain('january');
  });

  test('should display "more tasks" indicator when there are more than 3 tasks on a day', async ({ page }) => {
      const { dueDateString, dayNumber } = getDueDateInCurrentMonth();

      for (let i = 1; i <= 4; i++) {
          await createTaskViaAPI(page, {
            title: `Task ${i} ${Date.now()}`,
            dueDate: dueDateString
          });
      }
      await page.waitForTimeout(1000);

      await page.goto('http://localhost:3001/calendar/calendar.html');
      await page.waitForResponse(response => 
        response.url().includes('/api/tasks') && response.status() === 200
      );
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('#calendar-grid')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);

      const moreTasksIndicator = page.locator(`.calendar-day:not(.other-month):has(.day-number:has-text("${dayNumber}")) .more-tasks`);
      await expect(moreTasksIndicator).toBeVisible({ timeout: 20000 });
      await expect(moreTasksIndicator).toContainText('+');
  });

test('should handle navigation between months correctly', async ({ page }) => {
    await page.goto('http://localhost:3001/calendar/calendar.html');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#current-month-year')).toBeVisible({ timeout: 5000 });
    const header = page.locator('#current-month-year');
    const initialText = (await header.textContent())?.trim() ?? '';
    const initialMonthName = initialText.split(/[\s,]+/)[0];
    const initialYear = (initialText.match(/\d{4}/) || [])[0];

    await page.locator('#next-month').click();
    await expect(header).not.toHaveText(initialText, { timeout: 5000 });
    const afterNext = (await header.textContent())?.trim() ?? '';
    expect(afterNext).not.toBe(initialText);

    await page.locator('#prev-month').click();
    await expect(header).toHaveText(initialText, { timeout: 5000 });
    const backText = (await header.textContent())?.trim() ?? '';
    expect(backText).toContain(initialMonthName);
    if (initialYear) expect(backText).toContain(initialYear);
});

test('should display year view with all 12 months', async ({ page }) => {
    await page.goto('http://localhost:3001/calendar/calendar.html');
    await page.waitForLoadState('networkidle');

    // Go to year view
    await page.click('#back-btn');
    await page.waitForLoadState('networkidle');

    // Check that all 12 months are displayed
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
    
    for (const monthName of monthNames) {
        const monthElement = page.locator(`.year-month-title:has-text("${monthName}")`);
        await expect(monthElement).toBeVisible();
    }
});

test('should highlight today in year view', async ({ page }) => {
    await page.goto('http://localhost:3001/calendar/calendar.html');
    await page.waitForLoadState('networkidle');

    // Go to year view
    await page.click('#back-btn');
    await page.waitForLoadState('networkidle');

    // Get today's date
    const today = new Date();
    const todayDay = today.getDate();

    // Find today in the current month's grid
    const todayElement = page.locator(`.year-month .year-day.today:has-text("${todayDay}")`);
    await expect(todayElement.first()).toBeVisible({ timeout: 5000 });
});
});
