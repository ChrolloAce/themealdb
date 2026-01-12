const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class ImageManager {
  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 5000000; // 5MB
    this.allowedTypes = (process.env.ALLOWED_IMAGE_TYPES || 'jpg,jpeg,png,webp').split(',');
    
    this.initializeStorage();
  }

  initializeStorage() {
    // Configure multer for file uploads
    this.storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(this.uploadPath, 'images', 'temp');
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    });

    this.upload = multer({
      storage: this.storage,
      limits: {
        fileSize: this.maxFileSize
      },
      fileFilter: (req, file, cb) => {
        this.validateFile(file, cb);
      }
    });
  }

  validateFile(file, callback) {
    const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
    
    if (!this.allowedTypes.includes(fileExtension)) {
      return callback(new Error(`File type not allowed. Allowed types: ${this.allowedTypes.join(', ')}`));
    }
    
    if (file.mimetype && !file.mimetype.startsWith('image/')) {
      return callback(new Error('File must be an image'));
    }
    
    callback(null, true);
  }

  // Get multer middleware for single file upload
  getSingleUploadMiddleware(fieldName = 'image') {
    return this.upload.single(fieldName);
  }

  // Process and save meal image with multiple sizes
  async processMealImage(tempFilePath, mealId) {
    try {
      const filename = `${mealId}.jpg`;
      const mealDir = path.join(this.uploadPath, 'images', 'meals');
      
      // Ensure directory exists
      await this.ensureDirectoryExists(mealDir);
      
      // Process different sizes
      const sizes = {
        small: { width: 200, height: 200, suffix: 'small' },
        medium: { width: 400, height: 400, suffix: 'medium' },
        large: { width: 800, height: 600, suffix: 'large' },
        original: { width: null, height: null, suffix: '' }
      };
      
      const processedImages = {};
      
      for (const [sizeName, config] of Object.entries(sizes)) {
        const outputPath = config.suffix ? 
          path.join(mealDir, `${mealId}-${config.suffix}.jpg`) :
          path.join(mealDir, filename);
        
        let sharpInstance = sharp(tempFilePath)
          .jpeg({ quality: 85, progressive: true });
        
        if (config.width && config.height) {
          sharpInstance = sharpInstance.resize(config.width, config.height, {
            fit: 'cover',
            position: 'center'
          });
        }
        
        await sharpInstance.toFile(outputPath);
        
        processedImages[sizeName] = {
          path: outputPath,
          url: `/images/meals/${path.basename(outputPath)}`
        };
      }
      
      // Clean up temp file
      await this.cleanupTempFile(tempFilePath);
      
      return processedImages;
    } catch (error) {
      await this.cleanupTempFile(tempFilePath);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  // Process and save ingredient image
  async processIngredientImage(tempFilePath, ingredientName) {
    try {
      const safeName = this.sanitizeFilename(ingredientName);
      const ingredientDir = path.join(this.uploadPath, 'images', 'ingredients');
      
      await this.ensureDirectoryExists(ingredientDir);
      
      const sizes = {
        small: { width: 100, height: 100, suffix: '-small' },
        medium: { width: 200, height: 200, suffix: '-medium' },
        large: { width: 400, height: 400, suffix: '-large' },
        original: { width: 256, height: 256, suffix: '' }
      };
      
      const processedImages = {};
      
      for (const [sizeName, config] of Object.entries(sizes)) {
        const filename = `${safeName}${config.suffix}.png`;
        const outputPath = path.join(ingredientDir, filename);
        
        await sharp(tempFilePath)
          .resize(config.width, config.height, {
            fit: 'cover',
            position: 'center',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png({ quality: 90 })
          .toFile(outputPath);
        
        processedImages[sizeName] = {
          path: outputPath,
          url: `/images/ingredients/${filename}`
        };
      }
      
      await this.cleanupTempFile(tempFilePath);
      return processedImages;
    } catch (error) {
      await this.cleanupTempFile(tempFilePath);
      throw new Error(`Ingredient image processing failed: ${error.message}`);
    }
  }

  // Generate thumbnail URL for meal
  getMealThumbnailUrl(mealId, size = 'medium') {
    const sizeMap = {
      'small': 'small',
      'medium': 'medium', 
      'large': 'large',
      'preview': 'small'
    };
    
    const sizeString = sizeMap[size] || 'medium';
    const suffix = sizeString === 'medium' ? '' : `-${sizeString}`;
    
    return `/images/meals/${mealId}${suffix}.jpg`;
  }

  // Generate ingredient image URL
  getIngredientImageUrl(ingredientName, size = 'medium') {
    const safeName = this.sanitizeFilename(ingredientName);
    const suffix = size === 'medium' ? '' : `-${size}`;
    
    return `/images/ingredients/${safeName}${suffix}.png`;
  }

  // Delete meal images
  async deleteMealImages(mealId) {
    try {
      const mealDir = path.join(this.uploadPath, 'images', 'meals');
      const files = await fs.readdir(mealDir);
      
      const mealFiles = files.filter(file => file.startsWith(`${mealId}.`) || file.startsWith(`${mealId}-`));
      
      for (const file of mealFiles) {
        await fs.unlink(path.join(mealDir, file));
      }
      
      return { deleted: mealFiles.length };
    } catch (error) {
      throw new Error(`Delete meal images failed: ${error.message}`);
    }
  }

  // Utility methods
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async cleanupTempFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to cleanup temp file: ${filePath}`, error.message);
    }
  }

  sanitizeFilename(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // Check if image exists
  async imageExists(imagePath) {
    try {
      await fs.access(imagePath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = ImageManager;