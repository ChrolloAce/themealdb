const express = require('express');
const { ErrorHandler } = require('../middleware/errorHandler');
const { requireAdmin, requirePermission, login, logout, refreshToken, getCurrentAdmin } = require('../middleware/adminAuth');
const OpenAIManager = require('../managers/OpenAIManager');
const RecipeManager = require('../managers/RecipeManager');
const ImageManager = require('../managers/ImageManager');
const AdminManager = require('../managers/AdminManager');
const FirebaseStorageManager = require('../managers/FirebaseStorageManager');

class AdminRoutes {
  constructor(databaseManager) {
    this.router = express.Router();
    this.db = databaseManager;
    this.openaiManager = new OpenAIManager();
    this.recipeManager = new RecipeManager(databaseManager);
    this.imageManager = new ImageManager();
    this.adminManager = new AdminManager();
    this.storageManager = new FirebaseStorageManager();
    
    // Initialize Firebase Storage
    const storageInitialized = this.storageManager.initialize();
    console.log('🔥 Firebase Storage Manager initialization result:', storageInitialized);
    console.log('🔥 Firebase Storage available:', this.storageManager.isAvailable());
    
    this.setupRoutes();
  }

  setupRoutes() {
    // Authentication routes (no auth required)
    this.router.post('/login', ErrorHandler.asyncHandler(login));
    this.router.post('/logout', logout);
    this.router.post('/refresh', ErrorHandler.asyncHandler(refreshToken));
    
    // Protected admin routes
    this.router.use(requireAdmin);
    
    // Admin info
    this.router.get('/me', getCurrentAdmin);
    this.router.get('/dashboard', ErrorHandler.asyncHandler(this.getDashboard.bind(this)));
    
    // Debug/test routes
    this.router.get('/test/openai', ErrorHandler.asyncHandler(this.testOpenAI.bind(this)));
    
    // AI Recipe Generation routes
    this.router.post('/ai/generate-recipe', 
      requirePermission('ai_generate'),
      ErrorHandler.asyncHandler(this.generateRecipe.bind(this))
    );
    
    this.router.post('/ai/generate-ideas', 
      requirePermission('ai_generate'),
      ErrorHandler.asyncHandler(this.generateRecipeIdeas.bind(this))
    );
    
    this.router.post('/ai/generate-seasonal', 
      requirePermission('ai_generate'),
      ErrorHandler.asyncHandler(this.generateSeasonalRecipes.bind(this))
    );
    
    this.router.post('/ai/improve-recipe/:id', 
      requirePermission('ai_generate'),
      ErrorHandler.asyncHandler(this.improveRecipe.bind(this))
    );
    
    // AI Image Generation routes
    this.router.post('/ai/generate-image', 
      requirePermission('ai_generate'),
      ErrorHandler.asyncHandler(this.generateRecipeImage.bind(this))
    );
    
    // Recipe management with AI
    this.router.post('/recipes/create-with-ai', 
      requirePermission('write'),
      ErrorHandler.asyncHandler(this.createRecipeWithAI.bind(this))
    );
    
    this.router.post('/recipes/generate-images',
      requirePermission('ai_generate'),
      ErrorHandler.asyncHandler(this.generateAdditionalImages.bind(this))
    );
    
    this.router.post('/recipes/batch-generate', 
      requirePermission('ai_generate'),
      ErrorHandler.asyncHandler(this.batchGenerateRecipes.bind(this))
    );
    
    // Firebase Storage endpoints
    this.router.post('/storage/upload',
      requirePermission('write'),
      ErrorHandler.asyncHandler(this.uploadToStorage.bind(this))
    );
    
    this.router.get('/storage/stats',
      ErrorHandler.asyncHandler(this.getStorageStats.bind(this))
    );
    
    this.router.get('/storage/test',
      ErrorHandler.asyncHandler(this.testFirebaseStorage.bind(this))
    );
    
    this.router.delete('/storage/image',
      requirePermission('delete'),
      ErrorHandler.asyncHandler(this.deleteFromStorage.bind(this))
    );
    
    // Admin recipe management
    this.router.get('/recipes', ErrorHandler.asyncHandler(this.getAllRecipes.bind(this)));
    this.router.get('/recipes/:id', ErrorHandler.asyncHandler(this.getRecipe.bind(this)));
    this.router.put('/recipes/:id', 
      requirePermission('write'),
      ErrorHandler.asyncHandler(this.updateRecipe.bind(this))
    );
    this.router.delete('/recipes/:id', 
      requirePermission('delete'),
      ErrorHandler.asyncHandler(this.deleteRecipe.bind(this))
    );
  }

