// /public/js/theme.js
(function () {
  const DEFAULT_ACCENT = '#198754';

  function getUserId() {
    // handle whichever key your login page used
    return (
      localStorage.getItem('userId') ||
      localStorage.getItem('user_id') ||
      localStorage.getItem('memberId') || // fallback (some groups store this)
      null
    );
  }

  function getToken() {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  }

  function applyTheme({ theme, accentColor }) {
    // Accent var used across pages
    const accent = accentColor || localStorage.getItem('accentColor') || DEFAULT_ACCENT;
    document.documentElement.style.setProperty('--accent-color', accent);

    // Switch class
    document.body.classList.remove('profile-theme-light', 'profile-theme-dark');
    document.body.classList.add(theme === 'dark' ? 'profile-theme-dark' : 'profile-theme-light');
  }

  // Apply cached theme ASAP (reduces flash)
  function applyCachedInstant() {
    const cachedTheme = localStorage.getItem('theme');
    const cachedAccent = localStorage.getItem('accentColor');
    if (cachedTheme || cachedAccent) {
      applyTheme({ theme: cachedTheme || 'light', accentColor: cachedAccent || DEFAULT_ACCENT });
    }
  }

  async function fetchAndApplyFromBackend() {
    const token = getToken();
    const userId = getUserId();
    if (!token || !userId) return;

    try {
      const res = await fetch(`/api/profile/${userId}/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const data = await res.json();
      const user = data.user || {};

      if (user.theme) localStorage.setItem('theme', user.theme);
      if (user.accentColor) localStorage.setItem('accentColor', user.accentColor);

      applyTheme({ theme: user.theme || 'light', accentColor: user.accentColor || DEFAULT_ACCENT });
    } catch (e) {
      console.warn('[theme] failed to load:', e.message);
    }
  }

  // 1) apply cached immediately
  applyCachedInstant();

  // 2) then confirm from backend after DOM is ready
  document.addEventListener('DOMContentLoaded', fetchAndApplyFromBackend);

  // optional global access
  window.TaskifyTheme = { applyTheme };
})();
