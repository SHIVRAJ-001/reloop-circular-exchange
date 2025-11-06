import { 
  getStorage, 
  ref, 
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/10.5.2/firebase-storage.js';

let storage;

export function initStorage(app) {
  storage = getStorage(app);
}

// Upload a file to Firebase Storage
export async function uploadFile(path, file) {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
}

// Delete a file from Firebase Storage
export async function deleteFile(path) {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
}

// Helper function to upload multiple files with image optimization
export async function uploadMultipleFiles(basePath, files, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    maxFiles = 5
  } = options;

  try {
    // Validate number of files
    if (files.length > maxFiles) {
      throw new Error(`Maximum ${maxFiles} files allowed`);
    }

    // Process and upload each file
    const uploadPromises = Array.from(files).map(async (file, index) => {
      // Validate file
      validateFile(file);

      // Resize image if it's too large
      const optimizedFile = await resizeImage(file, maxWidth, maxHeight, quality);
      
      // Generate unique path
      const extension = file.name.split('.').pop().toLowerCase();
      const path = `${basePath}/${Date.now()}-${index}.${extension}`;
      
      // Upload and return URL
      return uploadFile(path, optimizedFile);
    });
    
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple files:', error);
    throw new Error('Failed to upload files: ' + error.message);
  }
}

// Helper function to create a client-side preview URL
export function createObjectURL(file) {
  return URL.createObjectURL(file);
}

// Helper function to revoke a client-side preview URL
export function revokeObjectURL(url) {
  URL.revokeObjectURL(url);
}

// Helper function to resize an image before upload
export function resizeImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    // Validate input
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Invalid file type. Please provide an image.'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw resized image
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          }));
        }, 'image/jpeg', 0.85);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

// Validate file type and size
export function validateFile(file, allowedTypes = ['image/jpeg', 'image/png'], maxSize = 5 * 1024 * 1024) {
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPG and PNG files are allowed.');
  }
  
  if (file.size > maxSize) {
    throw new Error('File is too large. Maximum size is 5MB.');
  }
  
  return true;
}