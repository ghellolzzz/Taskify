// Forgot password form handling
document.addEventListener('DOMContentLoaded', () => {
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');
  const submitBtn = document.getElementById('submitBtn');

  forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset messages
    errorMessage.classList.remove('show');
    successMessage.classList.remove('show');
    errorMessage.textContent = '';
    successMessage.textContent = '';

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Sending...';

    // Get form data
    const email = document.getElementById('email').value.trim();

    try {
      const response = await fetch('/api/password-reset/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to send reset link');
      }

      // Success - show message
      successMessage.textContent = data.message || 'If that email exists, a password reset link has been sent.';
      successMessage.classList.add('show');

      // In development, show the reset URL if provided
      if (data.resetUrl) {
        console.log('Reset URL (development only):', data.resetUrl);
        const devMessage = document.createElement('p');
        devMessage.style.marginTop = '10px';
        devMessage.style.fontSize = '0.9em';
        devMessage.style.color = '#666';
        devMessage.innerHTML = `Development: <a href="${data.resetUrl}" target="_blank">Click here to reset password</a>`;
        successMessage.appendChild(devMessage);
      }

      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Reset Link';
    } catch (error) {
      // Show error message
      errorMessage.textContent = error.message || 'An error occurred. Please try again.';
      errorMessage.classList.add('show');

      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Reset Link';
    }
  });
});
