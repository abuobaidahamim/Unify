// js/notifications.js
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

    // Load notifications for this user
    await loadNotifications(user.uid);
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

async function loadNotifications(uid) {
    const container = document.getElementById('notificationsList');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const snapshot = await db.collection('notifications')
            .where('userId', '==', uid)
            .orderBy('timestamp', 'desc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<p>No notifications yet.</p>';
            await updateNotificationBadge();
            return;
        }

        // Collect unique fromUserIds
        const fromUserIds = [...new Set(snapshot.docs.map(doc => doc.data().fromUserId))];
        // Fetch all users in batch
        const userDocs = await Promise.all(fromUserIds.map(id => db.collection('users').doc(id).get()));
        const userMap = {};
        userDocs.forEach(doc => {
            if (doc.exists) userMap[doc.id] = doc.data();
        });

        let html = '';
        const unreadIds = [];
        for (const doc of snapshot.docs) {
            const notif = doc.data();
            const fromUser = userMap[notif.fromUserId] || { firstName: 'Unknown', lastName: '' };
            const fullName = `${fromUser.firstName || ''} ${fromUser.lastName || ''}`.trim() || 'Someone';
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
            const unreadClass = notif.read ? '' : 'unread';
            if (!notif.read) {
                unreadIds.push(doc.id);
            }
            html += `
                <div class="notification-item ${unreadClass}" data-userid="${notif.fromUserId}" data-notification-id="${doc.id}">
                    <img src="${profilePic}" alt="${fullName}">
                    <div class="notification-content">
                        <div class="notification-text">${text}</div>
                        <div class="notification-time">${time}</div>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;

        // Mark notifications as read on click (already done in click listener)
        document.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', async () => {
                const userId = item.dataset.userid;
                const notifId = item.dataset.notificationId;
                if (notifId) {
                    try {
                        await db.collection('notifications').doc(notifId).update({ read: true });
                        await updateNotificationBadge();
                    } catch (error) {
                        console.error('Error marking notification as read:', error);
                    }
                }
                window.location.href = `people-profile.html?uid=${userId}`;
            });
        });

        await updateNotificationBadge();
        await updateMessagesBadge();
    } catch (error) {
        console.error('Error loading notifications:', error);
        container.innerHTML = '<p>Error loading notifications. <button onclick="location.reload()">Retry</button></p>';
    }
}