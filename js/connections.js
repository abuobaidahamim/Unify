// js/connections.js
import { initFilter } from './filter.js';
import { getCurrentUserProfile } from './auth.js';
import { updateNotificationBadge, updateMessagesBadge } from './badge.js';

const db = firebase.firestore();

firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Load current user's profile for navbar picture
    const currentProfile = await getCurrentUserProfile();
    if (currentProfile && currentProfile.profilePicURL) {
        document.getElementById('navProfilePic').src = currentProfile.profilePicURL;
    }

    await updateNotificationBadge();
    await updateMessagesBadge();
    // Load connections for this user
    await loadConnections(user.uid);
    initFilter();

    // Placeholder for other navbar icons (if any)
    document.querySelectorAll('.nav-icon:not([data-tooltip="Home"]):not([data-tooltip="Notifications"]):not([data-tooltip="Connections"]):not([data-tooltip="Messages"])').forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = icon.getAttribute('data-tooltip');
            console.log(`Attempted to navigate to ${pageName} page, but it is under construction.`);
            alert(`The ${pageName} page is coming soon! We'll notify you when it's ready.`);
        });
    });

    // Profile icon click
    document.getElementById('profileIcon').addEventListener('click', () => {
        window.location.href = 'personal-profile.html';
    });
});

async function loadConnections(uid) {
    const container = document.getElementById('connectionsList');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        // Get all accepted friend requests where user is either fromUserId or toUserId
        const [sentSnapshot, receivedSnapshot] = await Promise.all([
            db.collection('friendRequests')
                .where('fromUserId', '==', uid)
                .where('status', '==', 'accepted')
                .get(),
            db.collection('friendRequests')
                .where('toUserId', '==', uid)
                .where('status', '==', 'accepted')
                .get()
        ]);

        const connectedUserIds = new Set();
        sentSnapshot.forEach(doc => connectedUserIds.add(doc.data().toUserId));
        receivedSnapshot.forEach(doc => connectedUserIds.add(doc.data().fromUserId));

        if (connectedUserIds.size === 0) {
            container.innerHTML = '<p>No connections yet.</p>';
            return;
        }

        // Fetch user details for each connected user
        const users = [];
        for (const userId of connectedUserIds) {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                users.push({ id: userId, ...userDoc.data() });
            }
        }

        // Sort by firstName, then lastName (case-insensitive)
        users.sort((a, b) => {
            const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
            const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
            return nameA.localeCompare(nameB);
        });

        let html = '';
        users.forEach(user => {
            const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
            const pic = user.profilePicURL || 'https://placehold.co/50';
            html += `
                <div class="connection-item" data-userid="${user.id}">
                    <img src="${pic}" alt="${name}">
                    <span class="connection-name">${name}</span>
                </div>
            `;
        });
        container.innerHTML = html;

        // Add click listeners
        document.querySelectorAll('.connection-item').forEach(item => {
            item.addEventListener('click', () => {
                const userId = item.dataset.userid;
                window.location.href = `people-profile.html?uid=${userId}`;
            });
        });
    } catch (error) {
        console.error('Error loading connections:', error);
        container.innerHTML = '<p>Error loading connections. Check console.</p>';
    }
}