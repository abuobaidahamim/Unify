// js/preview.js
import { initFilter } from './preview-filter.js'; 

const db = firebase.firestore();

// Helper to convert URLs to clickable links
function makeLinksClickable(text) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

document.addEventListener('DOMContentLoaded', () => {
    initFilter();  
    
    loadAlumni();
    loadStudents();
    loadRecentPosts();

    // See more buttons
    document.getElementById('seeMoreAlumni').addEventListener('click', () => {
        alert('Log in first to see all alumni.');
    });
    document.getElementById('seeMoreStudent').addEventListener('click', () => {
        alert('Log in first to see all students.');
    });
    document.getElementById('seeMorePosts').addEventListener('click', () => {
        alert('Log in first to see more posts.');
    });

    // Profile grid items click (event delegation)
    document.querySelector('.right-content').addEventListener('click', (e) => {
        const profileItem = e.target.closest('.profile-grid-item');
        if (profileItem) {
            alert('Log in first to view profiles.');
        }
    });

    // Intercept link clicks in posts to show login alert
    document.querySelector('.right-content').addEventListener('click', (e) => {
        const link = e.target.closest('.post-content a');
        if (link) {
            e.preventDefault();
            alert('Log in first to follow links.');
        }
    });
});

async function loadAlumni() {
    const grid = document.getElementById('alumniGrid');
    try {
        const snapshot = await db.collection('users')
            .where('status', '==', 'alumni')
            .limit(6)
            .get();
        if (snapshot.empty) {
            grid.innerHTML = '<p>No alumni yet.</p>';
            return;
        }
        let html = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
            const pic = user.profilePicURL || 'https://placehold.co/60';
            html += `
                <div class="profile-grid-item" data-userid="${doc.id}">
                    <img src="${pic}" alt="${name}">
                    <span>${name}</span>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (error) {
        console.error('Error loading alumni:', error);
        grid.innerHTML = '<p>Error loading alumni.</p>';
    }
}

async function loadStudents() {
    const grid = document.getElementById('studentGrid');
    try {
        const snapshot = await db.collection('users')
            .where('status', '==', 'student')
            .limit(6)
            .get();
        if (snapshot.empty) {
            grid.innerHTML = '<p>No students yet.</p>';
            return;
        }
        let html = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
            const pic = user.profilePicURL || 'https://placehold.co/60';
            html += `
                <div class="profile-grid-item" data-userid="${doc.id}">
                    <img src="${pic}" alt="${name}">
                    <span>${name}</span>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (error) {
        console.error('Error loading students:', error);
        grid.innerHTML = '<p>Error loading students.</p>';
    }
}

async function loadRecentPosts() {
    const container = document.getElementById('postsFeed');
    try {
        const snapshot = await db.collection('posts')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        if (snapshot.empty) {
            container.innerHTML = '<p>No posts yet.</p>';
            return;
        }
        let html = '';
        for (const doc of snapshot.docs) {
            const post = doc.data();
            let userName = post.userName;
            let profilePic = post.userProfilePicURL;
            if (!userName || !profilePic) {
                // Old post – fetch user data
                const userDoc = await db.collection('users').doc(post.userId).get();
                const user = userDoc.exists ? userDoc.data() : { firstName: 'Unknown', lastName: '' };
                userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
                profilePic = user.profilePicURL || 'https://placehold.co/40';
            }
            const time = post.createdAt ? post.createdAt.toDate().toLocaleString() : 'Just now';
            const postContent = makeLinksClickable(post.text);
            html += `
                <div class="post-item">
                    <div class="post-header">
                        <img src="${profilePic}" alt="${userName}">
                        <span class="post-author">${userName}</span>
                        <span class="post-time">${time}</span>
                    </div>
                    <div class="post-content">${postContent}</div>
                </div>
            `;
        }
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading posts:', error);
        container.innerHTML = '<p>Error loading posts. Check console.</p>';
    }
}