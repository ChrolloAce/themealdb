const { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } = require('firebase/storage');
const { initializeApp } = require('firebase/app');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

class FirebaseStorageManager {
  constructor() {
    this.initialized = false;
    this.storage = null;
    this.bucketName = 'fooddb-d274c.firebasestorage.app';
  }

  /**
   * Initialize Firebase Storage using Web SDK (no service account needed)
   */
  initialize() {
    try {
      // Check if already initialized
      if (this.initialized && this.storage) {
        return true;
      }

      // Simple Firebase config - matches your existing setup
      const firebaseConfig = {
        apiKey: "AIzaSyBLoZwcUJzLLeAbp2ITuedA3ZbCmWPZAAI",
        authDomain: "fooddb-d274c.firebaseapp.com",
        projectId: "fooddb-d274c",
        storageBucket: "fooddb-d274c.firebasestorage.app",
        messagingSenderId: "282379145030",
        appId: "1:282379145030:web:4274bb60d94eb138f0df47"
      };

      // Initialize Firebase app for storage (separate from Firestore)
      let app;
      try {
        app = initializeApp(firebaseConfig, 'storage-app');
      } catch (error) {
        // App might already exist, get it
        const { getApps, getApp } = require('firebase/app');
        const existingApps = getApps();
        app = existingApps.find(a => a.name === 'storage-app') || initializeApp(firebaseConfig, 'storage-app');
      }
      
      this.storage = getStorage(app);
      this.initialized = true;
      
      console.log('✅ Firebase Storage initialized successfully (Web SDK)');
      console.log('🗂️ Storage bucket:', this.bucketName);
      console.log('🔍 Environment check:', {
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL,
        hasFirebaseConfig: !!firebaseConfig.apiKey
      });
      return true;
    } catch (error) {
      console.error('❌ Firebase Storage initialization failed:', error.message);
      
      // Fallback mode - storage won't work but app continues
      this.initialized = false;
      return false;
    }
  }

  /**
   * Check if storage is available
   */
  isAvailable() {
    return this.initialized && this.storage !== null;
  }

  /**
   * Upload image from URL to Firebase Storage
   * @param {string} imageUrl - The image URL to download and store
   * @param {string} recipeName - Name of the recipe for organizing
   * @param {string} category - Optional category for organization
   * @param {string} mealId - Optional meal ID for organization
   * @returns {Promise<string>} - Public URL of stored image
   */
  async uploadImageFromUrl(imageUrl, recipeName, category = 'general', mealId = null) {
    try {
      // Ensure storage is initialized
      if (!this.isAvailable()) {
        console.warn('⚠️ Firebase Storage not available, returning original URL');
        return imageUrl;
      }

      console.log(`📥 Downloading image from: ${imageUrl}`);
      
      // Fetch image from URL
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      console.log('📦 Converting response to buffer...');
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(`📏 Buffer size: ${buffer.length} bytes`);
      
      // Generate unique filename with proper structure
      const timestamp = Date.now();
      const uniqueId = uuidv4().substring(0, 8);
      const sanitizedName = recipeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      // Organize by meal ID if available, otherwise by category
      const fileName = mealId 
        ? `meals/${mealId}/${sanitizedName}_${timestamp}.jpg`
        : `generated/${category}/${sanitizedName}_${timestamp}_${uniqueId}.jpg`;
      
      // Create storage reference
      console.log(`📁 Creating Firebase Storage reference: ${fileName}`);
      const storageRef = ref(this.storage, fileName);
      
      // Upload with metadata using Web SDK
      const metadata = {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
        customMetadata: {
          recipeName: recipeName,
          category: category,
          originalUrl: imageUrl,
          uploadedAt: new Date().toISOString(),
          mealId: mealId ? mealId.toString() : 'none'
        }
      };

      console.log('☁️ Starting Firebase upload...');
      console.log('📊 Upload details:', {
        bufferSize: buffer.length,
        fileName: fileName,
        contentType: metadata.contentType,
        isVercel: !!process.env.VERCEL
      });
      
      await uploadBytes(storageRef, buffer, metadata);
      console.log('✅ Upload complete, getting download URL...');
      
      // Get public URL
      const publicUrl = await getDownloadURL(storageRef);
      
      console.log('✅ Image uploaded to Firebase Storage:', publicUrl);
      console.log(`🗂️ Storage path: ${fileName}`);
      return publicUrl;
      
    } catch (error) {
      console.error('❌ Firebase Storage upload error:', error.message);
      // Return original URL as fallback
      return imageUrl;
    }
  }

