# 🔥 Firebase Storage Setup Guide - Store Images in the Cloud

## 📦 Overview
Firebase Storage provides a powerful, simple, and cost-effective object storage service. Perfect for storing recipe images!

## 🚀 Quick Setup

### 1️⃣ Enable Firebase Storage

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click **"Storage"** in the left sidebar
4. Click **"Get Started"**
5. Choose your security rules (start with test mode for development)
6. Select your storage location (choose closest to your users)

### 2️⃣ Install Firebase Storage SDK

```bash
npm install firebase-admin@latest
# or if using client-side
npm install firebase@latest
```

### 3️⃣ Update Your Service Account

Your existing service account already has Storage permissions! Just make sure it's configured.

## 💾 Backend Implementation

### Create Storage Manager

```javascript
// backend/managers/FirebaseStorageManager.js
const admin = require('firebase-admin');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class FirebaseStorageManager {
  constructor() {
    // Initialize if not already done
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(require('../../serviceAccountKey.json')),
        storageBucket: 'your-project-id.appspot.com' // REPLACE WITH YOUR BUCKET
      });
    }
    
    this.bucket = admin.storage().bucket();
  }

  /**
   * Upload image from URL to Firebase Storage
   * @param {string} imageUrl - The image URL to download and store
   * @param {string} recipeName - Name of the recipe for organizing
   * @returns {Promise<string>} - Public URL of stored image
   */
  async uploadImageFromUrl(imageUrl, recipeName) {
    try {
      // Fetch image from URL
      const response = await fetch(imageUrl);
      const buffer = await response.buffer();
      
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = recipeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `recipes/${sanitizedName}_${timestamp}_${uuidv4()}.jpg`;
      
      // Create file reference
      const file = this.bucket.file(fileName);
      
      // Upload to Firebase Storage
      await file.save(buffer, {
        metadata: {
          contentType: 'image/jpeg',
          metadata: {
            recipeName: recipeName,
            uploadedAt: new Date().toISOString()
          }
        }
      });
      
      // Make file publicly accessible
      await file.makePublic();
      
      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
      
      console.log('✅ Image uploaded to Firebase Storage:', publicUrl);
      return publicUrl;
      
    } catch (error) {
      console.error('❌ Firebase Storage upload error:', error);
      throw error;
    }
  }

  /**
   * Upload base64 image to Firebase Storage
   * @param {string} base64Image - Base64 encoded image
   * @param {string} recipeName - Name of the recipe
   * @returns {Promise<string>} - Public URL of stored image
   */
  async uploadBase64Image(base64Image, recipeName) {
    try {
      // Remove data:image/jpeg;base64, prefix if present
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = recipeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `recipes/${sanitizedName}_${timestamp}_${uuidv4()}.jpg`;
      
      // Create file reference
      const file = this.bucket.file(fileName);
      
      // Upload to Firebase Storage
      await file.save(buffer, {
        metadata: {
          contentType: 'image/jpeg',
          metadata: {
            recipeName: recipeName,
            uploadedAt: new Date().toISOString()
          }
        }
      });
      
      // Make file publicly accessible
      await file.makePublic();
      
      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
      
      console.log('✅ Base64 image uploaded to Firebase Storage:', publicUrl);
      return publicUrl;
      
    } catch (error) {
      console.error('❌ Firebase Storage base64 upload error:', error);
      throw error;
    }
  }

  /**
   * Delete image from Firebase Storage
   * @param {string} imageUrl - The Firebase Storage URL to delete
   */
  async deleteImage(imageUrl) {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts.slice(4).join('/'); // Get everything after bucket name
      
      // Delete file
      await this.bucket.file(fileName).delete();
      
      console.log('✅ Image deleted from Firebase Storage:', fileName);
    } catch (error) {
      console.error('❌ Firebase Storage delete error:', error);
      throw error;
    }
  }

  /**
   * List all images for a recipe
   * @param {string} recipeName - Name of the recipe
   * @returns {Promise<Array>} - Array of image URLs
   */
  async listRecipeImages(recipeName) {
    try {
      const sanitizedName = recipeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const [files] = await this.bucket.getFiles({
        prefix: `recipes/${sanitizedName}_`
      });
      
      return files.map(file => 
        `https://storage.googleapis.com/${this.bucket.name}/${file.name}`
      );
    } catch (error) {
      console.error('❌ Firebase Storage list error:', error);
      throw error;
    }
  }
}

module.exports = FirebaseStorageManager;
```

## 🔌 API Integration

### Update Your Routes

```javascript
// backend/routes/AdminRoutes.js

const FirebaseStorageManager = require('../managers/FirebaseStorageManager');

class AdminRoutes {
  constructor() {
    // ... existing code ...
    this.storageManager = new FirebaseStorageManager();
  }

  async createRecipeWithAI(req, res) {
    // ... generate recipe and images ...
    
    // After generating images, store them in Firebase
    if (imageUrls.length > 0) {
      const firebaseUrls = [];
      
      for (const url of imageUrls) {
        try {
          // Upload to Firebase Storage
          const firebaseUrl = await this.storageManager.uploadImageFromUrl(
            url, 
            generatedRecipe.strMeal
          );
          firebaseUrls.push(firebaseUrl);
        } catch (error) {
          console.error('Failed to upload to Firebase:', error);
          firebaseUrls.push(url); // Fallback to original URL
        }
      }
      
      // Update recipe with Firebase URLs
      generatedRecipe.strMealThumb = firebaseUrls[0];
      generatedRecipe.additionalImages = firebaseUrls;
    }
    
    // ... save recipe ...
  }
}
```

## 📱 Frontend Upload

### Direct Upload from Browser

```javascript
// frontend/admin/firebase-upload.js

