// js/people-profile.js
import { initFilter } from './filter.js';
import { getCurrentUserProfile } from './auth.js';
import { updateNotificationBadge } from './badge.js';
import { updateMessagesBadge } from './badge.js';

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

    await updateNotificationBadge();
    await updateMessagesBadge();
    // Load target user's posts
    loadUserPosts(targetUserId);
    // Initialize filter
    initFilter();

    // Nav icons placeholders
    document.querySelectorAll('.nav-icon:not([data-tooltip="Home"]):not([data-tooltip="Notifications"]):not([data-tooltip="Connections"]):not([data-tooltip="Messages"])').forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = icon.getAttribute('data-tooltip');
            console.log(`Attempted to navigate to ${pageName} page, but it is under construction.`);
            alert(`The ${pageName} page is coming soon! We'll notify you when it's ready.`);
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

function makeLinksClickable(text) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

async function loadUserPosts(uid) {
    const postsContainer = document.getElementById('postsFeed');
    postsContainer.innerHTML = '<div class="spinner"></div>';

    try {
        const snapshot = await db.collection('posts')
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            postsContainer.innerHTML = '<p>No posts yet.</p>';
            return;
        }

        const profilePicURL = targetProfile?.profilePicURL || 'https://placehold.co/40';
        const userName = `${targetProfile?.firstName || ''} ${targetProfile?.lastName || ''}`.trim() || 'User';

        let html = '';
        snapshot.forEach(doc => {
            const post = doc.data();
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
        });
        postsContainer.innerHTML = html;
    } catch (error) {
        console.error('Error loading posts:', error);
        postsContainer.innerHTML = `<p>Error loading posts: ${error.message}</p>`;
    }
}

async function checkFriendStatus(currentUid, targetUid) {
    const requestBtn = document.getElementById('requestBtn');
    if (!requestBtn) return;

    try {
        // Check for accepted request from current user to target
        const sentAccepted = await db.collection('friendRequests')
            .where('fromUserId', '==', currentUid)
            .where('toUserId', '==', targetUid)
            .where('status', '==', 'accepted')
            .limit(1)
            .get();
        if (!sentAccepted.empty) {
            setButtonConnected(requestBtn, currentUid, targetUid);
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
            setButtonConnected(requestBtn, currentUid, targetUid);
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
            setButtonSent(requestBtn, currentUid, targetUid);
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
            setButtonAccept(requestBtn, requestId, currentUid, targetUid);
            return;
        }

        // No relationship – show Send Request
        setButtonSend(requestBtn, currentUid, targetUid);
    } catch (error) {
        console.error('Error checking friend status:', error);
        setButtonSend(requestBtn, currentUid, targetUid);
    }
}

// Helper functions to set button state
function setButtonConnected(btn, currentUid, targetUid) {
    btn.innerHTML = '<i class="fas fa-check"></i> Connected';
    btn.disabled = false;
    btn.classList.add('connected');
    btn.classList.remove('sent', 'accept', 'send');

    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    const updatedBtn = document.getElementById('requestBtn');

    function onMouseEnter() {
        updatedBtn.innerHTML = '<i class="fas fa-user-slash"></i> Disconnect';
    }
    function onMouseLeave() {
        updatedBtn.innerHTML = '<i class="fas fa-check"></i> Connected';
    }
    async function onClick() {
        updatedBtn.removeEventListener('mouseenter', onMouseEnter);
        updatedBtn.removeEventListener('mouseleave', onMouseLeave);
        updatedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Disconnecting...';
        updatedBtn.disabled = true;
        await disconnect(currentUid, targetUid);
    }

    updatedBtn.addEventListener('mouseenter', onMouseEnter);
    updatedBtn.addEventListener('mouseleave', onMouseLeave);
    updatedBtn.addEventListener('click', onClick);

    // Small delay to ensure DOM updates before showing the message button
    setTimeout(() => {
        showMessageButton();
    }, 100);
}

function setButtonSent(btn, currentUid, targetUid) {
    console.log('✅ setButtonSent called');
    const newBtn = document.createElement('button');
    newBtn.id = 'requestBtn';
    newBtn.className = btn.className;
    newBtn.innerHTML = '<i class="fas fa-clock"></i> Request Sent';
    newBtn.disabled = false;

    btn.parentNode.replaceChild(newBtn, btn);

    setTimeout(() => {
        const updatedBtn = document.getElementById('requestBtn');
        if (!updatedBtn) return;

        const onMouseEnter = () => {
            updatedBtn.innerHTML = '<i class="fas fa-times-circle"></i> Cancel Request';
        };
        const onMouseLeave = () => {
            updatedBtn.innerHTML = '<i class="fas fa-clock"></i> Request Sent';
        };
        const onClick = async () => {
            updatedBtn.removeEventListener('mouseenter', onMouseEnter);
            updatedBtn.removeEventListener('mouseleave', onMouseLeave);
            updatedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...';
            updatedBtn.disabled = true;
            await cancelRequest(currentUid, targetUid);
        };

        updatedBtn.addEventListener('mouseenter', onMouseEnter);
        updatedBtn.addEventListener('mouseleave', onMouseLeave);
        updatedBtn.addEventListener('click', onClick);
    }, 10);
}

