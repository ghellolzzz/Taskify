document.addEventListener("DOMContentLoaded", () => {
    let currentDate = new Date();
    let currentView = 'month'; // 'month' or 'year'
    let tasks = [];
    let draggedTask = null;

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
                    taskItem.draggable = task.status !== 'Completed'; // Only allow dragging incomplete tasks
                    taskItem.dataset.taskId = task.id;
                    
                    // Drag event handlers
                    if (task.status !== 'Completed') {
                        taskItem.addEventListener('dragstart', handleTaskDragStart);
                        taskItem.style.cursor = 'grab';
                    }
                    
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

            // Make calendar day a drop zone (only for current month days)
            if (!dayElement.classList.contains('other-month')) {
                dayElement.addEventListener('dragover', handleDragOver);
                dayElement.addEventListener('drop', handleTaskDrop);
                dayElement.addEventListener('dragenter', handleDragEnter);
                dayElement.addEventListener('dragleave', handleDragLeave);
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

    // Drag and drop handlers
    function handleTaskDragStart(e) {
        draggedTask = {
            id: parseInt(e.target.dataset.taskId),
            element: e.target
        };
        e.target.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragOver(e) {
        if (draggedTask) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    }

    function handleDragEnter(e) {
        if (draggedTask) {
            e.preventDefault();
            e.currentTarget.classList.add('drag-over');
        }
    }

    function handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    function handleTaskDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        if (!draggedTask) return;

        const dayElement = e.currentTarget;
        
        // Don't allow dropping on other-month days
        if (dayElement.classList.contains('other-month')) {
            if (draggedTask.element) {
                draggedTask.element.style.opacity = '1';
            }
            draggedTask = null;
            return;
        }

        const dayNumber = dayElement.querySelector('.day-number');
        if (!dayNumber) {
            if (draggedTask.element) {
                draggedTask.element.style.opacity = '1';
            }
            draggedTask = null;
            return;
        }

        const day = parseInt(dayNumber.textContent);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const newDate = new Date(year, month, day);
        
        // Update task due date
        updateTaskDueDate(draggedTask.id, newDate);
        
        // Reset dragged task
        if (draggedTask.element) {
            draggedTask.element.style.opacity = '1';
        }
        draggedTask = null;
    }

    // Update task due date via API
    function updateTaskDueDate(taskId, newDate) {
        const dateISO = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate()).toISOString();
        
        fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dueDate: dateISO
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error('Error updating task:', data.error);
                alert('Failed to update task: ' + data.error);
            } else {
                // Reload tasks to reflect the change
                loadTasks();
            }
        })
        .catch(err => {
            console.error('Error updating task:', err);
            alert('Failed to update task');
        });
    }

    // Load priority suggestions
    function loadPrioritySuggestions() {
        const dateStr = formatDateForComparison(currentDate);
        console.log('[Frontend] Loading priority suggestions for date:', dateStr);
        
        fetch(`/api/calendar/tasks/priority-suggestions?date=${dateStr}`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(res => {
            console.log('[Frontend] Priority suggestions response status:', res.status);
            if (!res.ok) {
                return res.json().then(errData => {
                    console.error('[Frontend] API error:', errData);
                    throw new Error(errData.error || `HTTP error! status: ${res.status}`);
                });
            }
            return res.json();
        })
        .then(data => {
            console.log('[Frontend] Priority suggestions response data:', data);
            console.log('[Frontend] Number of suggestions:', data.suggestions ? data.suggestions.length : 0);
            if (data.error) {
                throw new Error(data.error);
            }
            if (data.suggestions && data.suggestions.length > 0) {
                console.log('[Frontend] Showing suggestions:', data.suggestions);
                showPrioritySuggestions(data.suggestions);
            } else {
                console.log('[Frontend] No suggestions found, showing empty state');
                showPrioritySuggestions([]); // Show empty state
            }
        })
        .catch(err => {
            console.error('[Frontend] Error loading priority suggestions:', err);
            // Show error in panel instead of alert
            showPrioritySuggestionsError(err.message || 'Failed to load priority suggestions');
        });
    }

    // Check for priority suggestions and show modal only if suggestions exist
    function checkAndShowPrioritySuggestions() {
        const dateStr = formatDateForComparison(currentDate);
        console.log('[Frontend] Checking for priority suggestions on page load');
        
        fetch(`/api/calendar/tasks/priority-suggestions?date=${dateStr}`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(errData => {
                    console.error('[Frontend] API error:', errData);
                    return { suggestions: [] };
                });
            }
            return res.json();
        })
        .then(data => {
            console.log('[Frontend] Priority suggestions check:', data.suggestions ? data.suggestions.length : 0, 'suggestions found');
            // Only show modal if there are actual suggestions
            if (data.suggestions && data.suggestions.length > 0) {
                console.log('[Frontend] Showing priority suggestions modal automatically');
                showPrioritySuggestions(data.suggestions);
            } else {
                console.log('[Frontend] No suggestions, not showing modal');
            }
        })
        .catch(err => {
            console.error('[Frontend] Error checking priority suggestions:', err);
            // Don't show error modal on page load, just log it
        });
