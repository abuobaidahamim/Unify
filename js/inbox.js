// js/inbox.js
import { initFilter } from './filter.js';
import { getCurrentUserProfile, uploadChatImage } from './auth.js';
import { updateMessagesBadge } from './badge.js';
import { updateNotificationBadge } from './badge.js';

async function ensureConversationExists(conversationId) {
    const convRef = db.collection('conversations').doc(conversationId);
    const doc = await convRef.get();
    if (!doc.exists) {
        await convRef.set({
            participants: [currentUser.uid, otherUserId],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessage: '',
            lastSender: null,
            lastTimestamp: null,
            unreadCount: {
                [currentUser.uid]: 0,
                [otherUserId]: 0
            }
        });
    }
}

let pendingFile = null;

const db = firebase.firestore();

const urlParams = new URLSearchParams(window.location.search);
const otherUserId = urlParams.get('uid');
let currentUser = null;
let currentProfile = null;
let otherUserProfile = null;

firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = user;

    currentProfile = await getCurrentUserProfile();
    if (currentProfile?.profilePicURL) {
        document.getElementById('navProfilePic').src = currentProfile.profilePicURL;
    }

    if (!otherUserId) {
        alert('No user specified.');
        window.location.href = 'messages.html';
        return;
    }

    await loadOtherUserProfile();
    await updateNotificationBadge();
    await updateMessagesBadge();
    await loadMessages();
    setupListeners();
    initFilter();

    document.getElementById('profileIcon').addEventListener('click', () => {
        window.location.href = 'personal-profile.html';
    });
});

async function loadOtherUserProfile() {
    try {
        const doc = await db.collection('users').doc(otherUserId).get();
        if (!doc.exists) {
            alert('User not found.');
            window.location.href = 'messages.html';
            return;
        }
        otherUserProfile = doc.data();
        const fullName = `${otherUserProfile.firstName || ''} ${otherUserProfile.lastName || ''}`.trim() || 'User';
        document.getElementById('chatUserName').textContent = fullName;
        if (otherUserProfile.profilePicURL) {
            document.getElementById('chatUserPic').src = otherUserProfile.profilePicURL;
        }
    } catch (error) {
        console.error('Error loading other user profile:', error);
        alert('Failed to load user profile.');
    }
}

async function getConversationId(uid1, uid2) {
    const ids = [uid1, uid2].sort();
    return `${ids[0]}_${ids[1]}`;
}

async function loadMessages() {
    const container = document.getElementById('messagesList');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const conversationId = await getConversationId(currentUser.uid, otherUserId);
        await ensureConversationExists(conversationId);
        await db.collection('conversations').doc(conversationId).update({
            [`unreadCount.${currentUser.uid}`]: 0
        });
        await updateMessagesBadge();
        const messagesRef = db.collection('conversations').doc(conversationId).collection('messages')
            .orderBy('timestamp', 'asc');
        const snapshot = await messagesRef.get();

        if (snapshot.empty) {
            container.innerHTML = '<p>No messages yet. Start the conversation!</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const msg = doc.data();
            const isMine = msg.senderId === currentUser.uid;
            const senderProfile = isMine ? currentProfile : otherUserProfile;
            const senderPic = senderProfile?.profilePicURL || 'https://placehold.co/30';
            const time = msg.timestamp ? msg.timestamp.toDate().toLocaleString() : '';
            let content = msg.text || '';
            if (msg.attachments && msg.attachments.length > 0) {
                // Display image inline or as link
                const ext = msg.attachments[0].split('.').pop().toLowerCase();
                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                    content += `<br><a href="${msg.attachments[0]}" target="_blank"><img src="${msg.attachments[0]}" style="max-width: 200px; border-radius: 8px;"></a>`;
                } else {
                    content += `<br><a href="${msg.attachments[0]}" target="_blank">📎 Attachment</a>`;
                }
            }
            html += `
                <div class="message ${isMine ? 'sent' : 'received'}">
                    <img src="${senderPic}" alt="Profile">
                    <div class="message-bubble">
                        ${content}
                        <div class="message-time">${time}</div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    } catch (error) {
        console.error('Error loading messages:', error);
        container.innerHTML = '<p>Error loading messages. Check console.</p>';
    }
}

async function sendMessage(text, attachmentURL = null) {
    if (!text.trim() && !attachmentURL) return;
    const conversationId = await getConversationId(currentUser.uid, otherUserId);
    const messageData = {
        senderId: currentUser.uid,
        text: text || (attachmentURL ? '[Image]' : ''),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (attachmentURL) {
        messageData.attachments = [attachmentURL];
    }

    try {
        // First ensure conversation exists
        await ensureConversationExists(conversationId);
        console.log('Conversation ensured');

        // Add message
        await db.collection('conversations').doc(conversationId)
            .collection('messages').add(messageData);
        console.log('Message added');

        // After adding message, update unread count
        await db.collection('conversations').doc(conversationId).update({
            [`unreadCount.${otherUserId}`]: firebase.firestore.FieldValue.increment(1)
        });

        await updateMessagesBadge();

        // Update conversation metadata
        await db.collection('conversations').doc(conversationId).set({
            participants: [currentUser.uid, otherUserId],
            lastMessage: text || (attachmentURL ? '📷 Image' : ''),
            lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            lastSender: currentUser.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('Conversation updated');

        await loadMessages();
        document.getElementById('messageInput').value = '';
    } catch (error) {
        console.error('Error sending message at step:', error);
        alert('Failed to send message: ' + error.message);
    }
    await updateMessagesBadge();
}

function setupListeners() {
    const backBtn = document.getElementById('backBtn');
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');
    const attachBtn = document.getElementById('attachBtn');
    const previewDiv = document.getElementById('attachmentPreview');

    // File input element (hidden)
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    fileInput.accept = 'image/jpeg,image/png,image/gif,image/webp';
    document.body.appendChild(fileInput);

    backBtn.addEventListener('click', () => {
        window.location.href = 'messages.html';
    });

    sendBtn.addEventListener('click', async () => {
        const text = messageInput.value;

        if (pendingFile) {
            // Upload first
            attachBtn.disabled = true;
            attachBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            try {
                const imageUrl = await uploadChatImage(pendingFile);
                await sendMessage(text, imageUrl);
                removeAttachment(); // clear preview and pending file
            } catch (error) {
                console.error('Upload error:', error);
                alert('Failed to upload image.');
            } finally {
                attachBtn.disabled = false;
                attachBtn.innerHTML = '<i class="fas fa-paperclip"></i>';
            }
        } else {
            await sendMessage(text);
        }
        messageInput.value = '';
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendBtn.click();
        }
    });

    attachBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        pendingFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            previewDiv.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <span class="remove-attachment" onclick="removeAttachment()">&times;</span>
            `;
            previewDiv.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    });

    // Remove attachment function (local, not global)
    function removeAttachment() {
        pendingFile = null;
        previewDiv.style.display = 'none';
        previewDiv.innerHTML = '';
        fileInput.value = '';
    }

    // Make removeAttachment available to inline onclick
    window.removeAttachment = removeAttachment;

    // Nav icons placeholders
    document.querySelectorAll('.nav-icon:not([data-tooltip="Home"]):not([data-tooltip="Notifications"]):not([data-tooltip="Connections"]):not([data-tooltip="Messages"])').forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = icon.getAttribute('data-tooltip');
            console.log(`Attempted to navigate to ${pageName} page, but it is under construction.`);
            alert(`The ${pageName} page is coming soon! We'll notify you when it's ready.`);
        });
    });
}