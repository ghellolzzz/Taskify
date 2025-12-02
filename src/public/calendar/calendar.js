document.addEventListener("DOMContentLoaded", () => {
    let currentDate = new Date();
    let currentView = 'month'; // 'month' or 'year'
    let tasks = [];

    const monthYearTitle = document.getElementById('current-month-year');
    const calendarGrid = document.getElementById('calendar-grid');
    const yearGrid = document.getElementById('year-grid');
    const monthView = document.getElementById('month-view');
    const yearView = document.getElementById('year-view');
    const backBtn = document.getElementById('back-btn');
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    // Load tasks from API
    function loadTasks() {
        fetch('/api/tasks', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(res => res.json())
        .then(data => {
            tasks = data.tasks || [];
            if (currentView === 'month') {
                renderMonthView();
            } else {
                renderYearView();
            }
        })
        .catch(err => {
            console.error('Error loading tasks:', err);
            tasks = [];
            if (currentView === 'month') {
                renderMonthView();
            } else {
                renderYearView();
            }
        });
    }

    // Get tasks for a specific date
    function getTasksForDate(date) {
        if (!tasks || tasks.length === 0) return [];
        
        const dateStr = formatDateForComparison(date);
        return tasks.filter(task => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            const taskDateStr = formatDateForComparison(taskDate);
            return taskDateStr === dateStr;
        });
    }

    // Format date for comparison (YYYY-MM-DD)
    function formatDateForComparison(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Render month view
    function renderMonthView() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        monthYearTitle.textContent = currentDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        calendarGrid.innerHTML = '';

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day other-month';
            calendarGrid.appendChild(emptyDay);
        }

        // Add days of the month
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            const date = new Date(year, month, day);
            const isToday = formatDateForComparison(date) === formatDateForComparison(today);
            
            dayElement.className = 'calendar-day';
            if (isToday) {
                dayElement.classList.add('today');
            }

            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;
            dayElement.appendChild(dayNumber);

            // Get tasks for this date
            const dayTasks = getTasksForDate(date);
            if (dayTasks.length > 0) {
                const tasksList = document.createElement('div');
                tasksList.className = 'tasks-list';
                
                // Show up to 3 tasks
                const tasksToShow = dayTasks.slice(0, 3);
                tasksToShow.forEach(task => {
                    const taskItem = document.createElement('div');
                    taskItem.className = `task-item ${task.priority.toLowerCase()}-priority ${task.status === 'Completed' ? 'completed' : ''}`;
                    taskItem.textContent = task.title;
                    taskItem.title = task.title + (task.description ? ': ' + task.description : '');
                    tasksList.appendChild(taskItem);
                });

                // Show "more tasks" indicator if there are more than 3
                if (dayTasks.length > 3) {
                    const moreTasks = document.createElement('div');
                    moreTasks.className = 'more-tasks';
                    moreTasks.textContent = `+${dayTasks.length - 3} more`;
                    tasksList.appendChild(moreTasks);
                }

                dayElement.appendChild(tasksList);
            }

            calendarGrid.appendChild(dayElement);
        }

        // Add empty cells for days after the last day of the month
        const totalCells = startingDayOfWeek + daysInMonth;
        const remainingCells = 42 - totalCells; // 6 rows * 7 days = 42
        for (let i = 0; i < remainingCells && totalCells + i < 42; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day other-month';
            calendarGrid.appendChild(emptyDay);
        }
    }

    // Render year view
    function renderYearView() {
        const year = currentDate.getFullYear();
        monthYearTitle.textContent = year.toString();

        yearGrid.innerHTML = '';

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        for (let month = 0; month < 12; month++) {
            const monthElement = document.createElement('div');
            monthElement.className = 'year-month';
            monthElement.addEventListener('click', () => {
                currentDate = new Date(year, month, 1);
                currentView = 'month';
                monthView.style.display = 'block';
                yearView.style.display = 'none';
                renderMonthView();
            });

            const monthTitle = document.createElement('div');
            monthTitle.className = 'year-month-title';
            monthTitle.textContent = monthNames[month];
            monthElement.appendChild(monthTitle);

            const monthGrid = document.createElement('div');
            monthGrid.className = 'year-month-grid';

            // Add weekday headers
            const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
            weekdays.forEach(day => {
                const dayHeader = document.createElement('div');
                dayHeader.className = 'year-day';
                dayHeader.textContent = day;
                dayHeader.style.fontWeight = '600';
                dayHeader.style.color = '#198754';
                monthGrid.appendChild(dayHeader);
            });

            // Get first day of month
            const firstDay = new Date(year, month, 1);
            const startingDayOfWeek = firstDay.getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            // Add empty cells
            for (let i = 0; i < startingDayOfWeek; i++) {
                const emptyDay = document.createElement('div');
                emptyDay.className = 'year-day';
                monthGrid.appendChild(emptyDay);
            }

            // Add days
            const today = new Date();
            for (let day = 1; day <= daysInMonth; day++) {
                const dayElement = document.createElement('div');
                const date = new Date(year, month, day);
                const isToday = formatDateForComparison(date) === formatDateForComparison(today);
                const dayTasks = getTasksForDate(date);

                dayElement.className = 'year-day';
                if (isToday) {
                    dayElement.classList.add('today');
                } else if (dayTasks.length > 0) {
                    dayElement.classList.add('has-tasks');
                }
                dayElement.textContent = day;
                monthGrid.appendChild(dayElement);
            }

            monthElement.appendChild(monthGrid);
            yearGrid.appendChild(monthElement);
        }
    }

    // Navigation handlers
    backBtn.addEventListener('click', () => {
        if (currentView === 'month') {
            currentView = 'year';
            monthView.style.display = 'none';
            yearView.style.display = 'block';
            renderYearView();
        } else {
            // If in year view, go back to current month
            currentDate = new Date();
            currentView = 'month';
            monthView.style.display = 'block';
            yearView.style.display = 'none';
            renderMonthView();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentView === 'month') {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderMonthView();
        } else {
            currentDate.setFullYear(currentDate.getFullYear() - 1);
            renderYearView();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentView === 'month') {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderMonthView();
        } else {
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            renderYearView();
        }
    });

    // Logout functionality
    document.querySelector('.sidebar-footer a')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('accountNo');
        localStorage.removeItem('role');
        localStorage.removeItem('memberId');
        window.location.href = '../login.html';
    });

    // Initial load
    loadTasks();
});

