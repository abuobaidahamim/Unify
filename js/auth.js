// js/auth.js - Firebase integrated version

const auth = firebase.auth();
const db = firebase.firestore();

const ALLOWED_DOMAIN = ".edu";

/**
 * Validates that the email belongs to the allowed domain.
 * @param {string} email
 * @returns {boolean}
 */

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
        console.error("Full login error:", error);
        let message = "Login failed. Please check your credentials.";
        let code = error.code;
        if (error.code === 'auth/invalid-login-credentials') {
            message = "Invalid email or password. If you don't have an account, please sign up.";
        } else if (error.code === 'auth/too-many-requests') {
            message = "Too many failed attempts. Try again later.";
        }
        return { success: false, message, code };
    }
}

/**
 * Register user with Firebase Authentication.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, message?: string, user?: object}>}
 */

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
    if (!user) {
        console.log("getCurrentUserProfile: No current user");
        return null;
    }
    try {
        console.log("getCurrentUserProfile: Fetching profile for UID:", user.uid);
        const doc = await db.collection('users').doc(user.uid).get();
        console.log("getCurrentUserProfile: Doc exists?", doc.exists);
        if (doc.exists) {
            console.log("getCurrentUserProfile: Data:", doc.data());
            return doc.data();
        } else {
            console.log("getCurrentUserProfile: Document does not exist");
            return null;
        }
    } catch (error) {
        console.error("Error fetching profile:", error);
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

/**
 * Update user profile data in Firestore.
 * @param {Object} profileData - The fields to update.
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function updateUserProfile(profileData) {
    const user = auth.currentUser;
    if (!user) return { success: false, message: "Not authenticated" };
    try {
        await db.collection('users').doc(user.uid).update(profileData);
        return { success: true };
    } catch (error) {
        console.error("Error updating profile:", error);
        return { success: false, message: error.message };
    }
}

/**
 * Upload a profile picture to Firebase Storage and update user document.
 * @param {File} file - The image file to upload.
 * @returns {Promise<string>} The download URL of the uploaded image.
 */
const IMGBB_API_KEY = 'ee7f7e80eab6dd342c95ec47b83f84e1'; 

export async function uploadProfilePicture(file) {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    // Prepare form data for ImgBB
    const formData = new FormData();
    formData.append('image', file);

    try {
        // Upload to ImgBB
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Upload failed');
        }

        const data = await response.json();
        const imageUrl = data.data.url; // Direct image URL

        // Save the URL to Firestore
        await db.collection('users').doc(user.uid).update({
            profilePicURL: imageUrl
        });

        return imageUrl;
    } catch (error) {
        console.error('ImgBB upload error:', error);
        throw error;
    }
}

// Upload any image to ImgBB (for chat attachments) – returns URL only, no Firestore update
export async function uploadChatImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Upload failed');
        }

        const data = await response.json();
        return data.data.url; // Direct image URL
    } catch (error) {
        console.error('ImgBB upload error:', error);
        throw error;
    }
}