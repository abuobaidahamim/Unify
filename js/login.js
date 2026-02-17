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
        // if (result.success) {
        //     // Redirect to profile setup (since we haven't built dashboard yet)
        //     window.location.href = 'profile-setup.html';
        // } else {
        //     emailError.textContent = result.message || 'Login failed.';
        // }
        if (result.success) {
        // Check if user has a profile
        const hasProfile = await userHasProfile();
        if (hasProfile) {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'profile-setup.html';
        }
        } else {
            emailError.textContent = result.message || 'Login failed.';
        }
    });
});