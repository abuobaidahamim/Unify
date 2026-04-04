// js/badge.js
import { getCurrentUser } from './auth.js';

const db = firebase.firestore();

export async function updateNotificationBadge() {
    const user = getCurrentUser();
    if (!user) return;
    try {
        const snapshot = await db.collection('notifications')
            .where('userId', '==', user.uid)
            .where('read', '==', false)
            .get();
        const count = snapshot.size;
        const badge = document.getElementById('notificationsBadge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error updating notification badge:', error);
    }
}

export async function updateMessagesBadge() {
    const user = getCurrentUser();
    if (!user) return;
    try {
        const snapshot = await db.collection('conversations')
            .where('participants', 'array-contains', user.uid)
            .get();
        let total = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.unreadCount && data.unreadCount[user.uid]) {
                total += data.unreadCount[user.uid];
            }
        });
        const badge = document.getElementById('messagesBadge');
        if (badge) {
            if (total > 0) {
                badge.textContent = total;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error updating messages badge:', error);
    }
}