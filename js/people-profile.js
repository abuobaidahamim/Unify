// js/people-profile.js
import { initFilter } from './filter.js';
import { getCurrentUserProfile } from './auth.js';

const db = firebase.firestore();

// Get target user ID from URL
const urlParams = new URLSearchParams(window.location.search);
const targetUserId = urlParams.get('uid');
let targetProfile = null;

firebase.auth().onAuthStateChanged(async (currentUser) => {
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    // Load current user's profile for navbar picture
    const currentProfile = await getCurrentUserProfile();
    if (currentProfile && currentProfile.profilePicURL) {
        document.getElementById('navProfilePic').src = currentProfile.profilePicURL;
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

    // Nav icons (friends, messages) placeholders
    document.querySelectorAll('.nav-icon:not([data-tooltip="Home"]):not([data-tooltip="Notifications"])').forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            alert(`${icon.getAttribute('data-tooltip')} page coming soon!`);
        });
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
        targetProfile = doc.data();

        // Fill top section
        const fullName = `${targetProfile.firstName || ''} ${targetProfile.lastName || ''}`.trim() || 'User';
        document.getElementById('profileName').textContent = fullName;
        document.getElementById('profileBio').textContent = targetProfile.bio || 'No bio yet.';

        // Set profile picture if exists
        if (targetProfile.profilePicURL) {
            document.getElementById('profilePic').src = targetProfile.profilePicURL;
        }

        // Fill personal details
        document.getElementById('currentLocation').textContent = targetProfile.currentLocation || 'Not set';
        document.getElementById('permanentLocation').textContent = targetProfile.permanentLocation || 'Not set';

        // Job details
        const employment = targetProfile.employment;
        const jobItem = document.getElementById('jobItem');
        const jobSpan = document.getElementById('jobDetails');
        if (employment === 'job' && targetProfile.company && targetProfile.role) {
            jobItem.style.display = 'flex';
            jobSpan.textContent = `${targetProfile.company}, ${targetProfile.role}`;
        } else if (employment === 'entrepreneur' && targetProfile.sector) {
            jobItem.style.display = 'flex';
            jobSpan.textContent = `Entrepreneur (${targetProfile.sector})`;
        } else if (employment === 'business' && targetProfile.businessType) {
            jobItem.style.display = 'flex';
            jobSpan.textContent = `Business (${targetProfile.businessType})`;
        } else {
            jobItem.style.display = 'none';
        }

        // University
        document.getElementById('university').textContent = targetProfile.university || 'Not set';

        // Department and Major
        const dept = targetProfile.department || 'Not set';
        const major = targetProfile.major && targetProfile.major !== 'None' ? `Major in ${targetProfile.major}` : '';
        document.getElementById('departmentMajor').textContent = major ? `${dept} (${major})` : dept;

        // Batch
        document.getElementById('batch').textContent = targetProfile.batch || 'Not set';

        // Display social links
        displaySocialLinks(targetProfile);

        // Check friend status and set up button
        await checkFriendStatus(firebase.auth().currentUser.uid, uid);
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Error loading profile.');
    }
}

function displaySocialLinks(profile) {
    const section = document.getElementById('socialLinksSection');
    const container = document.getElementById('socialLinksContainer');
    const links = [];

    if (profile.github) links.push({ url: profile.github, icon: 'fab fa-github', name: 'GitHub' });
    if (profile.linkedin) links.push({ url: profile.linkedin, icon: 'fab fa-linkedin', name: 'LinkedIn' });
    if (profile.facebook) links.push({ url: profile.facebook, icon: 'fab fa-facebook', name: 'Facebook' });
    if (profile.instagram) links.push({ url: profile.instagram, icon: 'fab fa-instagram', name: 'Instagram' });
    if (profile.x) links.push({ url: profile.x, icon: 'fab fa-twitter', name: 'X' });

    if (links.length === 0) {
        section.style.display = 'none';
        return;
    }

    let html = '';
    links.forEach(link => {
        html += `<a href="${link.url}" target="_blank" rel="noopener noreferrer" title="${link.name}"><i class="${link.icon}"></i></a>`;
    });
    container.innerHTML = html;
    section.style.display = 'block';
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
        const profilePicURL = targetProfile?.profilePicURL || 'https://placehold.co/40';
        const userName = `${targetProfile?.firstName || ''} ${targetProfile?.lastName || ''}`.trim() || 'User';

        snapshot.forEach(doc => {
            const post = doc.data();
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
        });
        postsContainer.innerHTML = html;
    } catch (error) {
        console.error('Error loading posts:', error);
        postsContainer.innerHTML = `<p>Error loading posts: ${error.message}</p>`;
    }
}

