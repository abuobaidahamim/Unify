// js/post.js
const db = firebase.firestore();

export async function createPost(text) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Not authenticated');
    // No profilePicURL stored – it will be fetched from the user document when displaying
    const post = {
        userId: user.uid,
        text: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('posts').add(post);
}

export async function loadPosts() {
    const postsContainer = document.getElementById('postsFeed');
    if (!postsContainer) return;
    postsContainer.innerHTML = '<p>Loading posts...</p>';

    try {
        const snapshot = await db.collection('posts')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        if (snapshot.empty) {
            postsContainer.innerHTML = '<p>No posts yet. Be the first to post!</p>';
            return;
        }

        let html = '';
        for (const doc of snapshot.docs) {
            const post = doc.data();
            const userDoc = await db.collection('users').doc(post.userId).get();
            const user = userDoc.exists ? userDoc.data() : { firstName: 'Unknown', lastName: '' };
            const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
            // Use the user's current profile picture (or placeholder)
            const profilePicURL = user.profilePicURL || 'https://placehold.co/40';
            const time = post.createdAt ? post.createdAt.toDate().toLocaleString() : 'Just now';
            html += `
                <div class="post-item">
                    <div class="post-header">
                        <img src="${profilePicURL}" alt="Profile">
                        <span class="post-author">${userName}</span>
                        <span class="post-time">${time}</span>
                    </div>
                    <div class="post-content">${post.text}</div>
                </div>
            `;
        }
        postsContainer.innerHTML = html;
    } catch (error) {
        console.error('Error loading posts:', error);
        postsContainer.innerHTML = '<p>Error loading posts.</p>';
    }
}

// Attach event listener when DOM is ready
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