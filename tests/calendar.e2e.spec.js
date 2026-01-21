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

// Helper function to create tasks with various dates (December 2025 and future dates)
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

  // Create tasks in December 2025 (past dates for reference)
  const decemberDates = [
      { day: 15, title: 'December 2025 Task 1', priority: 'High' },
      { day: 18, title: 'December 2025 Task 2', priority: 'Medium' },
      { day: 20, title: 'December 2025 Task 3', priority: 'Low' },
      { day: 22, title: 'December 2025 Task 4', priority: 'High' }
  ];

  for (const taskInfo of decemberDates) {
      const dueDateString = `2025-12-${String(taskInfo.day).padStart(2, '0')}`;
      
      const response = await page.request.post('http://localhost:3001/api/tasks', {
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          },
          data: {
              title: `${taskInfo.title} ${Date.now()}`,
              description: 'Test task created for calendar E2E tests',
              priority: taskInfo.priority,
              status: 'Pending',
              dueDate: dueDateString
          }
      });

      if (response.ok()) {
          const result = await response.json();
          createdTasks.push(result.task || result);
      }
  }

  // Create tasks in the current month (if not December 2025)
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  if (currentYear !== 2025 || currentMonth !== 11) {
      // Create tasks for tomorrow, day after tomorrow, and next week
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dayAfterTomorrow = new Date(now);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const currentMonthTasks = [
          { date: tomorrow, title: 'Tomorrow Task', priority: 'High' },
          { date: dayAfterTomorrow, title: 'Day After Tomorrow Task', priority: 'Medium' },
          { date: nextWeek, title: 'Next Week Task', priority: 'Low' }
      ];

      for (const taskInfo of currentMonthTasks) {
          const dueDateString = formatDate(taskInfo.date);
          
          const response = await page.request.post('http://localhost:3001/api/tasks', {
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              },
              data: {
                  title: `${taskInfo.title} ${Date.now()}`,
                  description: 'Test task created for calendar E2E tests',
                  priority: taskInfo.priority,
                  status: 'Pending',
                  dueDate: dueDateString
              }
          });

          if (response.ok()) {
              const result = await response.json();
              createdTasks.push(result.task || result);
          }
      }
  }

  // Create tasks in next month
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(5); // 5th of next month
  
  const nextMonthDate = formatDate(nextMonth);
  const nextMonthResponse = await page.request.post('http://localhost:3001/api/tasks', {
      headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
      },
      data: {
          title: `Next Month Task ${Date.now()}`,
          description: 'Test task created for calendar E2E tests',
          priority: 'Medium',
          status: 'Pending',
          dueDate: nextMonthDate
      }
  });

  if (nextMonthResponse.ok()) {
      const result = await nextMonthResponse.json();
      createdTasks.push(result.task || result);
  }

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
          
          // Create test tasks with various dates (December 2025 and future dates)
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
      // Create a task with a due date via API (ensures it exists even if account has no tasks)
      const taskTitle = `Calendar Test Task ${Date.now()}`;
      
      // Set due date to tomorrow (format as YYYY-MM-DD to avoid timezone issues)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      const dueDateString = `${year}-${month}-${day}`;
      
      // Create task via API
      const createdTask = await createTaskViaAPI(page, {
        title: taskTitle,
        priority: 'High',
        dueDate: dueDateString
      });

      // Verify task was created successfully
      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBeDefined();

      // Wait a moment for task to be committed to database
      await page.waitForTimeout(1000);
      
      // Verify task exists via API before checking calendar
      const token = await page.evaluate(() => localStorage.getItem('token'));
      const verifyResponse = await page.request.get('http://localhost:3001/api/tasks', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
      });
      const verifyData = await verifyResponse.json();
      const taskExists = verifyData.tasks?.some(t => t.id === createdTask.id && t.title === taskTitle);
      expect(taskExists).toBe(true);

      // Navigate to calendar
      await page.goto('http://localhost:3001/calendar/calendar.html');
      
      // Wait for tasks API call to complete
      await page.waitForResponse(response => 
        response.url().includes('/api/tasks') && response.status() === 200
      );
      
      // Wait for calendar to fully render
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check if task appears on the calendar day
      const tomorrowDay = tomorrow.getDate();
      const taskItem = page.locator(`.calendar-day:has(.day-number:has-text("${tomorrowDay}")) .task-item:has-text("${taskTitle}")`);
      await expect(taskItem).toBeVisible({ timeout: 15000 });
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
      // Create High priority task via API
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      const dueDateString = `${year}-${month}-${day}`;

      const highTaskTitle = `High Priority Task ${Date.now()}`;
      
      // Create task via API
      const createdTask = await createTaskViaAPI(page, {
        title: highTaskTitle,
        priority: 'High',
        dueDate: dueDateString
      });

      // Verify task was created
      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBeDefined();

      // Wait for task to be committed
      await page.waitForTimeout(1000);

      // Navigate to calendar
      await page.goto('http://localhost:3001/calendar/calendar.html');
      
      // Wait for tasks API call to complete
      await page.waitForResponse(response => 
        response.url().includes('/api/tasks') && response.status() === 200
      );
      
      // Wait for calendar to fully render
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check task appears with high priority styling
      const tomorrowDay = tomorrow.getDate();
      const highTask = page.locator(`.calendar-day:has(.day-number:has-text("${tomorrowDay}")) .task-item.high-priority:has-text("${highTaskTitle}")`);
      await expect(highTask).toBeVisible({ timeout: 15000 });
  });

  test('should allow dragging and dropping tasks to different dates', async ({ page }) => {
      // Create a task with a due date via API
      const taskTitle = `Draggable Task ${Date.now()}`;
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      const dueDateString = `${year}-${month}-${day}`;
      
      // Create task via API
      const createdTask = await createTaskViaAPI(page, {
        title: taskTitle,
        priority: 'Medium',
        dueDate: dueDateString
      });

      // Verify task was created
      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBeDefined();

      // Wait for task to be committed
      await page.waitForTimeout(1000);

      // Navigate to calendar
      await page.goto('http://localhost:3001/calendar/calendar.html');
      
      // Wait for tasks API call to complete
      await page.waitForResponse(response => 
        response.url().includes('/api/tasks') && response.status() === 200
      );
      
      // Wait for calendar to fully render
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Close priority suggestions panel if it's open (it blocks drag operations)
      const suggestionsPanel = page.locator('#priority-suggestions-panel');
      if (await suggestionsPanel.isVisible().catch(() => false)) {
          await page.click('#close-suggestions').catch(() => {});
          await page.waitForTimeout(500);
      }

      // Find the task on the calendar
      const tomorrowDay = tomorrow.getDate();
      const taskItem = page.locator(`.calendar-day:has(.day-number:has-text("${tomorrowDay}")) .task-item:has-text("${taskTitle}")`);
      await expect(taskItem).toBeVisible({ timeout: 15000 });

      // Find a different day to drop on (2 days later)
      const targetDay = tomorrow.getDate() + 2;
      const targetDayElement = page.locator(`.calendar-day:has(.day-number:has-text("${targetDay}"))`).first();

      // Drag and drop
      await taskItem.dragTo(targetDayElement);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Task should now appear on the new date (reload to verify)
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check task appears on new date
      const newDateTask = page.locator(`.calendar-day:has(.day-number:has-text("${targetDay}")) .task-item:has-text("${taskTitle}")`);
      await expect(newDateTask).toBeVisible({ timeout: 15000 });
  });

  test('should not allow dragging completed tasks', async ({ page }) => {
      // Create a task via API first
      const taskTitle = `Completed Task ${Date.now()}`;
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      const dueDateString = `${year}-${month}-${day}`;
      
      // Create task via API
      const createdTask = await createTaskViaAPI(page, {
        title: taskTitle,
        dueDate: dueDateString
      });

      // Verify task was created
      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBeDefined();

      // Mark task as completed via API
      const token = await page.evaluate(() => localStorage.getItem('token'));
      await page.request.put(`http://localhost:3001/api/tasks/${createdTask.id}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data: {
            status: 'Completed'
        }
      });

      // Wait for changes to be committed
      await page.waitForTimeout(1000);

      // Navigate to calendar
      await page.goto('http://localhost:3001/calendar/calendar.html');
      
      // Wait for tasks API call to complete
      await page.waitForResponse(response => 
        response.url().includes('/api/tasks') && response.status() === 200
      );
      
      // Wait for calendar to fully render
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Find the completed task
      const tomorrowDay = tomorrow.getDate();
      const taskItem = page.locator(`.calendar-day:has(.day-number:has-text("${tomorrowDay}")) .task-item.completed:has-text("${taskTitle}")`);
      await expect(taskItem).toBeVisible({ timeout: 15000 });

      // Check that completed task is not draggable
      const isDraggable = await taskItem.getAttribute('draggable');
      expect(isDraggable).toBe('false');
  });

  test('should navigate to year view and back to month view when clicking a month', async ({ page }) => {
      await page.goto('http://localhost:3001/calendar/calendar.html');
      await page.waitForLoadState('networkidle');

      // Close priority suggestions panel if it's open (it might block clicks)
      const suggestionsPanel = page.locator('#priority-suggestions-panel');
      if (await suggestionsPanel.isVisible().catch(() => false)) {
          await page.click('#close-suggestions').catch(() => {});
          await page.waitForTimeout(500);
      }

      // Go to year view
      await page.click('#back-btn');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Close priority suggestions panel again if it appeared
      if (await suggestionsPanel.isVisible().catch(() => false)) {
          await page.click('#close-suggestions').catch(() => {});
          await page.waitForTimeout(500);
      }

      // Click on a month (e.g., January) - use force click to bypass any overlays
      const januaryMonth = page.locator('.year-month:has(.year-month-title:has-text("January"))');
      await januaryMonth.click({ force: true });
      await page.waitForLoadState('networkidle');

      // Should be back in month view showing January
      await expect(page.locator('#month-view')).toBeVisible();
      const monthYear = await page.locator('#current-month-year').textContent();
      expect(monthYear?.toLowerCase()).toContain('january');
  });

  test('should display "more tasks" indicator when there are more than 3 tasks on a day', async ({ page }) => {
      // Create multiple tasks for the same day via API
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      const dueDateString = `${year}-${month}-${day}`;

      // Create 4 tasks for the same day via API
      for (let i = 1; i <= 4; i++) {
          await createTaskViaAPI(page, {
            title: `Task ${i} ${Date.now()}`,
            dueDate: dueDateString
          });
      }

      // Wait for tasks to be committed
      await page.waitForTimeout(1000);

      // Navigate to calendar
      await page.goto('http://localhost:3001/calendar/calendar.html');
      
      // Wait for tasks API call to complete
      await page.waitForResponse(response => 
        response.url().includes('/api/tasks') && response.status() === 200
      );
      
      // Wait for calendar to fully render
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check for "more tasks" indicator
      const tomorrowDay = tomorrow.getDate();
      const moreTasksIndicator = page.locator(`.calendar-day:has(.day-number:has-text("${tomorrowDay}")) .more-tasks`);
      await expect(moreTasksIndicator).toBeVisible({ timeout: 15000 });
      await expect(moreTasksIndicator).toContainText('+');
  });

test('should handle navigation between months correctly', async ({ page }) => {
    await page.goto('http://localhost:3001/calendar/calendar.html');
    await page.waitForLoadState('networkidle');

    // Get initial month
    const initialMonth = await page.locator('#current-month-year').textContent();

    // Navigate forward 2 months
    await page.click('#next-month');
    await page.waitForLoadState('networkidle');
    await page.click('#next-month');
    await page.waitForLoadState('networkidle');

    const forwardMonth = await page.locator('#current-month-year').textContent();
    expect(forwardMonth).not.toBe(initialMonth);

    // Navigate back 2 months
    await page.click('#prev-month');
    await page.waitForLoadState('networkidle');
    await page.click('#prev-month');
    await page.waitForLoadState('networkidle');

    const backMonth = await page.locator('#current-month-year').textContent();
    expect(backMonth).toBe(initialMonth);
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
