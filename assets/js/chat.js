import { 
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc
} from 'https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js';

import { getCurrentUser } from './auth.js';
import { createChat, sendMessage } from './db.js';

let db;
let currentChatId;
let unsubscribeMessages;

export function initChat(app) {
  db = getFirestore(app);
}

// Load user's chat list
export async function loadChats() {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');
  
  const chatsContainer = document.getElementById('chats-list');
  if (!chatsContainer) return;
  
  const q = query(
    collection(db, 'chats'),
    where('participantIds', 'array-contains', user.uid),
    orderBy('lastMessageAt', 'desc')
  );
  
  onSnapshot(q, async (snapshot) => {
    chatsContainer.innerHTML = '';
    
    for (const doc of snapshot.docs) {
      const chat = doc.data();
      const otherUserId = chat.participantIds.find(id => id !== user.uid);
      const otherUser = await getUserProfile(otherUserId);
      
      const div = document.createElement('div');
      div.className = 'chat-item p-3 border-bottom';
      div.innerHTML = `
        <div class="d-flex align-items-center cursor-pointer ${
          currentChatId === doc.id ? 'bg-light' : ''
        }">
          <img src="${otherUser.photoURL || '/assets/img/default-avatar.png'}"
               class="rounded-circle me-2"
               width="40"
               height="40"
               alt="${sanitizeInput(otherUser.name)}">
          <div class="flex-grow-1">
            <h6 class="mb-0">${sanitizeInput(otherUser.name)}</h6>
            <small class="text-muted">
              ${chat.lastMessage ? sanitizeInput(chat.lastMessage.text).substring(0, 30) : 'No messages yet'}
            </small>
          </div>
          ${chat.unreadCount ? `
            <span class="badge bg-primary rounded-pill">
              ${chat.unreadCount}
            </span>
          ` : ''}
        </div>
      `;
      
      div.onclick = () => loadMessages(doc.id);
      chatsContainer.appendChild(div);
    }
  });
}

// Load messages for a specific chat
export function loadMessages(chatId) {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');
  
  // Unsubscribe from previous messages listener
  if (unsubscribeMessages) {
    unsubscribeMessages();
  }
  
  currentChatId = chatId;
  const messagesContainer = document.getElementById('messages-container');
  if (!messagesContainer) return;
  
  const q = query(
    collection(db, `chats/${chatId}/messages`),
    orderBy('createdAt', 'asc')
  );
  
  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    messagesContainer.innerHTML = '';
    
    snapshot.forEach(doc => {
      const message = doc.data();
      const div = document.createElement('div');
      div.className = `message ${
        message.senderId === user.uid ? 'message-sent' : 'message-received'
      }`;
      div.innerHTML = `
        <div class="message-content">
          <p class="mb-0">${sanitizeInput(message.text)}</p>
          <small class="text-muted">
            ${formatDate(message.createdAt)}
          </small>
        </div>
      `;
      messagesContainer.appendChild(div);
    });
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Mark messages as read
    markMessagesAsRead(chatId);
  });
}

// Send a new message
export async function sendNewMessage(chatId, text) {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');
  
  try {
    await sendMessage(chatId, {
      text,
      senderId: user.uid,
      senderName: user.displayName || 'User',
      readBy: [user.uid]
    });
    
    // Update chat's last message
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: {
        text,
        senderId: user.uid,
        createdAt: new Date().toISOString()
      },
      lastMessageAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Failed to send message');
  }
}

// Start a new chat with a user
export async function startNewChat(otherUserId) {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');
  
  try {
    // Check if chat already exists
    const existingChat = await findExistingChat(user.uid, otherUserId);
    if (existingChat) {
      return existingChat.id;
    }
    
    // Create new chat
    const chatRef = await createChat([user.uid, otherUserId]);
    return chatRef.id;
  } catch (error) {
    console.error('Error starting chat:', error);
    throw new Error('Failed to start chat');
  }
}

// Find existing chat between two users
async function findExistingChat(userId1, userId2) {
  const q = query(
    collection(db, 'chats'),
    where('participantIds', 'array-contains', userId1)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.find(doc => {
    const chat = doc.data();
    return chat.participantIds.includes(userId2);
  });
}

// Mark messages as read
async function markMessagesAsRead(chatId) {
  const user = getCurrentUser();
  if (!user) return;
  
  const q = query(
    collection(db, `chats/${chatId}/messages`),
    where('readBy', 'array-contains', user.uid)
  );
  
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  
  snapshot.docs.forEach(doc => {
    const message = doc.data();
    if (!message.readBy.includes(user.uid)) {
      batch.update(doc.ref, {
        readBy: [...message.readBy, user.uid]
      });
    }
  });
  
  await batch.commit();
}

// Initialize chat features
export function initChatFeatures() {
  const messageForm = document.getElementById('message-form');
  if (!messageForm) return;
  
  messageForm.onsubmit = async (e) => {
    e.preventDefault();
    const input = messageForm.querySelector('input');
    const text = input.value.trim();
    
    if (text && currentChatId) {
      try {
        await sendNewMessage(currentChatId, text);
        input.value = '';
      } catch (error) {
        showError(error.message);
      }
    }
  };
  
  // Load initial chats
  loadChats();
}