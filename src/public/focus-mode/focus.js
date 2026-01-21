const focusApp = {
    // Configuration
    userId: 1, // Ideally fetch this from your login session
    timerInterval: null,
    totalSeconds: 0,
    elapsedSeconds: 0,
    
   renderTimer: function(remaining) {
        const m = Math.floor(remaining / 60).toString().padStart(2, '0');
        const s = (remaining % 60).toString().padStart(2, '0');
        document.getElementById('timer-display').innerText = `${m}:${s}`;

        const percentage = (remaining / this.totalSeconds) * 100;
        document.getElementById('liquid').style.height = `${percentage}%`;
    }, 
    
    // 1.Start Focus Session
    startSession: function(drinkType, minutes) {
        // Setup Variables
        this.totalSeconds = minutes * 60;
        this.elapsedSeconds = 0;

        // Update UI to "Focus Mode"
        document.getElementById('menu-view').classList.add('hidden');
        document.getElementById('focus-view').classList.remove('hidden');

        // Set Drink Color
        const liquid = document.getElementById('liquid');
        liquid.className = '';
        liquid.classList.add(`liquid-${drinkType}`); // add drink in the glass
        liquid.style.height = '100%'; // make sure that cup is full at the start

        // Save Preference
        this.saveSettings(drinkType);

        this.renderTimer(this.totalSeconds); // "30:00"

        // Start the Loop
        this.startTimer();
    },

    // 2.Timer
startTimer: function() {
    this.timerInterval = setInterval(() => {
        this.elapsedSeconds++;
        const remaining = this.totalSeconds - this.elapsedSeconds;

        this.renderTimer(remaining);

        if (remaining <= 0) {
            this.completeSession();
        }
    }, 1000);
},

// 3.Save User Preference
    saveSettings: function(drink) {
        const token = localStorage.getItem('token'); 

        fetch('/api/focus/settings', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                userId: this.userId, 
                theme: 'drink', 
                drink: drink, 
                color: '#fdf6e3'
            })
        }).catch(err => console.error("Sync error:", err));
    },

// 4. Log Success
    completeSession: function() {
        clearInterval(this.timerInterval);
        alert("Delicious! Focus session complete.");

        const token = localStorage.getItem('token');

        const minutes = this.totalSeconds / 60;
        fetch('/api/focus/log', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                userId: this.userId,
                minutes: minutes,
                status: 'COMPLETED'
            })
        }).then(() => location.reload()); 
    },

    // 5.Giving Up
    giveUp: function() {
        if(confirm("Are you sure? You'll spill the drink!")) {
        // 1. Stop the timer logic
            clearInterval(this.timerInterval);
            
    const liquid = document.getElementById('liquid');

        // 2. Snap height to 0 immediately (disable transition)
        const prevTransition = liquid.style.transition;
        liquid.style.transition = 'none';
        liquid.style.height = '0px';

        // Force reflow to apply height immediately
        liquid.offsetHeight;

        // Restore transition for future sessions
        liquid.style.transition = prevTransition || '';

        // 3. Log failure to backend
        const token = localStorage.getItem('token');
            
            fetch('/api/focus/log', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: this.userId,
                    minutes: Math.floor(this.elapsedSeconds / 60),
                    status: 'ABANDONED'
                })
            }).then(() => {
                setTimeout(() => {
                    location.reload(); 
                }, 1000); // 1s delay
            });
        }
    }
};