function setButtonAccept(btn, requestId, currentUid, fromUid) {
    btn.innerHTML = '<i class="fas fa-user-check"></i> Accept Request';
    btn.classList.add('accept');
    btn.disabled = false;
    // Remove old listeners and add new one
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', async () => {
        await acceptRequest(requestId, currentUid, fromUid);
    });
    hideMessageButton();
}

function setButtonSend(btn, currentUid, targetUid) {
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Send Request';
    btn.classList.remove('connected', 'sent', 'accept');
    btn.disabled = false;
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', async () => {
        await sendRequest(currentUid, targetUid);
    });
    hideMessageButton();
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
        await updateNotificationBadge();

        // Replace the button with the interactive "Request Sent" button
        // Get the current button again (might still be the same element)
        const currentBtn = document.getElementById('requestBtn');
        setButtonSent(currentBtn, fromUid, toUid);
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
        await updateNotificationBadge();

        setButtonConnected(requestBtn, currentUid, fromUid);
    } catch (error) {
        console.error('Error accepting request:', error);
        alert('Failed to accept request.');
        requestBtn.disabled = false;
        requestBtn.innerHTML = '<i class="fas fa-user-check"></i> Accept Request';
    }
}

function showMessageButton() {
    const msgBtn = document.getElementById('sendMessageBtn');
    if (msgBtn) {
        msgBtn.style.display = 'inline-flex';
        msgBtn.onclick = () => {
            window.location.href = `inbox.html?uid=${targetUserId}`;
        };
    }
}

function hideMessageButton() {
    const msgBtn = document.getElementById('sendMessageBtn');
    if (msgBtn) {
        msgBtn.style.display = 'none';
    }
}

async function cancelRequest(fromUid, toUid) {
    const requestBtn = document.getElementById('requestBtn');
    if (!requestBtn) return;
    requestBtn.disabled = true;
    requestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...';

    try {
        // Find the pending request from fromUid to toUid
        const query = await db.collection('friendRequests')
            .where('fromUserId', '==', fromUid)
            .where('toUserId', '==', toUid)
            .where('status', '==', 'pending')
            .limit(1)
            .get();

        console.log('🔍 Query result size:', query.size); 

        if (!query.empty) {
            const requestDoc = query.docs[0];
            console.log('Found request to delete:', requestDoc.data());  // <-- LOG

            await requestDoc.ref.delete();
            console.log('🗑️ Deleted request');

            // Delete corresponding notification
            const notifQuery = await db.collection('notifications')
                .where('userId', '==', toUid)
                .where('fromUserId', '==', fromUid)
                .where('type', '==', 'request_received')
                .where('read', '==', false)
                .limit(1)
                .get();
            if (!notifQuery.empty) {
                await notifQuery.docs[0].ref.delete();
                console.log('Deleted notification');
            }
        } else {
            console.log('No pending request found');
        }
        

        // Revert to "Send Request" state
        setButtonSend(requestBtn, fromUid, toUid);
        console.log('✅ Cancellation finished, button reverted');
    } catch (error) {
        console.error('Error cancelling request:', error);
        alert('Failed to cancel request.');
        requestBtn.disabled = false;
        requestBtn.innerHTML = '<i class="fas fa-clock"></i> Request Sent';
        requestBtn.classList.add('sent');
    }
}

async function disconnect(currentUid, targetUid) {
    const requestBtn = document.getElementById('requestBtn');
    try {
        // Try both directions
        const query1 = await db.collection('friendRequests')
            .where('fromUserId', '==', currentUid)
            .where('toUserId', '==', targetUid)
            .where('status', '==', 'accepted')
            .limit(1)
            .get();
        const query2 = await db.collection('friendRequests')
            .where('fromUserId', '==', targetUid)
            .where('toUserId', '==', currentUid)
            .where('status', '==', 'accepted')
            .limit(1)
            .get();

        const doc = !query1.empty ? query1.docs[0] : (!query2.empty ? query2.docs[0] : null);
        if (doc) {
            await doc.ref.delete();
        }

        setButtonSend(requestBtn, currentUid, targetUid);
        hideMessageButton();
    } catch (error) {
        console.error('Error disconnecting:', error);
        alert('Failed to disconnect.');
        requestBtn.disabled = false;
        requestBtn.innerHTML = '<i class="fas fa-check"></i> Connected';
        requestBtn.classList.add('connected');
    }
}