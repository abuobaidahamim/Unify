// js/signup.js
import { isValidStudentEmail, checkPasswordStrength, isPasswordStrong, registerUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('signupForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const reqBox = document.getElementById('passwordRequirements');
    const reqLength = document.getElementById('reqLength');
    const reqLower = document.getElementById('reqLower');
    const reqUpper = document.getElementById('reqUpper');
    const reqNumber = document.getElementById('reqNumber');
    const reqSpecial = document.getElementById('reqSpecial');

    // Show password requirements on focus
    passwordInput.addEventListener('focus', () => {
        reqBox.classList.add('show');
    });

    // Real-time password strength update
    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const checks = checkPasswordStrength(password);

        updateRequirement(reqLength, checks.length);
        updateRequirement(reqLower, checks.lower);
        updateRequirement(reqUpper, checks.upper);
        updateRequirement(reqNumber, checks.number);
        updateRequirement(reqSpecial, checks.special);

        passwordError.textContent = '';
    });

    // Email domain hint while typing
    emailInput.addEventListener('input', () => {
        const email = emailInput.value.trim();
        if (email && !isValidStudentEmail(email)) {
            emailError.textContent = 'Must end with @diu.edu.bd';
        } else {
            emailError.textContent = '';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        emailError.textContent = '';
        passwordError.textContent = '';

        // Client-side validation
        if (!isValidStudentEmail(email)) {
            emailError.textContent = 'Please use a valid student email (must contain .edu in the domain).';
            return;
        }

        if (!isPasswordStrong(password)) {
            passwordError.textContent = 'Password does not meet the requirements.';
            reqBox.classList.add('show');
            return;
        }

        // Call Firebase registration
        const result = await registerUser(email, password);
        if (result.success) {
            // Redirect to profile setup page
            window.location.href = 'profile-setup.html';
        } else {
            // Show error
            if (result.message.toLowerCase().includes('email')) {
                emailError.textContent = result.message;
            } else {
                passwordError.textContent = result.message;
            }
        }
    });

    function updateRequirement(element, isValid) {
        if (isValid) {
            element.classList.add('valid');
        } else {
            element.classList.remove('valid');
        }
    }
});