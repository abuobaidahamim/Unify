// js/messages.js
import { initFilter } from './filter.js';
import { getCurrentUserProfile } from './auth.js';
import { updateMessagesBadge } from './badge.js';
import { updateNotificationBadge } from './badge.js';

const db = firebase.firestore();

firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    const currentProfile = await getCurrentUserProfile();
    if (currentProfile?.profilePicURL) {
        document.getElementById('navProfilePic').src = currentProfile.profilePicURL;
    }

    await updateNotificationBadge();
    await updateMessagesBadge();

    await loadConversations(user.uid);
    initFilter();

    document.getElementById('profileIcon').addEventListener('click', () => {
        window.location.href = 'personal-profile.html';
    });

    // Nav icons placeholders (messages icon is current page, so no alert)
    document.querySelectorAll('.nav-icon:not([data-tooltip="Home"]):not([data-tooltip="Notifications"]):not([data-tooltip="Connections"]):not([data-tooltip="Messages"])').forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = icon.getAttribute('data-tooltip');                console.log(`Attempted to navigate to ${pageName} page, but it is under construction.`);
            alert(`The ${pageName} page is coming soon! We'll notify you when it's ready.`);
        });
    });
});

async function loadConversations(currentUid) {
    const container = document.getElementById('conversationsList');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const snapshot = await db.collection('conversations')
            .where('participants', 'array-contains', currentUid)
            .orderBy('updatedAt', 'desc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<p>No conversations yet.</p>';
            return;
        }

        // Collect other user IDs
        const otherUserIds = [];
        snapshot.docs.forEach(doc => {
            const conv = doc.data();
            const otherUid = conv.participants.find(uid => uid !== currentUid);
            if (otherUid) otherUserIds.push(otherUid);
        });

        // Batch fetch all other users
        const userDocs = await Promise.all(otherUserIds.map(uid => db.collection('users').doc(uid).get()));
        const userMap = {};
        userDocs.forEach(doc => {
            if (doc.exists) userMap[doc.id] = doc.data();
        });

        let html = '';
        for (const doc of snapshot.docs) {
            const conv = doc.data();
            const otherUid = conv.participants.find(uid => uid !== currentUid);
            const user = userMap[otherUid] || { firstName: 'Unknown', lastName: '' };
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
            const profilePic = user.profilePicURL || 'https://placehold.co/50';

            let lastMessagePreview = conv.lastMessage || '';
            if (conv.lastSender === currentUid) {
                lastMessagePreview = 'You: ' + lastMessagePreview;
            } else {
                lastMessagePreview = fullName.split(' ')[0] + ': ' + lastMessagePreview;
            }
            if (lastMessagePreview.length > 50) {
                lastMessagePreview = lastMessagePreview.substring(0, 47) + '...';
            }

            const time = conv.lastTimestamp ? conv.lastTimestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const unreadCount = conv.unreadCount?.[currentUid] || 0;
            const unreadClass = unreadCount > 0 ? 'unread' : '';

            html += `
                <div class="conversation-item ${unreadClass}" data-userid="${otherUid}">
                    <img src="${profilePic}" alt="${fullName}">
                    <div class="conversation-info">
                        <div class="conversation-name">${fullName}</div>
                        <div class="conversation-last-message">${lastMessagePreview}</div>
                    </div>
                    <div class="conversation-time">${time}</div>
                </div>
            `;
        }
        container.innerHTML = html;

        document.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const otherUid = item.dataset.userid;
                window.location.href = `inbox.html?uid=${otherUid}`;
            });
        });

        await updateMessagesBadge();
    } catch (error) {
        console.error('Error loading conversations:', error);
        container.innerHTML = '<p>Error loading conversations. Check console.</p>';
    }
}