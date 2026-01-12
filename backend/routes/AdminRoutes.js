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
    this.recipeManager = new RecipeManager(databaseManager);
    
    // Initialize OpenAIManager with recipeManager for uniqueness checking
    this.openaiManager = new OpenAIManager(this.recipeManager);
    
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
    
    // Database seeding route
    this.router.post('/seed-recipes',
      requirePermission('write'), 
      ErrorHandler.asyncHandler(this.seedSampleRecipes.bind(this))
    );
    
    // Fix dish types migration
    this.router.post('/fix-dish-types',
      requirePermission('write'),
      ErrorHandler.asyncHandler(this.fixDishTypes.bind(this))
    );
    
    // Multi-step recipe generation (HIGH QUALITY)
    this.router.post('/ai/generate-recipe-multistep',
      requirePermission('ai_generate'),
      ErrorHandler.asyncHandler(this.generateRecipeMultiStep.bind(this))
    );
    
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
    // Delete all recipes route (MUST come before /:id routes)
    this.router.delete('/recipes/delete-all', 
      requirePermission('delete'),
      ErrorHandler.asyncHandler(this.deleteAllRecipes.bind(this))
    );
    
    this.router.get('/recipes/:id', ErrorHandler.asyncHandler(this.getRecipe.bind(this)));
    this.router.put('/recipes/:id', 
      requirePermission('write'),
      ErrorHandler.asyncHandler(this.updateRecipe.bind(this))
    );
    this.router.delete('/recipes/:id', 
      requirePermission('delete'),
      ErrorHandler.asyncHandler(this.deleteRecipe.bind(this))
    );
    
    // Image management routes
    this.router.delete('/recipes/:id/image',
      requirePermission('write'),
      ErrorHandler.asyncHandler(this.deleteRecipeImage.bind(this))
    );
    
    this.router.post('/recipes/:id/generate-image',
      requirePermission('ai_generate'),
      ErrorHandler.asyncHandler(this.generateRecipeImage.bind(this))
    );
  }

  // Dashboard with stats
  async getDashboard(req, res) {
    const stats = await this.adminManager.getDashboardStats(this.db);
    res.json(stats);
  }

  // Seed sample recipes manually
  async seedSampleRecipes(req, res) {
    try {
      const { DataSeeder } = require('../utils/sampleData');
      const seeder = new DataSeeder(this.recipeManager);
      
      await seeder.seedSampleRecipes();
      
      res.json({ 
        success: true,
        message: '✅ Successfully seeded 5 sample recipes!',
        recipes: ['Spicy Arrabiata Penne', 'Classic Beef Tacos', 'Chicken Teriyaki Bowl', 'Mediterranean Salmon', 'Chocolate Chip Cookies']
      });
    } catch (error) {
      console.error('❌ Error seeding recipes:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }

  // Fix dish types for existing recipes
  async fixDishTypes(req, res) {
    try {
      console.log('\n🔧 ═══════════════════════════════════════════');
      console.log('🔧 FIXING DISH TYPES IN EXISTING RECIPES');
      console.log('═══════════════════════════════════════════\n');

      const dishTypesByCategory = {
        'Breakfast': ['Skillet & One-Pan Meals', 'Sandwiches & Wraps', 'Baked Goods', 'Pastries'],
        'Brunch': ['Skillet & One-Pan Meals', 'Sandwiches & Wraps', 'Salads', 'Main Courses'],
        'Lunch': ['Sandwiches & Wraps', 'Salads', 'Soups', 'Burgers', 'Pizza & Flatbreads', 'Pasta & Noodles'],
        'Dinner': ['Main Courses', 'Pasta & Noodles', 'Rice Dishes', 'Stir-Fries', 'Curries', 'Stews & Casseroles', 'Grilling / BBQ', 'Tacos, Burritos & Quesadillas'],
        'Snack': ['Appetizers', 'Side Dishes', 'Cookies & Bars', 'Frozen Treats', 'Baked Goods'],
        'Dessert': ['Baked Goods', 'Pastries', 'Cookies & Bars', 'Pies & Cobblers', 'Frozen Treats']
      };

      const allDishTypes = [
        'Appetizers', 'Side Dishes', 'Main Courses', 'Soups', 'Salads',
        'Sandwiches & Wraps', 'Burgers', 'Pizza & Flatbreads', 'Pasta & Noodles',
        'Rice Dishes', 'Tacos, Burritos & Quesadillas', 'Stir-Fries', 'Curries',
        'Stews & Casseroles', 'Skillet & One-Pan Meals', 'Baked Goods', 'Pastries',
        'Cookies & Bars', 'Pies & Cobblers', 'Frozen Treats'
      ];

      const getRandomDishType = (category) => {
        const options = dishTypesByCategory[category] || allDishTypes;
        return options[Math.floor(Math.random() * options.length)];
      };

      // Get all recipes
      const allRecipes = await this.db.getAllRecipes();
      console.log(`📊 Found ${allRecipes.length} recipes to check`);

      let updatedCount = 0;
      let skippedCount = 0;
      const updates = [];

      for (const recipe of allRecipes) {
        const currentDishType = recipe.dishType || 'Main Course';

        // Only update if it's "Main Course" or empty
        if (currentDishType === 'Main Course' || !currentDishType || currentDishType.trim() === '') {
          const newDishType = getRandomDishType(recipe.strCategory);

          console.log(`🔄 "${recipe.strMeal}": "${currentDishType}" → "${newDishType}"`);

          try {
            await this.recipeManager.update(recipe.idMeal, { dishType: newDishType });
            updatedCount++;
            updates.push({
              id: recipe.idMeal,
              name: recipe.strMeal,
              category: recipe.strCategory,
              oldDishType: currentDishType,
              newDishType
            });
          } catch (error) {
            console.error(`   ❌ Update failed: ${error.message}`);
          }
        } else {
          skippedCount++;
        }
      }

      console.log('\n═══════════════════════════════════════════');
      console.log(`✅ Updated: ${updatedCount} recipes`);
      console.log(`⏭️ Skipped: ${skippedCount} recipes`);
      console.log('═══════════════════════════════════════════\n');

      res.json({
        success: true,
        message: `✅ Updated ${updatedCount} recipes with random dish types!`,
        updated: updatedCount,
        skipped: skippedCount,
        total: allRecipes.length,
        updates
      });

    } catch (error) {
      console.error('❌ Fix dish types failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Generate recipe with multi-step AI (HIGH QUALITY - 4 API calls)
  async generateRecipeMultiStep(req, res) {
    const params = req.body;
    
    console.log('🎯 Multi-step recipe generation request received');
    console.log('   This will make 4 separate AI calls for maximum quality');
    
    try {
      // Force multi-step mode
      const generationParams = {
        ...params,
        useMultiStep: true
      };
      
      // Generate with uniqueness checking and validation
      const generatedRecipe = await this.openaiManager.generateUniqueRecipe(generationParams, 3);
      
      // Validate
      const RecipeValidator = require('../utils/RecipeValidator');
      const validation = RecipeValidator.validate(generatedRecipe);
      
      res.json({
        success: true,
        recipe: generatedRecipe,
        generationMethod: 'multi-step (4 AI calls)',
        validation: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          missingIngredients: validation.missingIngredients || [],
          unusedIngredients: validation.unusedIngredients || []
        },
        isDuplicate: generatedRecipe._isDuplicate || false,
        message: `High-quality recipe generated using 4-step AI process${validation.valid ? ' ✅' : ` with ${validation.errors.length} errors ⚠️`}`
      });
    } catch (error) {
      console.error('❌ Multi-step generation failed:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        error: 'MULTI_STEP_GENERATION_FAILED'
      });
    }
  }

  // Generate recipe with AI
  async generateRecipe(req, res) {
    const params = req.body;
    
    console.log('📥 Recipe generation request received');
    console.log('   Params:', JSON.stringify(params, null, 2));
    
    try {
      // Use generateUniqueRecipe for better duplicate handling
      // If filters are provided, pass them for filtered generation
      const recipe = await this.openaiManager.generateUniqueRecipe(params, 3);
      
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
      
      // Validate recipe completeness
      const RecipeValidator = require('../utils/RecipeValidator');
      const validation = RecipeValidator.validate(recipe);
      
      // Check if recipe is marked as duplicate
      const isDuplicate = recipe._isDuplicate || false;
      const duplicateWarning = isDuplicate 
        ? `⚠️ Warning: This recipe may be similar to "${recipe._duplicateOf}". Reason: ${recipe._duplicateReason}`
        : null;

      // Build comprehensive message
      let message = 'Recipe generated successfully';
      const issues = [];
      
      if (isDuplicate) {
        issues.push(duplicateWarning);
      }
      
      if (!validation.valid) {
        issues.push(`${validation.errors.length} validation error(s)`);
      }
      
      if (validation.warnings.length > 0) {
        issues.push(`${validation.warnings.length} warning(s)`);
      }
      
      if (issues.length > 0) {
        message = `Recipe generated with issues: ${issues.join(', ')}`;
      }

      res.json({
        success: true,
        recipe,
        imageGenerated: !!imageUrl,
        imageUrl,
        isDuplicate,
        duplicateWarning,
        validation: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          missingIngredients: validation.missingIngredients || [],
          unusedIngredients: validation.unusedIngredients || []
        },
        message
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
    const useMultiStep = req.body.useMultiStep === true; // Default: false (single-step)
    
    try {
      console.log('🎨 Creating recipe with AI');
      console.log(`   Generation mode: ${useMultiStep ? 'MULTI-STEP (4 calls)' : 'SINGLE-STEP (1 call)'}`);
      console.log('   Uniqueness checking: ENABLED');
      console.log('   Validation: ENABLED');
      
      // Add useMultiStep flag to params
      const generationParams = {
        ...aiParams,
        useMultiStep
      };
      
      // Generate unique recipe with validation (up to 3 retries)
      const generatedRecipe = await this.openaiManager.generateUniqueRecipe(generationParams, 3);
      
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
            console.error('Full error:', imageError);
            
            // Image failure is tracked by checking imageUrls.length later
            // User will see warning in response if images failed
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
            
            // Update recipe with CLEAN image data (modern format only)
            const updateData = {
              strMealThumb: primaryImageUrl,
              additionalImages: imageUrls.slice(1), // ✅ Skip first image (it's the main thumb!)
              imageCount: imageUrls.length
            };
            
            // ❌ NO MORE: images array, imageUrls array
            
            await this.recipeManager.update(mealId, updateData);
            
            // Update response object with comprehensive image data
            savedRecipe.meals[0].strMealThumb = primaryImageUrl;
            savedRecipe.meals[0].images = imagesArray;
            savedRecipe.meals[0].imageCount = imageUrls.length;
            savedRecipe.meals[0].additionalImages = imageUrls.slice(1); // ✅ Skip first image
            savedRecipe.meals[0].imageUrls = imageUrls; // ✅ Keep all for legacy compat
            
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
      
      // Generate appropriate message based on image generation results
      let message = 'Recipe created successfully';
      let warning = null;
      
      if (req.body.generateImage && imageCount > 0) {
        if (imageUrls.length === 0) {
          warning = '⚠️ Image generation failed! Check OpenAI API key and quota. Recipe saved without images.';
          message += ' (NO IMAGES - generation failed)';
        } else if (imageUrls.length < imageCount) {
          warning = `⚠️ Only ${imageUrls.length}/${imageCount} images generated. Some failed.`;
          message += ` with ${imageUrls.length}/${imageCount} images`;
        } else {
          message += ` with ${imageUrls.length} AI image(s) stored permanently`;
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
        message: message,
        warning: warning
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
    
    console.log(`\n🔥 ═══════════════════════════════════════════`);
    console.log(`🔥 BATCH RECIPE GENERATION`);
    console.log(`═══════════════════════════════════════════`);
    console.log(`📦 Recipes to generate: ${recipes.length}`);
    console.log(`🖼️ Generate images: ${generateImages}`);
    console.log(`═══════════════════════════════════════════\n`);
    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < recipes.length; i++) {
      const recipeParams = recipes[i];
      console.log(`\n[${i + 1}/${recipes.length}] Starting generation...`);
      
      try {
        // Generate unique recipe with validation (up to 3 retries per recipe)
        const generatedRecipe = await this.openaiManager.generateUniqueRecipe(recipeParams, 3);
        
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
        
        // Validate the generated recipe
        const RecipeValidator = require('../utils/RecipeValidator');
        const validation = RecipeValidator.validate(generatedRecipe);
        
        console.log(`[${i + 1}/${recipes.length}] ✅ Recipe "${generatedRecipe.strMeal}" saved`);
        console.log(`   Validation: ${validation.valid ? '✅ PASSED' : `❌ FAILED (${validation.errors.length} errors)`}`);
        
        results.push({
          success: true,
          recipe: savedRecipe.meals[0],
          imageUrl,
          validation: {
            valid: validation.valid,
            errors: validation.errors,
            warnings: validation.warnings
          },
          isDuplicate: generatedRecipe._isDuplicate || false
        });
      } catch (error) {
        console.error(`[${i + 1}/${recipes.length}] ❌ Failed:`, error.message);
        errors.push({
          params: recipeParams,
          error: error.message
        });
      }
    }
    
    console.log(`\n═══════════════════════════════════════════`);
    console.log(`🎉 BATCH GENERATION COMPLETE`);
    console.log(`✅ Success: ${results.length}/${recipes.length}`);
    console.log(`❌ Errors: ${errors.length}/${recipes.length}`);
    console.log(`═══════════════════════════════════════════\n`);
    
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
    const { page = 1, limit = 50 } = req.query; // ✅ Pagination: 50 per page
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    try {
      // Use Firebase method if available
      if (this.db.getAllRecipes) {
        // Get ALL recipes first (Firebase doesn't support offset-based pagination easily)
        const allRecipes = await this.db.getAllRecipes(9999);
        
        const total = allRecipes.length;
        const totalPages = Math.ceil(total / limitNum);
        
        // Calculate pagination slice
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedRecipes = allRecipes.slice(startIndex, endIndex);
        
        console.log(`📊 Page ${pageNum}/${totalPages}: Showing ${paginatedRecipes.length} of ${total} total recipes`);
        
        res.json({
          recipes: paginatedRecipes,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: total,
            pages: totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        });
      } else {
        // Fallback for SQLite (native offset support)
        const offset = (pageNum - 1) * limitNum;
        const recipes = await this.db.all(
          'SELECT * FROM recipes ORDER BY dateModified DESC LIMIT ? OFFSET ?',
          [limitNum, offset]
        );
        
        const total = await this.db.get('SELECT COUNT(*) as count FROM recipes');
        const totalPages = Math.ceil(total.count / limitNum);
        
        res.json({
          recipes,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: total.count,
            pages: totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
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

  // Delete recipe image
  async deleteRecipeImage(req, res) {
    const recipeId = req.params.id;
    
    try {
      // Get the recipe first
      const recipe = await this.db.getRecipe(recipeId);
      
      if (!recipe) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Recipe not found'
        });
      }
      
      // Update recipe to remove image
      const result = await this.db.updateRecipe(recipeId, { strMealThumb: '' });
      
      if (!result.success) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to delete image'
        });
      }
      
      res.json({
        success: true,
        message: 'Recipe image deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting recipe image:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete recipe image'
      });
    }
  }

  // Generate new image for recipe
  async generateRecipeImage(req, res) {
    const recipeId = req.params.id;
    
    try {
      // Get the recipe first
      const recipe = await this.db.getRecipe(recipeId);
      
      if (!recipe) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Recipe not found'
        });
      }
      
      console.log(`🎨 Generating new image for recipe: ${recipe.strMeal}`);
      
      // Extract ingredients for accurate image generation
      const ingredients = this.extractIngredientNames(recipe);
      
      // Generate image using OpenAI (same as main generation)
      const imageData = await this.openaiManager.generateRecipeImage(
        recipe.strMeal,
        `professional food photography ${recipe.strCategory} dish from ${recipe.strArea}`,
        recipe.idMeal || recipe.id,
        ingredients
      );
      
      if (!imageData || !imageData.url) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to generate image'
        });
      }
      
      let finalImageUrl = imageData.url;
      
      // Upload to Firebase Storage if available
      if (this.storageManager.isAvailable()) {
        try {
          console.log(`☁️ Uploading to Firebase Storage...`);
          finalImageUrl = await this.storageManager.uploadImageFromUrl(
            imageData.url,
            recipe.strMeal,
            recipe.strCategory,
            recipe.idMeal || recipe.id
          );
          console.log(`✅ Uploaded to Firebase Storage: ${finalImageUrl}`);
        } catch (storageError) {
          console.error(`⚠️ Firebase upload failed, using original URL:`, storageError.message);
        }
      }
      
      // Update recipe with new image
      const result = await this.db.updateRecipe(recipeId, { strMealThumb: finalImageUrl });
      
      if (!result.success) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to update recipe with new image'
        });
      }
      
      console.log(`✅ Image generated successfully: ${finalImageUrl}`);
      
      res.json({
        success: true,
        imageUrl: finalImageUrl,
        message: 'Recipe image generated successfully'
      });
    } catch (error) {
      console.error('Error generating recipe image:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message || 'Failed to generate recipe image'
      });
    }
  }

  // Delete all recipes
  async deleteAllRecipes(req, res) {
    try {
      let deletedCount = 0;
      
      // Use Firebase method if available
      if (this.db.deleteAllRecipes) {
        const result = await this.db.deleteAllRecipes();
        deletedCount = result.deletedCount || 0;
        
        res.json({
          success: true,
          message: `Successfully deleted ${deletedCount} recipes`,
          deletedCount: deletedCount
        });
      } else if (this.db.getAllRecipes) {
        // Fallback: Get all recipes first, then delete them one by one
        const recipes = await this.db.getAllRecipes();
        
        for (const recipe of recipes) {
          try {
            if (this.db.deleteRecipe) {
              await this.db.deleteRecipe(recipe.idMeal);
              deletedCount++;
            }
          } catch (error) {
            console.error(`Failed to delete recipe ${recipe.idMeal}:`, error);
          }
        }
        
        res.json({
          success: true,
          message: `Successfully deleted ${deletedCount} recipes`,
          deletedCount: deletedCount
        });
      } else {
        // Last resort: Use RecipeManager for SQLite
        const result = await this.recipeManager.deleteAll();
        
        res.json({
          success: result.success,
          message: result.success ? `Successfully deleted all recipes` : 'Failed to delete recipes',
          deletedCount: result.deletedCount || 0
        });
      }
    } catch (error) {
      console.error('❌ Error deleting all recipes:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete all recipes',
        details: error.message
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