class FirebaseUploader {
  constructor() {
    // Initialize Firebase (client-side)
    const firebaseConfig = {
      apiKey: "your-api-key",
      authDomain: "your-auth-domain",
      projectId: "your-project-id",
      storageBucket: "your-storage-bucket",
      messagingSenderId: "your-sender-id",
      appId: "your-app-id"
    };
    
    firebase.initializeApp(firebaseConfig);
    this.storage = firebase.storage();
  }

  async uploadFile(file, recipeName) {
    try {
      // Create storage reference
      const timestamp = Date.now();
      const fileName = `recipes/${recipeName}_${timestamp}_${file.name}`;
      const storageRef = this.storage.ref(fileName);
      
      // Upload file
      const snapshot = await storageRef.put(file);
      
      // Get download URL
      const downloadUrl = await snapshot.ref.getDownloadURL();
      
      console.log('✅ File uploaded:', downloadUrl);
      return downloadUrl;
      
    } catch (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }
  }
}

// Usage in your admin panel
const uploader = new FirebaseUploader();

// File input handler
document.getElementById('imageInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const recipeName = document.getElementById('recipeName').value;
  
  try {
    const url = await uploader.uploadFile(file, recipeName);
    console.log('Image URL:', url);
    // Use the URL in your recipe
  } catch (error) {
    console.error('Upload failed:', error);
  }
});
```

## 🔒 Security Rules

### Basic Rules (Development)

```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow read access to all
    match /{allPaths=**} {
      allow read: if true;
    }
    
    // Allow write access to recipes folder for authenticated admins
    match /recipes/{fileName} {
      allow write: if request.auth != null;
    }
  }
}
```

### Production Rules (Secure)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Public read for recipe images
    match /recipes/{fileName} {
      allow read: if true;
      
      // Only authenticated admins can write
      allow write: if request.auth != null 
        && request.auth.token.admin == true;
      
      // Validate file type and size
      allow write: if request.resource.size < 10 * 1024 * 1024 // 10MB max
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## 🎯 API Endpoints

### Upload Image Endpoint

```javascript
// backend/routes/AdminRoutes.js

async uploadRecipeImage(req, res) {
  try {
    const { imageUrl, base64Image, recipeName } = req.body;
    
    let firebaseUrl;
    
    if (imageUrl) {
      // Upload from URL
      firebaseUrl = await this.storageManager.uploadImageFromUrl(imageUrl, recipeName);
    } else if (base64Image) {
      // Upload from base64
      firebaseUrl = await this.storageManager.uploadBase64Image(base64Image, recipeName);
    } else {
      throw new Error('No image provided');
    }
    
    res.json({
      success: true,
      url: firebaseUrl,
      message: 'Image uploaded to Firebase Storage'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

// Add route
this.router.post('/storage/upload', 
  requirePermission('write'),
  ErrorHandler.asyncHandler(this.uploadRecipeImage.bind(this))
);
```

### Frontend API Call

```javascript
// Upload image via API
async function uploadImageToFirebase(imageData, recipeName) {
  const response = await fetch('/admin/storage/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      imageUrl: imageData.url, // or base64Image: imageData.base64
      recipeName: recipeName
    })
  });
  
  const result = await response.json();
  return result.url;
}
```

## 💰 Cost Optimization

### Tips to Reduce Costs

1. **Resize images before upload** (max 1200px width)
2. **Use WebP format** for better compression
3. **Set lifecycle rules** to delete old/unused images
4. **Cache images with CDN** (Firebase Hosting)

### Image Optimization

```javascript
// Optimize image before upload
async function optimizeImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Max dimensions
        const maxWidth = 1200;
        const maxHeight = 1200;
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        
        // Resize
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.85); // 85% quality
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
```

## 🔗 Environment Variables

Add to your `.env`:

```bash
# Firebase Storage
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-auth-domain.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
```

## 📊 Benefits of Firebase Storage

✅ **Automatic CDN** - Images served from global edge locations
✅ **Direct uploads** - Users can upload directly without hitting your server
✅ **Resumable uploads** - Large files upload reliably
✅ **Security rules** - Fine-grained access control
✅ **Metadata** - Store custom data with images
✅ **Integrations** - Works seamlessly with Firestore
✅ **Cost-effective** - 5GB free, then $0.026/GB

## 🚨 Important Notes

1. **Never commit** your service account key or Firebase config
2. **Set proper CORS** if accessing from different domains
3. **Monitor usage** in Firebase Console to avoid surprises
4. **Use signed URLs** for temporary access to private files
5. **Implement retry logic** for network failures

## 🎯 Next Steps

1. Enable Firebase Storage in console
2. Update your `serviceAccountKey.json`
3. Install the Storage SDK
4. Implement the StorageManager
5. Update your routes to use Firebase Storage
6. Test with a recipe image upload

Your images will now be stored permanently in Firebase Storage with global CDN delivery! 🚀
