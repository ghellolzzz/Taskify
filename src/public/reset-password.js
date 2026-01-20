// Reset password form handling
document.addEventListener('DOMContentLoaded', () => {
  const resetPasswordForm = document.getElementById('resetPasswordForm');
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');
  const submitBtn = document.getElementById('submitBtn');

  // Get token from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  // If no token, show error and redirect
  if (!token) {
    if (errorMessage) {
      errorMessage.textContent = 'Invalid or missing reset token. Please request a new password reset link.';
      errorMessage.classList.add('show');
      errorMessage.style.display = 'block'; // Ensure it's visible
    }
    if (resetPasswordForm) {
      resetPasswordForm.style.display = 'none';
    }
    return;
  }

  // Verify token on page load
  fetch(`/api/password-reset/verify?token=${token}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(data => {
        throw new Error(data.error || 'Invalid or expired reset token.');
      });
    }
    return response.json();
  })
  .then(data => {
    // Token is valid, form is already visible
    if (data.message === 'Token is valid') {
      // Form should remain visible
      resetPasswordForm.style.display = 'block';
    }
  })
  .catch(error => {
    console.error('Error verifying token:', error);
    // Show error message and hide form
    if (errorMessage) {
      errorMessage.textContent = error.message || 'Invalid or expired reset token.';
      errorMessage.classList.add('show');
      errorMessage.style.display = 'block'; // Ensure it's visible
    }
    if (resetPasswordForm) {
      resetPasswordForm.style.display = 'none';
    }
  });

  resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset messages
    errorMessage.classList.remove('show');
    successMessage.classList.remove('show');
    errorMessage.textContent = '';
    successMessage.textContent = '';

    // Get form data
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      if (errorMessage) {
        errorMessage.textContent = 'Passwords do not match.';
        errorMessage.classList.add('show');
        errorMessage.style.display = 'block'; // Ensure it's visible
      }
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      if (errorMessage) {
        errorMessage.textContent = 'Password must be at least 6 characters.';
        errorMessage.classList.add('show');
        errorMessage.style.display = 'block'; // Ensure it's visible
      }
      return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Resetting...';

    try {
      const response = await fetch('/api/password-reset/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to reset password');
      }

      // Success - show message and redirect
      successMessage.textContent = data.message || 'Password reset successfully! Redirecting to login...';
      successMessage.classList.add('show');

      // Redirect to login after short delay
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } catch (error) {
      // Show error message
      if (errorMessage) {
        errorMessage.textContent = error.message || 'An error occurred. Please try again.';
        errorMessage.classList.add('show');
        errorMessage.style.display = 'block'; // Ensure it's visible
      }

      // Re-enable submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reset Password';
      }
    }
  });
});