>>>>>>> 06671817376681a3da3ae9f40c4f2ead32a3ecbe
    }

    // Show error in suggestions panel
    function showPrioritySuggestionsError(errorMessage) {
        const existingPanel = document.getElementById('priority-suggestions-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        const panel = document.createElement('div');
        panel.id = 'priority-suggestions-panel';
        panel.className = 'priority-suggestions-panel';
        
        const header = document.createElement('div');
        header.className = 'suggestions-header';
        header.innerHTML = `
            <h3><i class="bi bi-lightbulb"></i> Priority Suggestions</h3>
            <button class="close-suggestions" id="close-suggestions"><i class="bi bi-x"></i></button>
        `;
        panel.appendChild(header);

        const errorDiv = document.createElement('div');
        errorDiv.className = 'empty-suggestions';
        errorDiv.innerHTML = `
            <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: white; margin-bottom: 15px; opacity: 0.9;"></i>
            <p style="font-size: 1.1rem; color: white; margin: 0; font-weight: 600;">Error Loading Suggestions</p>
            <p style="font-size: 0.9rem; color: rgba(255, 255, 255, 0.9); margin-top: 10px;">${errorMessage}</p>
        `;
        panel.appendChild(errorDiv);
        document.querySelector('.main-content').appendChild(panel);

        document.getElementById('close-suggestions').addEventListener('click', () => {
            panel.remove();
        });
    }

    // Show priority suggestions in a modal/panel
    function showPrioritySuggestions(suggestions) {
        // Remove existing suggestions panel if any
        const existingPanel = document.getElementById('priority-suggestions-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        const panel = document.createElement('div');
        panel.id = 'priority-suggestions-panel';
        panel.className = 'priority-suggestions-panel';
        
        const header = document.createElement('div');
        header.className = 'suggestions-header';
        header.innerHTML = `
            <h3><i class="bi bi-lightbulb"></i> Priority Suggestions</h3>
            <button class="close-suggestions" id="close-suggestions"><i class="bi bi-x"></i></button>
        `;
        panel.appendChild(header);

        const suggestionsList = document.createElement('div');
        suggestionsList.className = 'suggestions-list';
        
        if (suggestions.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-suggestions';
            emptyState.innerHTML = `
                <i class="bi bi-check-circle" style="font-size: 3rem; color: #90EE90; margin-bottom: 15px;"></i>
                <p style="font-size: 1.1rem; color: white; margin: 0;">No priority suggestions at this time.</p>
                <p style="font-size: 0.9rem; color: white; margin-top: 10px;">All your tasks have appropriate priorities based on their due dates.</p>
            `;
            suggestionsList.appendChild(emptyState);
        } else {
            suggestions.forEach(suggestion => {
                const suggestionItem = document.createElement('div');
                suggestionItem.className = 'suggestion-item';
                suggestionItem.innerHTML = `
                    <div class="suggestion-content">
                        <strong>${suggestion.taskTitle}</strong>
                        <div class="suggestion-details">
                            <span class="current-priority">Current: ${suggestion.currentPriority}</span>
                            <i class="bi bi-arrow-right"></i>
                            <span class="suggested-priority">Suggested: ${suggestion.suggestedPriority}</span>
                        </div>
                        <div class="suggestion-reason">${suggestion.reason}</div>
                    </div>
                    <button class="apply-suggestion-btn" data-task-id="${suggestion.taskId}" data-priority="${suggestion.suggestedPriority}">
                        Apply
                    </button>
                `;
                suggestionsList.appendChild(suggestionItem);
            });
        }

        panel.appendChild(suggestionsList);
        document.querySelector('.main-content').appendChild(panel);

        // Close button handler
        document.getElementById('close-suggestions').addEventListener('click', () => {
            panel.remove();
        });

        // Apply suggestion handlers
        document.querySelectorAll('.apply-suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const button = e.currentTarget || e.target.closest('.apply-suggestion-btn');
                const taskId = parseInt(button.dataset.taskId);
                const newPriority = button.dataset.priority;
                console.log('[Frontend] Applying suggestion:', { taskId, newPriority });
                applyPrioritySuggestion(taskId, newPriority, button);
            });
        });
    }

    // Apply priority suggestion
    function applyPrioritySuggestion(taskId, newPriority, button) {
        console.log('[Frontend] Updating task priority:', taskId, 'to', newPriority);
        
        if (!button) {
            button = document.querySelector(`.apply-suggestion-btn[data-task-id="${taskId}"]`);
            if (!button) return;
        }
        
        // Disable the button to prevent multiple clicks
        button.disabled = true;
        button.style.opacity = '0.6';
        button.style.cursor = 'not-allowed';
        
>>>>>>> 06671817376681a3da3ae9f40c4f2ead32a3ecbe
        fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                priority: newPriority
            })
        })
        .then(res => {
            console.log('[Frontend] Update response status:', res.status);
            return res.json();
        })
        .then(data => {
            console.log('[Frontend] Update response data:', data);
            if (data.error) {
                console.error('Error updating priority:', data.error);
                alert('Failed to update priority: ' + data.error);
                // Re-enable button on error
                button.disabled = false;
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
            } else {
                // Mark this suggestion as applied with a checkmark
                const suggestionItem = button.closest('.suggestion-item');
                if (suggestionItem) {
                    // Replace the button with a checkmark
                    button.innerHTML = '<i class="bi bi-check-circle-fill" style="color: #90EE90; font-size: 1.2rem;"></i> Applied';
                    button.style.background = 'rgba(144, 238, 144, 0.2)';
                    button.style.color = '#90EE90';
                    suggestionItem.classList.add('applied');
                }
                
                // Reload tasks in the background
                loadTasks();
                
                // Check if all suggestions have been applied
                checkAllSuggestionsApplied();
            }
        })
        .catch(err => {
            console.error('Error updating priority:', err);
            alert('Failed to update priority: ' + err.message);
            // Re-enable button on error
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
        });
    }

    // Check if all suggestions have been applied and show empty state if so
    function checkAllSuggestionsApplied() {
        const panel = document.getElementById('priority-suggestions-panel');
        if (!panel) return;
        
        const allButtons = panel.querySelectorAll('.apply-suggestion-btn');
        const appliedButtons = panel.querySelectorAll('.apply-suggestion-btn:disabled');
        
        // If all buttons are disabled (applied), show empty state
        if (allButtons.length > 0 && allButtons.length === appliedButtons.length) {
            const suggestionsList = panel.querySelector('.suggestions-list');
            if (suggestionsList) {
                suggestionsList.innerHTML = `
                    <div class="empty-suggestions">
                        <i class="bi bi-check-circle" style="font-size: 3rem; color: #90EE90; margin-bottom: 15px;"></i>
                        <p style="font-size: 1.1rem; color: white; margin: 0;">No priority suggestions at this time.</p>
                        <p style="font-size: 0.9rem; color: white; margin-top: 10px;">All your tasks have appropriate priorities based on their due dates.</p>
                    </div>
                `;
            }
        }
    }

    // Reload suggestions after task update
    function reloadSuggestions() {
        setTimeout(() => {
            checkAndShowPrioritySuggestions();
        }, 500);
    }
    // Add button to show priority suggestions
    function addSuggestionsButton() {
        const existingBtn = document.getElementById('show-suggestions-btn');
        if (existingBtn) return;

        const btn = document.createElement('button');
        btn.id = 'show-suggestions-btn';
        btn.className = 'suggestions-btn';
        btn.innerHTML = '<i class="bi bi-lightbulb"></i> Priority Suggestions';
        btn.addEventListener('click', () => {
            loadPrioritySuggestions();
        });
        
        const calendarHeader = document.querySelector('.calendar-header');
        calendarHeader.appendChild(btn);
    }

