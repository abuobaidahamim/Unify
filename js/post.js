// js/post.js
import { getCurrentUserProfile } from './auth.js';

const db = firebase.firestore();

function makeLinksClickable(text) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

export async function createPost(text) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Not authenticated');
    const userProfile = await getCurrentUserProfile();
    const post = {
        userId: user.uid,
        text: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        userName: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'User',
        userProfilePicURL: userProfile.profilePicURL || 'https://placehold.co/40'
    };
    await db.collection('posts').add(post);
}

export async function loadPosts() {
    const postsContainer = document.getElementById('postsFeed');
    if (!postsContainer) return;
    postsContainer.innerHTML = '<div class="spinner"></div>';

    try {
        const snapshot = await db.collection('posts')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        if (snapshot.empty) {
            postsContainer.innerHTML = '<p>No posts yet. Be the first to post!</p>';
            return;
        }

        // Collect posts and track which need user data
        const postsData = [];
        const missingUserIds = new Set();
        for (const doc of snapshot.docs) {
            const post = doc.data();
            postsData.push(post);
            if (!post.userName || !post.userProfilePicURL) {
                missingUserIds.add(post.userId);
            }
        }

        // Batch fetch all missing user data in parallel
        let userMap = {};
        if (missingUserIds.size > 0) {
            const userDocs = await Promise.all(
                Array.from(missingUserIds).map(uid => db.collection('users').doc(uid).get())
            );
            userMap = {};
            userDocs.forEach(doc => {
                if (doc.exists) userMap[doc.id] = doc.data();
            });
        }

        // Build HTML
        let html = '';
        for (const post of postsData) {
            let userName = post.userName;
            let profilePicURL = post.userProfilePicURL;
            if (!userName || !profilePicURL) {
                const user = userMap[post.userId] || { firstName: 'Unknown', lastName: '' };
                userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
                profilePicURL = user.profilePicURL || 'https://placehold.co/40';
            }
            const time = post.createdAt ? post.createdAt.toDate().toLocaleString() : 'Just now';
            const postContent = makeLinksClickable(post.text);
            html += `
                <div class="post-item">
                    <div class="post-header">
                        <img src="${profilePicURL}" alt="Profile">
                        <span class="post-author">${userName}</span>
                        <span class="post-time">${time}</span>
                    </div>
                    <div class="post-content">${postContent}</div>
                </div>
            `;
        }
        postsContainer.innerHTML = html;
    } catch (error) {
        console.error('Error loading posts:', error);
        postsContainer.innerHTML = '<p>Error loading posts.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const postBtn = document.getElementById('postBtn');
    const postText = document.getElementById('postText');

    if (!postBtn) {
        console.error('Post button not found!');
        return;
    }

    postBtn.addEventListener('click', async () => {
        const text = postText.value.trim();
        if (!text) {
            alert('Please write something to post.');
            return;
        }
        try {
            await createPost(text);
            postText.value = '';
            loadPosts(); // Refresh feed
        } catch (error) {
            console.error('Error posting:', error);
            alert('Failed to post. Please try again.');
        }
    });
});