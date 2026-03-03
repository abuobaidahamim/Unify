// js/notifications.js
import { initFilter } from './filter.js';
import { getCurrentUserProfile } from './auth.js';

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

    // Load notifications for this user
    await loadNotifications(user.uid);
    initFilter();

    // Profile icon click
    document.getElementById('profileIcon').addEventListener('click', () => {
        window.location.href = 'personal-profile.html';
    });
});

async function loadNotifications(uid) {
    const container = document.getElementById('notificationsList');
    container.innerHTML = '<p>Loading notifications...</p>';

    try {
        const snapshot = await db.collection('notifications')
            .where('userId', '==', uid)
            .orderBy('timestamp', 'desc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<p>No notifications yet.</p>';
            return;
        }

        let html = '';
        for (const doc of snapshot.docs) {
            const notif = doc.data();
            const fromUserDoc = await db.collection('users').doc(notif.fromUserId).get();
            const fromUser = fromUserDoc.exists ? fromUserDoc.data() : { firstName: 'Unknown', lastName: '' };
            const fullName = `${fromUser.firstName || ''} ${fromUser.lastName || ''}`.trim() || 'Someone';
            // Use placehold.co for reliable placeholder
            const profilePic = fromUser.profilePicURL || 'https://placehold.co/48x48';
            const time = notif.timestamp ? notif.timestamp.toDate().toLocaleString() : 'Just now';
            let text = '';
            if (notif.type === 'request_received') {
                text = `${fullName} sent you a request`;
            } else if (notif.type === 'request_accepted') {
                text = `${fullName} accepted your request`;
            } else {
                text = 'Notification';
            }
            html += `
                <div class="notification-item" data-userid="${notif.fromUserId}">
                    <img src="${profilePic}" alt="${fullName}">
                    <div class="notification-content">
                        <div class="notification-text">${text}</div>
                        <div class="notification-time">${time}</div>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;

        // Add click listeners to each notification
        document.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const userId = item.dataset.userid;
                window.location.href = `people-profile.html?uid=${userId}`;
            });
        });
    } catch (error) {
        console.error('Error loading notifications:', error);
        container.innerHTML = '<p>Error loading notifications. Check console.</p>';
    }
}