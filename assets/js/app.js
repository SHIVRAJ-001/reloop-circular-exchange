import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js';
import firebaseConfig from './firebase-config.js';
import { initAuth } from './auth.js';
import { initDb } from './db.js';
import { initStorage } from './storage.js';

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize modules
initAuth(app);
initDb(app);
initStorage(app);

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  showError('An unexpected error occurred. Please try again.');
});

// Global promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  showError('A network error occurred. Please check your connection.');
});

// Utility functions available globally
window.showError = function(message) {
  const errorContainer = document.getElementById('error-container');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.classList.remove('d-none');
    setTimeout(() => {
      errorContainer.classList.add('d-none');
    }, 5000);
  } else {
    console.error('Error:', message);
  }
};

window.showSuccess = function(message) {
  const successContainer = document.getElementById('success-container');
  if (successContainer) {
    successContainer.textContent = message;
    successContainer.classList.remove('d-none');
    setTimeout(() => {
      successContainer.classList.add('d-none');
    }, 5000);
  }
};

window.formatDate = function(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

window.formatCurrency = function(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Initialize loading spinner
window.showLoading = function() {
  const loadingSpinner = document.getElementById('loading-spinner');
  if (loadingSpinner) {
    loadingSpinner.classList.remove('d-none');
  }
};

window.hideLoading = function() {
  const loadingSpinner = document.getElementById('loading-spinner');
  if (loadingSpinner) {
    loadingSpinner.classList.add('d-none');
  }
};

// Sanitize user input to prevent XSS
window.sanitizeInput = function(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

// Export app instance
export default app;