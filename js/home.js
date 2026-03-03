// js/home.js
import { getCurrentUserProfile, userHasProfile } from './auth.js';
import { loadPosts } from './post.js';
import { initFilter } from './filter.js';

document.addEventListener('DOMContentLoaded', () => {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Check if profile exists
        const hasProfile = await userHasProfile();
        if (!hasProfile) {
            window.location.href = 'profile-setup.html';
            return;
        }

        // Load user profile
        const profile = await getCurrentUserProfile();
        if (profile) {
            // Update UI
            const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'User';
            document.getElementById('sidebarName').textContent = fullName;
            document.getElementById('sidebarBio').textContent = profile.bio || 'No bio yet.';

            // Set profile pictures if URL exists
            if (profile.profilePicURL) {
                document.getElementById('navProfilePic').src = profile.profilePicURL;
                document.getElementById('sidebarProfilePic').src = profile.profilePicURL;
                document.getElementById('posterPic').src = profile.profilePicURL;
            }
        }

        // Load posts and initialize search
        loadPosts();
        // initSearch();
        initFilter();

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await firebase.auth().signOut();
            window.location.href = 'index.html';
        });

        // Profile icon click – redirect to personal profile
        document.getElementById('profileIcon').addEventListener('click', () => {
            window.location.href = 'personal-profile.html';
        });

        // Other icons (friends, messages) placeholders
        document.querySelectorAll('.nav-icon:not([data-tooltip="Home"]):not([data-tooltip="Notifications"])').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.preventDefault();
                alert(`${icon.getAttribute('data-tooltip')} page coming soon!`);
            });
        });
    });
});