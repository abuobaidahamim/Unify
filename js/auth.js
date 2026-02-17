// js/auth.js - Firebase integrated version

// Firebase is now globally available via the scripts we added
const auth = firebase.auth();
const db = firebase.firestore();

const ALLOWED_DOMAIN = ".edu";

/**
 * Validates that the email belongs to the allowed domain.
 * @param {string} email
 * @returns {boolean}
 */
// export function isValidStudentEmail(email) {
//     return email.trim().toLowerCase().endsWith(ALLOWED_DOMAIN);
// }
export function isValidStudentEmail(email) {
    // Split email into local part and domain
    const parts = email.trim().toLowerCase().split('@');
    if (parts.length !== 2) return false; // invalid email format
    const domain = parts[1];
    // Check if the domain contains ".edu" (e.g., .edu, .edu.bd, .edu.au)
    return domain.includes('.edu');
}
/**
 * Checks password strength and returns an object with individual rule statuses.
 * @param {string} password
 * @returns {Object} { length: boolean, lower: boolean, upper: boolean, number: boolean, special: boolean }
 */
export function checkPasswordStrength(password) {
    return {
        length: password.length >= 8,
        lower: /[a-z]/.test(password),
        upper: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    };
}

/**
 * Returns true if all password rules are satisfied.
 * @param {string} password
 * @returns {boolean}
 */
export function isPasswordStrong(password) {
    const checks = checkPasswordStrength(password);
    return checks.length && checks.lower && checks.upper && checks.number && checks.special;
}

/**
 * Login user with Firebase Authentication.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, message?: string, user?: object}>}
 */
export async function loginUser(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        let message = "Login failed. Please check your credentials.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            message = "Invalid email or password.";
        } else if (error.code === 'auth/too-many-requests') {
            message = "Too many failed attempts. Try again later.";
        }
        return { success: false, message };
    }
}

/**
 * Register user with Firebase Authentication.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, message?: string, user?: object}>}
 */
// export async function registerUser(email, password) {
//     try {
//         const userCredential = await auth.createUserWithEmailAndPassword(email, password);
//         return { success: true, user: userCredential.user };
//     } catch (error) {
//         let message = "Registration failed.";
//         if (error.code === 'auth/email-already-in-use') {
//             message = "This email is already registered.";
//         } else if (error.code === 'auth/invalid-email') {
//             message = "Invalid email address.";
//         } else if (error.code === 'auth/weak-password') {
//             message = "Password is too weak. Use at least 6 characters.";
//         }
//         return { success: false, message };
//     }
// }

export async function registerUser(email, password) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("Firebase registration error:", error); // ADD THIS LINE
        let message = "Registration failed.";
        if (error.code === 'auth/email-already-in-use') {
            message = "This email is already registered.";
        } else if (error.code === 'auth/invalid-email') {
            message = "Invalid email address.";
        } else if (error.code === 'auth/weak-password') {
            message = "Password is too weak. Use at least 6 characters.";
        }
        return { success: false, message };
    }
}

/**
 * Save profile data to Firestore under the user's UID.
 * @param {Object} profileData
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function saveProfile(profileData) {
    // Get the currently logged-in user
    const user = auth.currentUser;
    if (!user) {
        return { success: false, message: "No authenticated user found." };
    }

    try {
        // Save to Firestore in 'users' collection, document ID = user.uid
        await db.collection('users').doc(user.uid).set({
            ...profileData,
            email: user.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error saving profile:", error);
        return { success: false, message: "Failed to save profile. Please try again." };
    }
}

/**
 * Get current authenticated user (useful for checking state).
 * @returns {object|null}
 */
export function getCurrentUser() {
    return auth.currentUser;
}





/**
 * Get the current user's profile data from Firestore.
 * @returns {Promise<Object|null>} The user's profile data or null if not found.
 */
export async function getCurrentUserProfile() {
    const user = auth.currentUser;
    if (!user) return null;
    try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
            return doc.data();
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

/**
 * Check if the current user has a profile document.
 * @returns {Promise<boolean>} True if profile exists.
 */
export async function userHasProfile() {
    const profile = await getCurrentUserProfile();
    return profile !== null;
}