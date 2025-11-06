import { 
  getFirestore, 
  collection, 
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js';

let db;

export function initDb(app) {
  db = getFirestore(app);
}

// User Profiles
export async function createUserProfile(uid, data) {
  try {
    await setDoc(doc(db, 'users', uid), {
      ...data,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw new Error('Failed to create user profile');
  }
}

export async function getUserProfile(uid) {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw new Error('Failed to fetch user profile');
  }
}

export async function updateUserProfile(uid, data) {
  try {
    await updateDoc(doc(db, 'users', uid), data);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update user profile');
  }
}

// Listings
export async function createListing(data) {
  try {
    // Add timestamps and default values
    const listing = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: data.status || 'active',
      views: 0,
      saves: 0
    };

    const docRef = await addDoc(collection(db, 'listings'), listing);

    // Update user's listing count
    await updateDoc(doc(db, 'users', data.ownerId), {
      listingCount: increment(1)
    });

    return docRef;
  } catch (error) {
    console.error('Error creating listing:', error);
    throw new Error('Failed to create listing');
  }
}

export async function getListing(id) {
  try {
    const docRef = doc(db, 'listings', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    // Increment view count
    await updateDoc(docRef, {
      views: increment(1)
    });

    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error('Error getting listing:', error);
    throw new Error('Failed to fetch listing');
  }
}

export async function updateListing(id, data) {
  try {
    await updateDoc(doc(db, 'listings', id), {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating listing:', error);
    throw new Error('Failed to update listing');
  }
}

export async function deleteListing(id) {
  try {
    const listingRef = doc(db, 'listings', id);
    const listingDoc = await getDoc(listingRef);
    
    if (!listingDoc.exists()) {
      throw new Error('Listing not found');
    }

    // Delete the listing
    await deleteDoc(listingRef);

    // Update user's listing count
    await updateDoc(doc(db, 'users', listingDoc.data().ownerId), {
      listingCount: increment(-1)
    });
  } catch (error) {
    console.error('Error deleting listing:', error);
    throw new Error('Failed to delete listing');
  }
}

export async function toggleListingSave(listingId, userId) {
  try {
    const savedRef = doc(db, 'users', userId, 'saved', listingId);
    const savedDoc = await getDoc(savedRef);
    const listingRef = doc(db, 'listings', listingId);

    if (savedDoc.exists()) {
      // Remove from saved
      await deleteDoc(savedRef);
      await updateDoc(listingRef, {
        saves: increment(-1)
      });
    } else {
      // Add to saved
      await setDoc(savedRef, {
        savedAt: serverTimestamp()
      });
      await updateDoc(listingRef, {
        saves: increment(1)
      });
    }
  } catch (error) {
    console.error('Error toggling listing save:', error);
    throw new Error('Failed to save/unsave listing');
  }
}

export async function getListings(filters = {}, lastDoc = null, itemsPerPage = 12) {
  try {
    let q = collection(db, 'listings');
    
    // Apply filters
    const conditions = [];
    if (filters.category) {
      conditions.push(where('category', '==', filters.category));
    }
    if (filters.city) {
      conditions.push(where('city', '==', filters.city));
    }
    if (filters.type) {
      conditions.push(where('type', '==', filters.type));
    }
    if (filters.minPrice) {
      conditions.push(where('price', '>=', filters.minPrice));
    }
    if (filters.maxPrice) {
      conditions.push(where('price', '<=', filters.maxPrice));
    }
    
    // Add sorting
    conditions.push(orderBy('createdAt', 'desc'));
    conditions.push(limit(itemsPerPage));
    
    // Add pagination if lastDoc provided
    if (lastDoc) {
      conditions.push(startAfter(lastDoc));
    }
    
    q = query(q, ...conditions);
    
    const snapshot = await getDocs(q);
    const listings = [];
    snapshot.forEach(doc => {
      listings.push({ id: doc.id, ...doc.data() });
    });
    
    return {
      listings,
      lastDoc: snapshot.docs[snapshot.docs.length - 1]
    };
  } catch (error) {
    console.error('Error getting listings:', error);
    throw new Error('Failed to fetch listings');
  }
}

// Transactions
export async function createTransaction(data) {
  try {
    return await addDoc(collection(db, 'transactions'), {
      ...data,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw new Error('Failed to create transaction');
  }
}

export async function updateTransaction(id, data) {
  try {
    await updateDoc(doc(db, 'transactions', id), data);
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw new Error('Failed to update transaction');
  }
}

// Chat Messages
export async function createChat(participantIds) {
  try {
    return await addDoc(collection(db, 'chats'), {
      participantIds,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    throw new Error('Failed to create chat');
  }
}

export async function sendMessage(chatId, message) {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const messagesRef = collection(chatRef, 'messages');
    return await addDoc(messagesRef, {
      ...message,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Failed to send message');
  }
}

// Blog Posts
export async function createBlogPost(data) {
  try {
    return await addDoc(collection(db, 'blogs'), {
      ...data,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating blog post:', error);
    throw new Error('Failed to create blog post');
  }
}

export async function getBlogPosts(lastDoc = null, itemsPerPage = 10) {
  try {
    let q = query(
      collection(db, 'blogs'),
      orderBy('createdAt', 'desc'),
      limit(itemsPerPage)
    );
    
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    const snapshot = await getDocs(q);
    const posts = [];
    snapshot.forEach(doc => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    
    return {
      posts,
      lastDoc: snapshot.docs[snapshot.docs.length - 1]
    };
  } catch (error) {
    console.error('Error getting blog posts:', error);
    throw new Error('Failed to fetch blog posts');
  }
}

// Leaderboard
export async function getLeaderboard(limit = 10) {
  try {
    const q = query(
      collection(db, 'users'),
      orderBy('ecoPoints', 'desc'),
      limit(limit)
    );
    
    const snapshot = await getDocs(q);
    const users = [];
    snapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    return users;
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    throw new Error('Failed to fetch leaderboard');
  }
}

// Helper function for updating eco points
export async function updateEcoPoints(userId, points) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const currentPoints = userDoc.data().ecoPoints || 0;
      await updateDoc(userRef, {
        ecoPoints: currentPoints + points
      });
    }
  } catch (error) {
    console.error('Error updating eco points:', error);
    throw new Error('Failed to update eco points');
  }
}