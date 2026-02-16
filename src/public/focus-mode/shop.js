document.addEventListener('DOMContentLoaded', () => {
    const shopBtn = document.getElementById('open-shop-btn');
    const modal = document.getElementById('shop-modal');
    const closeBtn = document.getElementById('close-shop');
    const pointsDisplay = document.getElementById('user-points');
    const container = document.getElementById('shop-container');

// 1. Open Shop & Load Data
    shopBtn.addEventListener('click', () => {
        modal.style.display = 'block'; 
        modal.classList.remove('hidden');
        loadShop();
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    });

    // Close if clicking outside the modal content
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }
    });

    // 2. Load Shop Items + User Inventory
    async function loadShop() {
        const token = localStorage.getItem('token');
        
        try {
            // A. Fetch All Themes
            const themesRes = await fetch('/api/shop/themes');
            const themes = await themesRes.json();

            // B. Fetch User Data
            const userRes = await fetch('/api/shop/inventory', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const userData = await userRes.json();

            // C. Update Wallet UI
            pointsDisplay.innerText = userData.points;
            
            // D. Helper to check ownership
            const ownedIds = new Set(userData.ownedThemes.map(ot => ot.themeId));
            const currentTheme = userData.preferredTheme || userData.focusSettings?.preferredTheme || 'theme-coffee';

            // E. Render Cards
            container.innerHTML = '';
            
            themes.forEach(theme => {
                const isOwned = ownedIds.has(theme.id) || theme.name.includes('Classic') || theme.cost === 0;
                const isEquipped = currentTheme === theme.cssClass;
                const canAfford = userData.points >= theme.cost;

                const card = document.createElement('div');
                card.className = 'theme-card';
                
                let btnHtml = '';
                if (isEquipped) {
                    btnHtml = `<button class="btn" disabled style="background:grey; cursor:not-allowed">Equipped</button>`;
                } else if (isOwned) {
                    btnHtml = `<button class="btn" onclick="equipTheme('${theme.cssClass}')" style="background:var(--accent-color)">Equip</button>`;
                } else if (canAfford) {
                    btnHtml = `<button class="btn" onclick="buyTheme(${theme.id}, ${theme.cost})" style="background:var(--primary-color)">Buy (${theme.cost})</button>`;
                } else {
                    btnHtml = `<button class="btn" disabled style="opacity:0.5">Need ${theme.cost} ☕</button>`;
                }

                card.innerHTML = `
                    <h3>${theme.name}</h3>
                    <p>${theme.description}</p>
                    <div style="margin-top:10px;">
                        ${btnHtml}
                    </div>
                `;
                container.appendChild(card);
            });

        } catch (error) {
            console.error("Shop Error:", error);
            container.innerHTML = '<p>Failed to load shop.</p>';
        }
    }

    // 3. Make functions global
    window.buyTheme = async (themeId, cost) => {
        if(!confirm(`Buy this theme for ${cost} beans?`)) return;

        const token = localStorage.getItem('token');
        const res = await fetch('/api/shop/buy', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ themeId })
        });

        const result = await res.json();
        if (res.ok) {
            alert("Purchase successful!");
            loadShop();
        } else {
            alert(result.error);
        }
    };

    window.equipTheme = async (cssClass) => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/shop/equip', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ cssClass })
        });

        if (res.ok) {
            document.body.className = cssClass; 
            loadShop();
        }
    };
});