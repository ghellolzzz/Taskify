const focusApp = {
    // Configuration
    userId: 1, // Ideally fetch this from your login session
    timerInterval: null,
    totalSeconds: 0,
    elapsedSeconds: 0,
    
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

        // Start the Loop
        this.startTimer();
    },

    // 2.Timer
    startTimer: function() {
        this.timerInterval = setInterval(() => {
            this.elapsedSeconds++;
            const remaining = this.totalSeconds - this.elapsedSeconds;

            // Update Text
            const m = Math.floor(remaining / 60).toString().padStart(2,'0');
            const s = (remaining % 60).toString().padStart(2,'0');
            document.getElementById('timer-display').innerText = `${m}:${s}`;

            // Calculate remaining time
            const percentage = (remaining / this.totalSeconds) * 100;
            document.getElementById('liquid').style.height = `${percentage}%`;

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
                // ADD THIS LINE: Send the "ID Card"
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
            
            // 2. Visual: Empty the cup (CSS transition takes 1 second)
            document.getElementById('liquid').style.height = '0%'; 
            
            // 3. Log Failure to Backend
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