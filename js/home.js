// js/home.js
import { getCurrentUserProfile, userHasProfile } from './auth.js';
import { loadPosts } from './post.js';
import { initFilter } from './filter.js';
import { updateNotificationBadge, updateMessagesBadge } from './badge.js';

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

        // inside onAuthStateChanged, after loading profile:
        await updateNotificationBadge();
        await updateMessagesBadge();

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

        // Other icons placeholders
        document.querySelectorAll('.nav-icon:not([data-tooltip="Home"]):not([data-tooltip="Notifications"]):not([data-tooltip="Connections"]):not([data-tooltip="Messages"])').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.preventDefault();
                const pageName = icon.getAttribute('data-tooltip');
                console.log(`Attempted to navigate to ${pageName} page, but it is under construction.`);
                alert(`The ${pageName} page is coming soon! We'll notify you when it's ready.`);
            });
        });
    });
});