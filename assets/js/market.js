import { getListings, createListing, createTransaction } from './db.js';
import { uploadMultipleFiles, resizeImage, validateFile } from './storage.js';
import { getCurrentUser } from './auth.js';

// Marketplace filtering and display
export async function loadListings(filters = {}, lastDoc = null) {
  try {
    showLoading();
    const { listings, lastDoc: newLastDoc } = await getListings(filters, lastDoc);
    
    const container = document.getElementById('listings-container');
    if (!container) return;
    
    // Clear container if it's a fresh load
    if (!lastDoc) {
      container.innerHTML = '';
    }
    
    // Create listing cards
    listings.forEach(listing => {
      const card = createListingCard(listing);
      container.appendChild(card);
    });
    
    // Update "Load More" button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.style.display = listings.length < 12 ? 'none' : 'block';
      loadMoreBtn.onclick = () => loadListings(filters, newLastDoc);
    }
    
    return newLastDoc;
  } catch (error) {
    console.error('Error loading listings:', error);
    showError('Failed to load listings. Please try again.');
  } finally {
    hideLoading();
  }
}

// Create a listing card element
function createListingCard(listing) {
  const div = document.createElement('div');
  div.className = 'col-md-4 mb-4';
  div.innerHTML = `
    <div class="card listing-card h-100">
      <img src="${listing.images?.[0] || '/assets/img/placeholder.jpg'}" 
           class="card-img-top" 
           alt="${sanitizeInput(listing.title)}"
           loading="lazy">
      <div class="card-body">
        <h5 class="card-title">${sanitizeInput(listing.title)}</h5>
        <span class="badge bg-${getTypeColor(listing.type)} mb-2">${listing.type}</span>
        <span class="badge bg-secondary mb-2">${listing.category}</span>
        <p class="card-text">${sanitizeInput(listing.description).substring(0, 100)}...</p>
        <div class="d-flex justify-content-between align-items-center">
          <span class="text-primary fw-bold">
            ${listing.price ? formatCurrency(listing.price) : 'Free'}
          </span>
          <a href="/listing.html?id=${listing.id}" class="btn btn-outline-primary">
            View Details
          </a>
        </div>
      </div>
      <div class="card-footer text-muted">
        <small>${listing.city} • ${formatDate(listing.createdAt)}</small>
      </div>
    </div>
  `;
  return div;
}

// Apply filters from form
export function setupFilterForm() {
  const filterForm = document.getElementById('filter-form');
  if (!filterForm) return;
  
  filterForm.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(filterForm);
    const filters = {
      category: formData.get('category'),
      city: formData.get('city'),
      type: formData.get('type'),
      minPrice: formData.get('minPrice') ? Number(formData.get('minPrice')) : null,
      maxPrice: formData.get('maxPrice') ? Number(formData.get('maxPrice')) : null
    };
    
    // Clean up empty filters
    Object.keys(filters).forEach(key => {
      if (!filters[key]) delete filters[key];
    });
    
    await loadListings(filters);
  };
}

// Create new listing
export async function createNewListing(formData) {
  try {
    showLoading();
    
    const user = getCurrentUser();
    if (!user) throw new Error('Please login to create a listing');
    
    // Handle images
    const imageFiles = formData.getAll('images');
    const processedImages = [];
    
    for (const file of imageFiles) {
      if (!file.type.startsWith('image/')) continue;
      validateFile(file);
      const resizedImage = await resizeImage(file);
      processedImages.push(resizedImage);
    }
    
    // Upload images
    const imageUrls = processedImages.length ? 
      await uploadMultipleFiles(`listings/${Date.now()}`, processedImages) : [];
    
    // Create listing document
    const listingData = {
      title: formData.get('title'),
      category: formData.get('category'),
      subtype: formData.get('subtype'),
      quantity: Number(formData.get('quantity')),
      unit: formData.get('unit'),
      price: formData.get('price') ? Number(formData.get('price')) : null,
      condition: formData.get('condition'),
      city: formData.get('city'),
      type: formData.get('type'),
      description: formData.get('description'),
      tags: formData.get('tags')?.split(',').map(tag => tag.trim()) || [],
      images: imageUrls,
      ownerId: user.uid,
      verified: false,
      status: 'active'
    };
    
    const listingRef = await createListing(listingData);
    showSuccess('Listing created successfully!');
    window.location.href = `/listing.html?id=${listingRef.id}`;
  } catch (error) {
    console.error('Error creating listing:', error);
    showError(error.message);
    throw error;
  } finally {
    hideLoading();
  }
}

// Request a listing (create transaction)
export async function requestListing(listingId) {
  try {
    showLoading();
    
    const user = getCurrentUser();
    if (!user) throw new Error('Please login to request this item');
    
    const listing = await getListing(listingId);
    if (!listing) throw new Error('Listing not found');
    if (listing.ownerId === user.uid) {
      throw new Error('You cannot request your own listing');
    }
    
    await createTransaction({
      listingId,
      ownerId: listing.ownerId,
      requesterId: user.uid,
      status: 'pending'
    });
    
    showSuccess('Request sent successfully!');
  } catch (error) {
    console.error('Error requesting listing:', error);
    showError(error.message);
    throw error;
  } finally {
    hideLoading();
  }
}

// Helper function to get badge color based on listing type
function getTypeColor(type) {
  switch (type.toLowerCase()) {
    case 'sell': return 'primary';
    case 'donate': return 'success';
    case 'exchange': return 'warning';
    default: return 'secondary';
  }
}

// Initialize marketplace page
export function initMarketplace() {
  setupFilterForm();
  loadListings();
}
