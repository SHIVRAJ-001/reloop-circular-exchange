import { 
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js';

import { createUserProfile, getUserProfile } from './db.js';

let auth;

export function initAuth(app) {
  auth = getAuth(app);
  
  // Set up auth state observer
  onAuthStateChanged(auth, async (user) => {
    const authStateEvent = new CustomEvent('authStateChanged', { 
      detail: { user } 
    });
    window.dispatchEvent(authStateEvent);

    // Update UI elements
    updateAuthUI(user);
    
    // Handle protected pages
    const protectedPages = [
      'dashboard.html',
      'profile.html',
      'add-listing.html',
      'chat.html'
    ];
    
    if (!user && protectedPages.some(page => window.location.pathname.includes(page))) {
      window.location.href = '/login.html';
    }
  });
}

// Email signup
export async function signUp(email, password, role, name) {
  try {
    showLoading();
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user profile
    await createUserProfile(user.uid, {
      name,
      email,
      role,
      company: '',
      location: '',
      phone: '',
      bio: '',
      photoURL: null,
      ecoPoints: 0,
      isAdmin: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    });

    showSuccess('Account created successfully!');
    return user;
  } catch (error) {
    console.error('Signup error:', error);
    throw new Error(getAuthErrorMessage(error));
  } finally {
    hideLoading();
  }
}

// Email login
export async function login(email, password) {
  try {
    showLoading();
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    showSuccess('Logged in successfully!');
    return user;
  } catch (error) {
    console.error('Login error:', error);
    throw new Error(getAuthErrorMessage(error));
  } finally {
    hideLoading();
  }
}

// Google sign in
export async function signInWithGoogle() {
  try {
    showLoading();
    const provider = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, provider);
    
    // Check if profile exists
    const profile = await getUserProfile(user.uid);
    
    // Create profile if doesn't exist
    if (!profile) {
      // Show role selection dialog for new Google users
      const role = await promptForRole();
      
      await createUserProfile(user.uid, {
        name: user.displayName,
        email: user.email,
        role,
        company: '',
        location: '',
        phone: '',
        bio: '',
        photoURL: user.photoURL,
        ecoPoints: 0,
        isAdmin: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      });
    }
    
    showSuccess('Signed in with Google successfully!');
    return user;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw new Error(getAuthErrorMessage(error));
  } finally {
    hideLoading();
  }
}

// Sign out
export async function logout() {
  try {
    await signOut(auth);
    showSuccess('Logged out successfully!');
    window.location.href = '/';
  } catch (error) {
    console.error('Logout error:', error);
    showError('Failed to log out. Please try again.');
  }
}

// Get current user
export function getCurrentUser() {
  return auth.currentUser;
}

// Update UI based on auth state
function updateAuthUI(user) {
  const authButtons = document.querySelectorAll('[data-auth-required]');
  const profileLinks = document.querySelectorAll('[data-profile-link]');
  const userNameElements = document.querySelectorAll('[data-user-name]');
  
  if (user) {
    authButtons.forEach(btn => btn.classList.remove('d-none'));
    profileLinks.forEach(link => {
      link.classList.remove('d-none');
      link.href = `/profile.html?uid=${user.uid}`;
    });
    getUserProfile(user.uid).then(profile => {
      if (profile) {
        userNameElements.forEach(el => el.textContent = profile.name);
      }
    });
  } else {
    authButtons.forEach(btn => btn.classList.add('d-none'));
    profileLinks.forEach(link => link.classList.add('d-none'));
    userNameElements.forEach(el => el.textContent = '');
  }
}

// Helper function to prompt for role selection
function promptForRole() {
  return new Promise((resolve) => {
    // Create modal element
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'roleModal';
    modal.setAttribute('data-bs-backdrop', 'static');
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Select Your Role</h5>
          </div>
          <div class="modal-body">
            <p>Please select your role in the Reloop ecosystem:</p>
            <div class="list-group">
              <button type="button" class="list-group-item list-group-item-action" data-role="Recycler">
                <h6 class="mb-1">Recycler</h6>
                <small>Collect and process recyclable materials</small>
              </button>
              <button type="button" class="list-group-item list-group-item-action" data-role="Manufacturer">
                <h6 class="mb-1">Manufacturer</h6>
                <small>Create products using recycled materials</small>
              </button>
              <button type="button" class="list-group-item list-group-item-action" data-role="Artisan">
                <h6 class="mb-1">Artisan</h6>
                <small>Create artisanal products from recycled materials</small>
              </button>
              <button type="button" class="list-group-item list-group-item-action" data-role="Donor">
                <h6 class="mb-1">Donor</h6>
                <small>Donate recyclable materials</small>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add to document
    document.body.appendChild(modal);

    // Initialize Bootstrap modal
    const modalInstance = new bootstrap.Modal(modal);

    // Add click handlers
    modal.querySelectorAll('[data-role]').forEach(button => {
      button.addEventListener('click', () => {
        const role = button.dataset.role;
        modalInstance.hide();
        modal.addEventListener('hidden.bs.modal', () => {
          modal.remove();
          resolve(role);
        });
      });
    });

    // Show modal
    modalInstance.show();
  });
}

// Helper to get user-friendly error messages
function getAuthErrorMessage(error) {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please login instead.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/operation-not-allowed':
      return 'Sign-in method not enabled. Please contact support.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing.';
    default:
      return 'An error occurred during authentication. Please try again.';
  }
}