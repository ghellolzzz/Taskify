// Login form handling
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');
  const submitBtn = document.getElementById('submitBtn');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset messages
    errorMessage.classList.remove('show');
    successMessage.classList.remove('show');
    errorMessage.textContent = '';
    successMessage.textContent = '';

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Logging in...';

    // Get form data
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Login failed');
      }

      // Success - store user data
      const userId = data.user_id;
      const userName = data.name || data.email;

      if (userId) {
        localStorage.setItem('userId', userId.toString());
        if (userName) {
          localStorage.setItem('username', userName);
        }
        if (data.token) {
          localStorage.setItem('token', data.token);
        }

        // Show success message
        successMessage.textContent = 'Login successful! Redirecting...';
        successMessage.classList.add('show');

        // Redirect to dashboard after short delay
        setTimeout(() => {
          window.location.href = '../dashboard/dashboard.html';
        }, 1000);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      // Show error message
      errorMessage.textContent = error.message || 'An error occurred. Please try again.';
      errorMessage.classList.add('show');

      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  });
});