<<<<<<< HEAD
    // Check for priority suggestions and show modal only if suggestions exist
    function checkAndShowPrioritySuggestions() {
        const dateStr = formatDateForComparison(currentDate);
        console.log('[Frontend] Checking for priority suggestions on page load');
        
        fetch(`/api/calendar/tasks/priority-suggestions?date=${dateStr}`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(errData => {
                    console.error('[Frontend] API error:', errData);
                    return { suggestions: [] };
                });
            }
            return res.json();
        })
        .then(data => {
            console.log('[Frontend] Priority suggestions check:', data.suggestions ? data.suggestions.length : 0, 'suggestions found');
            // Only show modal if there are actual suggestions
            if (data.suggestions && data.suggestions.length > 0) {
                console.log('[Frontend] Showing priority suggestions modal automatically');
                showPrioritySuggestions(data.suggestions);
            } else {
                console.log('[Frontend] No suggestions, not showing modal');
            }
        })
        .catch(err => {
            console.error('[Frontend] Error checking priority suggestions:', err);
            // Don't show error modal on page load, just log it
        });
    }

=======
>>>>>>> 06671817376681a3da3ae9f40c4f2ead32a3ecbe
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
    addSuggestionsButton();
    // Check for suggestions on page load, but only show modal if suggestions exist
    checkAndShowPrioritySuggestions();
});