  /**
   * Upload base64 image to Firebase Storage
   * @param {string} base64Image - Base64 encoded image
   * @param {string} recipeName - Name of the recipe
   * @param {string} category - Optional category
   * @returns {Promise<string>} - Public URL of stored image
   */
  async uploadBase64Image(base64Image, recipeName, category = 'general') {
    try {
      // Ensure storage is initialized
      if (!this.isAvailable()) {
        console.warn('⚠️ Firebase Storage not available');
        throw new Error('Storage not available');
      }

      // Remove data:image/jpeg;base64, prefix if present
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Generate unique filename
      const timestamp = Date.now();
      const uniqueId = uuidv4().substring(0, 8);
      const sanitizedName = recipeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `recipes/${category}/${sanitizedName}_${timestamp}_${uniqueId}.jpg`;
      
      // Create storage reference
      const storageRef = ref(this.storage, fileName);
      
      // Upload with metadata using Web SDK
      const metadata = {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
        customMetadata: {
          recipeName: recipeName,
          category: category,
          uploadedAt: new Date().toISOString()
        }
      };

      await uploadBytes(storageRef, buffer, metadata);
      
      // Get public URL
      const publicUrl = await getDownloadURL(storageRef);
      
      console.log('✅ Base64 image uploaded to Firebase Storage:', publicUrl);
      return publicUrl;
      
    } catch (error) {
      console.error('❌ Firebase Storage base64 upload error:', error.message);
      throw error;
    }
  }

  /**
   * Upload multiple images in batch
   * @param {Array} images - Array of {url: string, recipeName: string}
   * @returns {Promise<Array>} - Array of Firebase Storage URLs
   */
  async uploadBatch(images) {
    const results = [];
    
    for (const image of images) {
      try {
        const firebaseUrl = await this.uploadImageFromUrl(
          image.url,
          image.recipeName,
          image.category || 'general'
        );
        results.push({
          success: true,
          originalUrl: image.url,
          firebaseUrl: firebaseUrl
        });
      } catch (error) {
        results.push({
          success: false,
          originalUrl: image.url,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Delete image from Firebase Storage
   * @param {string} imageUrl - The Firebase Storage URL to delete
   */
  async deleteImage(imageUrl) {
    try {
      if (!this.isAvailable()) {
        console.warn('⚠️ Firebase Storage not available');
        return false;
      }

      // Extract file path from URL
      const urlPattern = /https:\/\/storage\.googleapis\.com\/[^\/]+\/(.*)/;
      const match = imageUrl.match(urlPattern);
      
      if (!match || !match[1]) {
        throw new Error('Invalid Firebase Storage URL');
      }
      
      const fileName = decodeURIComponent(match[1]);
      
      // Delete file
      await this.bucket.file(fileName).delete();
      
      console.log('✅ Image deleted from Firebase Storage:', fileName);
      return true;
    } catch (error) {
      console.error('❌ Firebase Storage delete error:', error.message);
      return false;
    }
  }

  /**
   * List all images for a recipe
   * @param {string} recipeName - Name of the recipe
   * @param {string} category - Optional category filter
   * @returns {Promise<Array>} - Array of image metadata
   */
  async listRecipeImages(recipeName, category = null) {
    try {
      if (!this.isAvailable()) {
        console.warn('⚠️ Firebase Storage not available');
        return [];
      }

      const sanitizedName = recipeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const prefix = category 
        ? `recipes/${category}/${sanitizedName}_`
        : `recipes/`;
      
      const [files] = await this.bucket.getFiles({
        prefix: prefix,
        delimiter: '/'
      });
      
      const images = await Promise.all(files.map(async file => {
        const [metadata] = await file.getMetadata();
        return {
          name: file.name,
          url: `https://storage.googleapis.com/${this.bucket.name}/${file.name}`,
          size: metadata.size,
          created: metadata.timeCreated,
          metadata: metadata.metadata || {}
        };
      }));
      
      // Filter by recipe name if no category specified
      if (!category) {
        return images.filter(img => 
          img.name.toLowerCase().includes(sanitizedName)
        );
      }
      
      return images;
    } catch (error) {
      console.error('❌ Firebase Storage list error:', error.message);
      return [];
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} - Storage stats
   */
  async getStorageStats() {
    try {
      if (!this.isAvailable()) {
        return {
          available: false,
          totalImages: 0,
          totalSize: 0
        };
      }

      const [files] = await this.bucket.getFiles({
        prefix: 'recipes/'
      });
      
      let totalSize = 0;
      for (const file of files) {
        const [metadata] = await file.getMetadata();
        totalSize += parseInt(metadata.size || 0);
      }
      
      return {
        available: true,
        totalImages: files.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        totalSizeGB: (totalSize / (1024 * 1024 * 1024)).toFixed(3)
      };
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error.message);
      return {
        available: false,
        error: error.message
      };
    }
  }
}

module.exports = FirebaseStorageManager;
