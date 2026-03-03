// js/login.js
// import { isValidStudentEmail, loginUser } from './auth.js';
import { isValidStudentEmail, loginUser, userHasProfile } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailError = document.getElementById('emailError');

    // Real-time email domain hint
    emailInput.addEventListener('input', () => {
        const email = emailInput.value.trim();
        if (email && !isValidStudentEmail(email)) {
            emailError.textContent = 'Must end with .edu';
        } else {
            emailError.textContent = '';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        emailError.textContent = '';

        // Client-side domain check
        if (!isValidStudentEmail(email)) {
            emailError.textContent = 'Please use a student email (.edu).';
            return;
        }

        const result = await loginUser(email, password);
        if (result.success) {
            console.log('Login successful for:', email);
            console.log('Checking if user has profile...');
            const hasProfile = await userHasProfile();
            console.log('hasProfile =', hasProfile);
            if (hasProfile) {
                console.log('Redirecting to dashboard');
                window.location.href = 'home.html';
            } else {
                console.log('Redirecting to profile-setup');
                window.location.href = 'profile-setup.html';
            }
        } else {
            if (result.code === 'auth/invalid-login-credentials') {
                emailError.innerHTML = 'Invalid email or password. <a href="signup.html" style="color:#1877f2; text-decoration:underline;">Create new account</a>';
            } else {
                emailError.textContent = result.message || 'Login failed.';
            }
        }
    });
});