  // Dashboard with stats
  async getDashboard(req, res) {
    const stats = await this.adminManager.getDashboardStats(this.db);
    res.json(stats);
  }

  // Generate recipe with AI
  async generateRecipe(req, res) {
    const params = req.body;
    
    try {
      const recipe = await this.openaiManager.generateRecipe(params);
      
      // Generate image if requested
      let imageUrl = null;
      console.log('🔍 Image generation params:', { generateImage: params.generateImage, hasKey: !!process.env.GETIMG_API_KEY });
      
      if (params.generateImage) {
        try {
          console.log('🎨 Generating ULTRA-HIGH QUALITY AI image for preview recipe...');
          
          // Extract ingredients for image generation
          const ingredients = this.extractIngredientNames(recipe);
          
          const imageData = await this.openaiManager.generateRecipeImage(
            recipe.strMeal,
            `${recipe.strCategory} dish from ${recipe.strArea}`,
            null, // No meal ID for preview
            ingredients
          );
          
          imageUrl = imageData.url;
          recipe.strMealThumb = imageUrl;
          
          console.log('✅ ULTRA-HIGH QUALITY AI image generated for preview!');
        } catch (imageError) {
          console.error('❌ Preview image generation failed:', imageError.message);
          // Set placeholder instead of failing
          imageUrl = '/images/placeholder-recipe.jpg';
          recipe.strMealThumb = imageUrl;
        }
      }
      
      res.json({
        success: true,
        recipe,
        imageGenerated: !!imageUrl,
        imageUrl,
        message: 'Recipe generated successfully with image'
      });
    } catch (error) {
      console.error('❌ Recipe generation failed:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        error: 'RECIPE_GENERATION_FAILED'
      });
    }
  }

  // Generate recipe ideas
  async generateRecipeIdeas(req, res) {
    const { count, cuisine, category, trending, seasonal } = req.body;
    
    const ideas = await this.openaiManager.generateRecipeIdeas({
      count,
      cuisine,
      category,
      trending,
      seasonal
    });
    
    res.json({
      success: true,
      ideas,
      count: ideas.length
    });
  }

  // Generate seasonal recipes
  async generateSeasonalRecipes(req, res) {
    const { season, count = 5 } = req.body;
    
    if (!season) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Season is required (spring, summer, fall, winter)'
      });
    }
    
    const recipes = await this.openaiManager.generateSeasonalRecipes(season, count);
    
    res.json({
      success: true,
      recipes,
      season,
      count: recipes.length
    });
  }

  // Improve existing recipe
  async improveRecipe(req, res) {
    const recipeId = req.params.id;
    
    const existingRecipe = await this.recipeManager.getById(recipeId);
    if (!existingRecipe.meals || !existingRecipe.meals[0]) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Recipe not found'
      });
    }
    
    const improvements = await this.openaiManager.improveRecipe(existingRecipe.meals[0]);
    
    res.json({
      success: true,
      improvements,
      originalRecipe: existingRecipe.meals[0]
    });
  }

  // Helper method to extract ingredient names from recipe
  extractIngredientNames(recipe) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipe[`strIngredient${i}`];
      if (ingredient && ingredient.trim()) {
        ingredients.push(ingredient.trim());
      }
    }
    return ingredients;
  }

  // Generate recipe image
  async generateRecipeImage(req, res) {
    const { recipeName, description, mealId, ingredients } = req.body;
    
    if (!recipeName) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Recipe name is required'
      });
    }
    
    try {
      console.log(`🎨 Starting AI image generation for: ${recipeName}`);
      
      const imageData = await this.openaiManager.generateRecipeImage(recipeName, description, mealId, ingredients || []);
      
      console.log('✅ AI image generation completed!');
      
      res.json({
        success: true,
        image: imageData,
        message: 'ULTRA-HIGH QUALITY image generated and saved successfully',
        localUrl: imageData.url,
        saved: imageData.saved,
        quality: 'hd',
        enhancedPrompt: imageData.prompt.length > 100,
        promptPreview: imageData.prompt.substring(0, 200) + '...'
      });
    } catch (error) {
      console.error('❌ Image generation failed:', error.message);
      res.status(500).json({
        error: 'Image Generation Failed',
        message: error.message
      });
    }
  }

  // Generate additional images for a recipe
  async generateAdditionalImages(req, res) {
    const { recipeName, count = 1 } = req.body;
    
    try {
      const imageUrls = [];
      const variations = ['artistic', 'close-up', 'plated beautifully', 'professional food photography', 'rustic style'];
      
      console.log(`🎨 Generating ${count} additional images for ${recipeName}...`);
      
      for (let i = 0; i < count; i++) {
        try {
          const variation = variations[i % variations.length];
          const imageData = await this.openaiManager.generateRecipeImage(
            recipeName,
            `${variation} delicious food`,
            null,
            [] // No specific ingredients for additional images
          );
          imageUrls.push(imageData.url);
          console.log(`  ✅ Image ${i + 1}/${count} generated`);
        } catch (error) {
          console.error(`  ❌ Failed to generate image ${i + 1}:`, error.message);
        }
      }
      
      res.json({
        success: true,
        images: imageUrls,
        count: imageUrls.length,
        message: `Generated ${imageUrls.length} images`
      });
    } catch (error) {
      console.error('❌ Additional image generation error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate images'
      });
    }
  }
  
  // Create recipe with AI and save to database
  async createRecipeWithAI(req, res) {
    const aiParams = req.body;
    const imageCount = parseInt(req.body.imageCount) || 1;
    
    try {
      // Generate recipe with AI
      const generatedRecipe = await this.openaiManager.generateRecipe(aiParams);
      
      // Save recipe to database first to get meal ID
      console.log('💾 Saving recipe to database...');
      const savedRecipe = await this.recipeManager.create(generatedRecipe);
      
      if (!savedRecipe.meals || !savedRecipe.meals[0]) {
        throw new Error('Failed to save recipe to database');
      }
      
      const mealId = savedRecipe.meals[0].idMeal;
      console.log(`✅ Recipe saved with ID: ${mealId}`);
      
      // Now generate images with proper meal ID for Firebase Storage organization
      let imageUrls = [];
      let primaryImageUrl = null;
      
      if (req.body.generateImage && imageCount > 0) {
        console.log(`🎨 Generating ${imageCount} AI images for recipe ID: ${mealId}...`);
        
        for (let i = 0; i < imageCount; i++) {
          try {
            console.log(`  📸 Generating image ${i + 1}/${imageCount}...`);
            
            // Add variation to prompt for different images
            const variations = ['artistic', 'close-up', 'plated beautifully', 'professional food photography', 'rustic style'];
            const variation = variations[i % variations.length];
            
            // Extract ingredients for accurate image generation
            const ingredients = this.extractIngredientNames(generatedRecipe);
            
            const imageData = await this.openaiManager.generateRecipeImage(
              generatedRecipe.strMeal,
              `${variation} ${generatedRecipe.strCategory} dish from ${generatedRecipe.strArea}`,
              mealId, // Now we have the meal ID!
              ingredients
            );
            
            // Upload to Firebase Storage with meal ID for proper organization
            let finalImageUrl = imageData.url;
            console.log(`🔍 DEBUG: Storage manager available? ${this.storageManager.isAvailable()}`);
            console.log(`🔍 DEBUG: Image data:`, { url: imageData.url, recipeName: generatedRecipe.strMeal, mealId });
            
            if (this.storageManager.isAvailable()) {
              try {
                console.log(`  ☁️ Uploading to Firebase Storage with meal ID ${mealId}...`);
                console.log(`  📤 Upload params:`, {
                  url: imageData.url,
                  recipeName: generatedRecipe.strMeal,
                  category: generatedRecipe.strCategory,
                  mealId: mealId
                });
                
                finalImageUrl = await this.storageManager.uploadImageFromUrl(
                  imageData.url,
                  generatedRecipe.strMeal,
                  generatedRecipe.strCategory,
                  mealId // Pass meal ID for proper organization
                );
                console.log(`  ✅ Uploaded to Firebase Storage: ${finalImageUrl}`);
              } catch (storageError) {
                console.error(`  ⚠️ Firebase upload failed, using original URL:`, storageError.message);
                console.error('Full error:', storageError);
              }
            } else {
              console.warn('⚠️ Firebase Storage not available, keeping original URL');
              console.warn('🔍 DEBUG: Storage manager state:', {
                initialized: this.storageManager.initialized,
                storage: !!this.storageManager.storage
              });
            }
            
            imageUrls.push(finalImageUrl);
            
            // First image becomes the primary thumbnail
            if (i === 0) {
              primaryImageUrl = finalImageUrl;
            }
            
            console.log(`  ✅ Image ${i + 1} generated successfully!`);
          } catch (imageError) {
            console.error(`  ❌ Image ${i + 1} generation failed:`, imageError.message);
            
            // Add placeholder for failed image
            if (i === 0) {
              primaryImageUrl = '/images/placeholder-recipe.jpg';
            }
          }
        }
        
        console.log(`✅ Generated ${imageUrls.length}/${imageCount} images successfully!`);
        
        // Update recipe with ALL images in database (not just primary)
        if (imageUrls.length > 0) {
          console.log(`🖼️ Updating recipe with ${imageUrls.length} images in database...`);
          try {
            // Create images array with metadata
            const imagesArray = imageUrls.map((url, index) => ({
              url: url,
              alt: `${generatedRecipe.strMeal} image ${index + 1}`,
              isPrimary: index === 0,
              order: index,
              metadata: {
                generated: true,
                timestamp: new Date().toISOString(),
                quality: 'ultra-hd'
              }
            }));
            
            // Update recipe with comprehensive image data
            const updateData = {
              strMealThumb: primaryImageUrl,
              images: imagesArray,
              imageCount: imageUrls.length,
              additionalImages: imageUrls, // Legacy compatibility
              imageUrls: imageUrls // Legacy compatibility
            };
            
            await this.recipeManager.update(mealId, updateData);
            
            // Update response object with comprehensive image data
            savedRecipe.meals[0].strMealThumb = primaryImageUrl;
            savedRecipe.meals[0].images = imagesArray;
            savedRecipe.meals[0].imageCount = imageUrls.length;
            savedRecipe.meals[0].additionalImages = imageUrls;
            savedRecipe.meals[0].imageUrls = imageUrls;
            
            console.log('✅ Recipe updated with all images in database');
          } catch (updateError) {
            console.error('❌ Failed to update recipe with images:', updateError.message);
            
            // Fallback: at least try to save the primary image
            try {
              await this.recipeManager.update(mealId, { strMealThumb: primaryImageUrl });
              savedRecipe.meals[0].strMealThumb = primaryImageUrl;
              console.log('✅ Fallback: Primary image saved');
            } catch (fallbackError) {
              console.error('❌ Even fallback failed:', fallbackError.message);
            }
          }
        }
      }
      
      res.json({
        success: true,
        recipe: savedRecipe.meals[0],
        imageGenerated: imageUrls.length > 0,
        imageUrl: primaryImageUrl,
        imageUrls: imageUrls,
        imageCount: imageUrls.length,
        imageQuality: primaryImageUrl ? 'ultra-hd' : null,
        images: savedRecipe.meals[0].images || [],
        imageGallery: savedRecipe.meals[0].imageGallery || [],
        message: `Recipe created successfully with ${imageUrls.length} AI image(s) stored permanently`
      });
    } catch (error) {
      console.error('❌ Recipe generation error in route:', error.message);
      console.error('❌ Full error stack:', error.stack);
      
      res.status(500).json({
        success: false,
        message: error.message || 'An unexpected error occurred. Please try again later.',
        error: 'RECIPE_GENERATION_FAILED'
      });
    }
  }

  // Batch generate multiple recipes
  async batchGenerateRecipes(req, res) {
    const { recipes, generateImages = false } = req.body;
    
    if (!recipes || !Array.isArray(recipes)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Recipes array is required'
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const recipeParams of recipes) {
      try {
        // Generate recipe
        const generatedRecipe = await this.openaiManager.generateRecipe(recipeParams);
        
        // Save to database
        const savedRecipe = await this.recipeManager.create(generatedRecipe);
        
        // Generate image if requested
        let imageUrl = null;
        if (generateImages) {
          try {
            console.log(`🎨 Generating AI image for: ${generatedRecipe.strMeal}`);
            
            // Extract ingredients for accurate image generation
            const ingredients = this.extractIngredientNames(generatedRecipe);
            
            const imageData = await this.openaiManager.generateRecipeImage(
              generatedRecipe.strMeal,
              `${generatedRecipe.strCategory} dish from ${generatedRecipe.strArea}`,
              savedRecipe.meals[0].idMeal,
              ingredients
            );
            imageUrl = imageData.url;
            
            await this.recipeManager.update(savedRecipe.meals[0].idMeal, {
              strMealThumb: imageUrl
            });
            
            console.log(`✅ AI image saved for: ${generatedRecipe.strMeal}`);
          } catch (imageError) {
            console.error(`❌ Image generation failed for ${generatedRecipe.strMeal}:`, imageError.message);
          }
        }
        
        results.push({
          success: true,
          recipe: savedRecipe.meals[0],
          imageUrl
        });
      } catch (error) {
        errors.push({
          params: recipeParams,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      results,
      errors,
      generated: results.length,
      failed: errors.length
    });
  }

  // Get all recipes for admin
  async getAllRecipes(req, res) {
    const { page = 1, limit = 50 } = req.query;
    
    try {
      // Use Firebase method if available
      if (this.db.getAllRecipes) {
        const recipes = await this.db.getAllRecipes(parseInt(limit));
        
        res.json({
          recipes,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: recipes.length,
            pages: Math.ceil(recipes.length / limit)
          }
        });
      } else {
        // Fallback for SQLite
        const offset = (page - 1) * limit;
        const recipes = await this.db.all(
          'SELECT * FROM recipes ORDER BY dateModified DESC LIMIT ? OFFSET ?',
          [parseInt(limit), offset]
        );
        
        const total = await this.db.get('SELECT COUNT(*) as count FROM recipes');
        
        res.json({
          recipes,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total.count,
            pages: Math.ceil(total.count / limit)
          }
        });
      }
    } catch (error) {
      console.error('Error getting recipes:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve recipes'
      });
    }
  }

  // Get single recipe for editing
  async getRecipe(req, res) {
    const recipeId = req.params.id;
    
    try {
      // Use Firebase method if available
      if (this.db.getRecipe) {
        const recipe = await this.db.getRecipe(recipeId);
        
        if (!recipe) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'Recipe not found'
          });
        }
        
        res.json({ recipe });
      } else {
        // Fallback for SQLite
        const recipe = await this.db.get('SELECT * FROM recipes WHERE idMeal = ?', [recipeId]);
        
        if (!recipe) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'Recipe not found'
          });
        }
        
        res.json({ recipe });
      }
    } catch (error) {
      console.error('Error getting recipe:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve recipe'
      });
    }
  }

  // Update recipe
  async updateRecipe(req, res) {
    const recipeId = req.params.id;
    const updateData = req.body;
    
    try {
      // Use Firebase method if available
      if (this.db.updateRecipe) {
        const result = await this.db.updateRecipe(recipeId, updateData);
        
        if (!result.success) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'Recipe not found'
          });
        }
        
        res.json({
          success: true,
          message: 'Recipe updated successfully'
        });
      } else {
        // Fallback to RecipeManager for SQLite
        const result = await this.recipeManager.update(recipeId, updateData);
        
        if (!result.success) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'Recipe not found'
          });
        }
        
        res.json({
          success: true,
          message: 'Recipe updated successfully'
        });
      }
    } catch (error) {
      console.error('Error updating recipe:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update recipe'
      });
    }
  }

  // Upload image to Firebase Storage
  async uploadToStorage(req, res) {
    try {
      const { imageUrl, base64Image, recipeName, category } = req.body;
      
      if (!recipeName) {
        throw new Error('Recipe name is required');
      }
      
      let firebaseUrl;
      
      if (imageUrl) {
        // Upload from URL
        firebaseUrl = await this.storageManager.uploadImageFromUrl(
          imageUrl, 
          recipeName, 
          category || 'general'
        );
      } else if (base64Image) {
        // Upload from base64
        firebaseUrl = await this.storageManager.uploadBase64Image(
          base64Image, 
          recipeName, 
          category || 'general'
        );
      } else {
        throw new Error('No image provided (imageUrl or base64Image required)');
      }
      
      res.json({
        success: true,
        url: firebaseUrl,
        message: 'Image uploaded to Firebase Storage successfully'
      });
    } catch (error) {
      console.error('Storage upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload image'
      });
    }
  }
  
  // Get storage statistics
  async getStorageStats(req, res) {
    try {
      const stats = await this.storageManager.getStorageStats();
      res.json({
        success: true,
        ...stats
      });
    } catch (error) {
      console.error('Storage stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get storage stats'
      });
    }
  }

  // Test Firebase Storage initialization
  async testFirebaseStorage(req, res) {
    try {
      console.log('🧪 Testing Firebase Storage...');
      console.log('🔍 Storage Manager State:');
      console.log('  - Initialized:', this.storageManager.initialized);
      console.log('  - Available:', this.storageManager.isAvailable());
      console.log('  - Storage object:', !!this.storageManager.storage);
      console.log('  - Bucket name:', this.storageManager.bucketName);
      
      const testResult = {
        initialized: this.storageManager.initialized,
        available: this.storageManager.isAvailable(),
        storage: !!this.storageManager.storage,
        bucketName: this.storageManager.bucketName,
        timestamp: new Date().toISOString()
      };
      
      res.json({
        success: true,
        message: 'Firebase Storage test completed',
        result: testResult
      });
    } catch (error) {
      console.error('❌ Firebase Storage test failed:', error);
      res.status(500).json({
        success: false,
        message: 'Firebase Storage test failed',
        error: error.message
      });
    }
  }
  
  // Delete image from Firebase Storage
  async deleteFromStorage(req, res) {
    try {
      const { imageUrl } = req.body;
      
      if (!imageUrl) {
        throw new Error('Image URL is required');
      }
      
      const deleted = await this.storageManager.deleteImage(imageUrl);
      
      res.json({
        success: deleted,
        message: deleted ? 'Image deleted successfully' : 'Failed to delete image'
      });
    } catch (error) {
      console.error('Storage delete error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete image'
      });
    }
  }
  
  // Delete recipe
  async deleteRecipe(req, res) {
    const recipeId = req.params.id;
    
    try {
      // Use Firebase method if available
      if (this.db.deleteRecipe) {
        const result = await this.db.deleteRecipe(recipeId);
        
        if (!result.success) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'Recipe not found'
          });
        }
        
        res.json({
          success: true,
          message: 'Recipe deleted successfully'
        });
      } else {
        // Fallback to RecipeManager for SQLite
        const result = await this.recipeManager.delete(recipeId);
        
        if (!result.success) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'Recipe not found'
          });
        }
        
        res.json({
          success: true,
          message: 'Recipe deleted successfully'
        });
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete recipe'
      });
    }
  }

  // Test OpenAI connection
  async testOpenAI(req, res) {
    try {
      console.log('🔍 Testing OpenAI connection...');
      
      // Check environment variables
      const hasApiKey = !!process.env.OPENAI_API_KEY;
      const apiKeyMasked = hasApiKey ? 
        `${process.env.OPENAI_API_KEY.substring(0, 7)}...${process.env.OPENAI_API_KEY.slice(-4)}` : 
        'NOT_SET';
      
      if (!hasApiKey) {
        return res.json({
          success: false,
          error: 'OpenAI API key not configured',
          details: {
            apiKey: apiKeyMasked,
            model: process.env.OPENAI_MODEL || 'gpt-4',
            imageModel: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3'
          }
        });
      }
      
      // Try a simple API call
      const testResult = await this.openaiManager.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Say "OpenAI connection test successful"' }],
        max_tokens: 20
      });
      
      res.json({
        success: true,
        message: 'OpenAI connection successful',
        details: {
          apiKey: apiKeyMasked,
          model: process.env.OPENAI_MODEL || 'gpt-4',
          imageModel: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
          testResponse: testResult.choices[0].message.content
        }
      });
    } catch (error) {
      console.error('❌ OpenAI test failed:', error);
      res.status(500).json({
        success: false,
        error: 'OpenAI test failed',
        message: error.message,
        details: {
          apiKey: process.env.OPENAI_API_KEY ? 'SET_BUT_INVALID' : 'NOT_SET',
          errorType: error.code || 'UNKNOWN'
        }
      });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = AdminRoutes;