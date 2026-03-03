// js/personal-profile.js
import { getCurrentUserProfile } from './auth.js';
import { initFilter } from './filter.js';

const db = firebase.firestore();
let currentUser = null;
let currentProfile = null;

// Check authentication
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = user;
    await loadProfile();

    // After profile is loaded, set profile picture if exists
    if (currentProfile && currentProfile.profilePicURL) {
        document.getElementById('profilePic').src = currentProfile.profilePicURL;
        document.getElementById('navProfilePic').src = currentProfile.profilePicURL;
    }

    // Load user's posts
    loadUserPosts();
    initFilter();

    // Set up all event listeners
    setupEventListeners();
});

async function loadProfile() {
    const profile = await getCurrentUserProfile();
    if (!profile) {
        window.location.href = 'profile-setup.html';
        return;
    }
    currentProfile = profile;

    // Fill top section
    const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'User';
    document.getElementById('profileName').textContent = fullName;
    document.getElementById('profileBio').textContent = profile.bio || 'No bio yet.';

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
}

function setupEventListeners() {
    // Edit buttons
    document.getElementById('editProfileBtn').addEventListener('click', () => {
        window.location.href = 'edit-profile.html';
    });
    document.getElementById('editDetailsIcon').addEventListener('click', () => {
        window.location.href = 'edit-profile.html';
    });

    // Post button
    const postBtn = document.getElementById('postBtn');
    const postText = document.getElementById('postText');
    postBtn.addEventListener('click', async () => {
        const text = postText.value.trim();
        if (!text) {
            alert('Please write something to post.');
            return;
        }
        try {
            await db.collection('posts').add({
                userId: currentUser.uid,
                text: text,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                profilePicURL: currentProfile?.profilePicURL || null
            });
            postText.value = '';
            loadUserPosts();
        } catch (error) {
            console.error('Error posting:', error);
            alert('Failed to post. Please try again.');
        }
    });

    // Profile icon in navbar (optional)
    document.getElementById('profileIcon').addEventListener('click', () => {
        window.location.reload();
    });
    // Nav icons (friends, messages, notifications) placeholders
    document.querySelectorAll('.nav-icon:not([data-tooltip="Home"])').forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            alert(`${icon.getAttribute('data-tooltip')} page coming soon!`);
        });
    });
}

async function loadUserPosts() {
    const postsContainer = document.getElementById('postsFeed');
    postsContainer.innerHTML = '<p>Loading posts...</p>';

    try {
        const snapshot = await db.collection('posts')
            .where('userId', '==', currentUser.uid)
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