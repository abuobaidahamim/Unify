// js/people-profile.js
import { initFilter } from './filter.js';

const db = firebase.firestore();

// Get target user ID from URL
const urlParams = new URLSearchParams(window.location.search);
const targetUserId = urlParams.get('uid');

firebase.auth().onAuthStateChanged(async (currentUser) => {
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    if (!targetUserId) {
        alert('No user specified.');
        window.location.href = 'home.html';
        return;
    }

    // If the target user is the current user, redirect to personal profile
    if (targetUserId === currentUser.uid) {
        window.location.href = 'personal-profile.html';
        return;
    }

    // Load target user's profile
    await loadUserProfile(targetUserId);
    // Load target user's posts
    loadUserPosts(targetUserId);
    // Initialize filter
    initFilter();

    // Nav icons (friends, messages, notifications) placeholders
    document.querySelectorAll('.nav-icon:not([data-tooltip="Home"])').forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            alert(`${icon.getAttribute('data-tooltip')} page coming soon!`);
        });
    });

    // Setup request button (placeholder)
    document.getElementById('requestBtn').addEventListener('click', () => {
        alert('Friend request feature coming soon!');
    });

    // Profile icon click – go to personal profile
    document.getElementById('profileIcon').addEventListener('click', () => {
        window.location.href = 'personal-profile.html';
    });
});

async function loadUserProfile(uid) {
    try {
        const doc = await db.collection('users').doc(uid).get();
        if (!doc.exists) {
            alert('User not found.');
            window.location.href = 'home.html';
            return;
        }
        const profile = doc.data();

        // Fill top section
        const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'User';
        document.getElementById('profileName').textContent = fullName;
        document.getElementById('profileBio').textContent = profile.bio || 'No bio yet.';

        // Set profile picture if exists
        if (profile.profilePicURL) {
            document.getElementById('profilePic').src = profile.profilePicURL;
        }

        // Fill personal details
        document.getElementById('currentLocation').textContent = profile.currentLocation || 'Not set';
        document.getElementById('permanentLocation').textContent = profile.permanentLocation || 'Not set';

        // Job details
        const employment = profile.employment;
        const jobItem = document.getElementById('jobItem');
        const jobSpan = document.getElementById('jobDetails');
        if (employment === 'job' && profile.company && profile.role) {
            jobItem.style.display = 'flex';
            jobSpan.textContent = `${profile.company}, ${profile.role}`;
        } else if (employment === 'entrepreneur' && profile.sector) {
            jobItem.style.display = 'flex';
            jobSpan.textContent = `Entrepreneur (${profile.sector})`;
        } else if (employment === 'business' && profile.businessType) {
            jobItem.style.display = 'flex';
            jobSpan.textContent = `Business (${profile.businessType})`;
        } else {
            jobItem.style.display = 'none';
        }

        // University
        document.getElementById('university').textContent = profile.university || 'Not set';

        // Department and Major
        const dept = profile.department || 'Not set';
        const major = profile.major && profile.major !== 'None' ? `Major in ${profile.major}` : '';
        document.getElementById('departmentMajor').textContent = major ? `${dept} (${major})` : dept;

        // Batch
        document.getElementById('batch').textContent = profile.batch || 'Not set';

    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Error loading profile.');
    }
}

async function loadUserPosts(uid) {
    const postsContainer = document.getElementById('postsFeed');
    postsContainer.innerHTML = '<p>Loading posts...</p>';

    try {
        const snapshot = await db.collection('posts')
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            postsContainer.innerHTML = '<p>No posts yet.</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const post = doc.data();
            const time = post.createdAt ? post.createdAt.toDate().toLocaleString() : 'Just now';
            html += `
                <div class="post-item">
                    <div class="post-header">
                        <img src="${post.profilePicURL || 'https://via.placeholder.com/40'}" alt="Profile">
                        <span class="post-author">${document.getElementById('profileName').textContent}</span>
                        <span class="post-time">${time}</span>
                    </div>
                    <div class="post-content">${post.text}</div>
                </div>
            `;
        });
        postsContainer.innerHTML = html;
    } catch (error) {
        console.error('Error loading posts:', error);
        postsContainer.innerHTML = `<p>Error loading posts: ${error.message}</p>`;
    }
}