// Friend request functions
async function checkFriendStatus(currentUid, targetUid) {
    const requestBtn = document.getElementById('requestBtn');
    if (!requestBtn) return;

    // Check for accepted request from current user to target
    const sentAccepted = await db.collection('friendRequests')
        .where('fromUserId', '==', currentUid)
        .where('toUserId', '==', targetUid)
        .where('status', '==', 'accepted')
        .limit(1)
        .get();

    if (!sentAccepted.empty) {
        requestBtn.innerHTML = '<i class="fas fa-check"></i> Connected';
        requestBtn.disabled = true;
        requestBtn.classList.add('connected');
        return;
    }

    // Check for accepted request from target to current user
    const receivedAccepted = await db.collection('friendRequests')
        .where('fromUserId', '==', targetUid)
        .where('toUserId', '==', currentUid)
        .where('status', '==', 'accepted')
        .limit(1)
        .get();

    if (!receivedAccepted.empty) {
        requestBtn.innerHTML = '<i class="fas fa-check"></i> Connected';
        requestBtn.disabled = true;
        requestBtn.classList.add('connected');
        return;
    }

    // Check for pending request from current user to target
    const sentPending = await db.collection('friendRequests')
        .where('fromUserId', '==', currentUid)
        .where('toUserId', '==', targetUid)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

    if (!sentPending.empty) {
        requestBtn.innerHTML = '<i class="fas fa-clock"></i> Request Sent';
        requestBtn.disabled = true;
        requestBtn.classList.add('sent');
        return;
    }

    // Check for pending request from target to current user
    const receivedPending = await db.collection('friendRequests')
        .where('fromUserId', '==', targetUid)
        .where('toUserId', '==', currentUid)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

    if (!receivedPending.empty) {
        const requestId = receivedPending.docs[0].id;
        requestBtn.innerHTML = '<i class="fas fa-user-check"></i> Accept Request';
        requestBtn.classList.add('accept');
        // Replace click handler to accept
        requestBtn.replaceWith(requestBtn.cloneNode(true));
        const newBtn = document.getElementById('requestBtn');
        newBtn.addEventListener('click', async () => {
            await acceptRequest(requestId, currentUid, targetUid);
        });
        return;
    }

    // No relationship – show Send Request
    requestBtn.innerHTML = '<i class="fas fa-user-plus"></i> Send Request';
    requestBtn.classList.remove('connected', 'sent', 'accept');
    requestBtn.disabled = false;
    requestBtn.replaceWith(requestBtn.cloneNode(true));
    const newBtn = document.getElementById('requestBtn');
    newBtn.addEventListener('click', async () => {
        await sendRequest(currentUid, targetUid);
    });
}

async function sendRequest(fromUid, toUid) {
    const requestBtn = document.getElementById('requestBtn');
    requestBtn.disabled = true;
    requestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        await db.collection('friendRequests').add({
            fromUserId: fromUid,
            toUserId: toUid,
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        await db.collection('notifications').add({
            userId: toUid,
            type: 'request_received',
            fromUserId: fromUid,
            read: false,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        requestBtn.innerHTML = '<i class="fas fa-clock"></i> Request Sent';
        requestBtn.classList.add('sent');
    } catch (error) {
        console.error('Error sending request:', error);
        alert('Failed to send request.');
        requestBtn.disabled = false;
        requestBtn.innerHTML = '<i class="fas fa-user-plus"></i> Send Request';
    }
}

async function acceptRequest(requestId, currentUid, fromUid) {
    const requestBtn = document.getElementById('requestBtn');
    requestBtn.disabled = true;
    requestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Accepting...';

    try {
        await db.collection('friendRequests').doc(requestId).update({
            status: 'accepted'
        });

        await db.collection('notifications').add({
            userId: fromUid,
            type: 'request_accepted',
            fromUserId: currentUid,
            read: false,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        requestBtn.innerHTML = '<i class="fas fa-check"></i> Connected';
        requestBtn.classList.add('connected');
    } catch (error) {
        console.error('Error accepting request:', error);
        alert('Failed to accept request.');
        requestBtn.disabled = false;
        requestBtn.innerHTML = '<i class="fas fa-user-check"></i> Accept Request';
    }
}