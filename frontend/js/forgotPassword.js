document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded!");

    // Forgot Password Form
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const responseMessage = document.getElementById('responseMessage');

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;

            try {
                const response = await fetch('http://localhost:5000/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();
                console.log('Response Data:', data);  // Debugging line

                if (response.ok) {
                    responseMessage.style.color = 'green';
                    responseMessage.textContent = data.message;
                } else {
                    responseMessage.style.color = 'red';
                    responseMessage.textContent = data.message || 'Error occurred while sending reset link.';
                }
            } catch (error) {
                console.error('Error:', error);
                responseMessage.style.color = 'red';
                responseMessage.textContent = 'Failed to connect to server.';
            }
        });
    } else {
        console.error("forgotPasswordForm element not found!");
    }

    // Reset Password Form
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const newPassword = document.getElementById('newPassword').value;
            const responseMessage = document.getElementById('responseMessage');

            if (newPassword.length < 8) {
                responseMessage.style.color = 'red';
                responseMessage.textContent = 'Password must be at least 8 characters long.';
                return;
            }

            try {
                const res = await fetch('http://localhost:5000/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, newPassword })
                });

                const data = await res.json();

                if (res.ok) {
                    responseMessage.style.color = 'green';
                    responseMessage.textContent = data.message;
                } else {
                    responseMessage.style.color = 'red';
                    responseMessage.textContent = data.message || 'Failed to reset password.';
                }
            } catch (error) {
                console.error('Error:', error);
                responseMessage.style.color = 'red';
                responseMessage.textContent = 'Failed to connect to server.';
            }
        });
    } else {
        console.error("resetPasswordForm element not found!");
    }
});
