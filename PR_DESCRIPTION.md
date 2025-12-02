### What was done

- Implemented calendar page with month and year view functionality
- Created calendar.html with month/year view structure and navigation controls
- Implemented calendar.css with Taskify theme styling for calendar grid and task display
- Built calendar.js with full calendar functionality:
  - Month view with task display on due dates
  - Year view showing all 12 months with task indicators
  - Navigation between months and years
  - Task filtering by date to show tasks on their due dates
  - Priority-based task styling (High, Medium, Low)
  - Task count indicators ("+X more" for dates with many tasks)
  - Authentication check and redirect if not logged in
- Updated navigation links in dashboard, tasks, categories, and profile pages to include calendar link
- Integrated calendar with existing task API to fetch and display tasks
- Updated sidebar styling with gradient background across all pages
- Fixed logout button positioning in calendar sidebar to match dashboard style

### Why this is needed

Provides users with a visual calendar interface to view their tasks organized by due dates. This allows users to quickly see when tasks are due and plan their work schedule more effectively. The month and year views give different perspectives on task distribution, making it easier to manage deadlines and workload.

### How to test

1. Navigate to /calendar/calendar.html
2. Ensure authentication is working (should redirect to login if not authenticated)
3. Verify month view displays current month with correct dates
4. Check that tasks appear on their due dates with proper priority styling
5. Test navigation buttons (Previous/Next month, Back to year view)
6. Verify year view shows all 12 months with task indicators
7. Ensure logout button is fully visible at bottom of sidebar
8. Check that calendar styling matches Taskify theme (green gradient sidebar, soft mint background)

