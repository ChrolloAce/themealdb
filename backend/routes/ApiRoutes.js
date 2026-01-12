const express = require('express');
const { ErrorHandler } = require('../middleware/errorHandler');
const RecipeManager = require('../managers/RecipeManager');
const ImageManager = require('../managers/ImageManager');
const CategoryManager = require('../managers/CategoryManager');

class ApiRoutes {
  constructor(databaseManager) {
    this.router = express.Router();
    this.db = databaseManager;
    this.recipeManager = new RecipeManager(databaseManager);
    this.imageManager = new ImageManager();
    this.categoryManager = new CategoryManager(databaseManager);
    
    this.setupRoutes();
  }

  setupRoutes() {
    // 🆓 COMPLETELY FREE API - NO AUTHENTICATION REQUIRED ANYWHERE! 🆓
    console.log('🆓 Setting up COMPLETELY FREE API with no authentication requirements');
    
    const apiRouter = express.Router();
    
    // ===== CORE RECIPE ENDPOINTS (FREE) =====
    
    // Search and lookup endpoints
    apiRouter.get('/search.php', ErrorHandler.asyncHandler(this.searchMeals.bind(this)));
    apiRouter.get('/lookup.php', ErrorHandler.asyncHandler(this.lookupMeal.bind(this)));
    apiRouter.get('/random.php', ErrorHandler.asyncHandler(this.getRandomMeal.bind(this)));
    
    // Previously "premium" endpoints - NOW FREE!
    apiRouter.get('/randomselection.php', ErrorHandler.asyncHandler(this.getRandomSelection.bind(this)));
    apiRouter.get('/latest.php', ErrorHandler.asyncHandler(this.getLatestMeals.bind(this)));
    
    // Category and listing endpoints
    apiRouter.get('/categories.php', ErrorHandler.asyncHandler(this.getCategories.bind(this)));
    apiRouter.get('/list.php', ErrorHandler.asyncHandler(this.getListings.bind(this)));
    
    // Filter endpoints
    apiRouter.get('/filter.php', ErrorHandler.asyncHandler(this.filterMeals.bind(this)));
    
    // ===== CRUD ENDPOINTS (FREE) =====
    
    // Recipe management - NO authentication needed!
    apiRouter.post('/meals', 
      this.imageManager.getSingleUploadMiddleware('image'),
      ErrorHandler.asyncHandler(this.createMeal.bind(this))
    );
    apiRouter.put('/meals/:id', 
      this.imageManager.getSingleUploadMiddleware('image'),
      ErrorHandler.asyncHandler(this.updateMeal.bind(this))
    );
    apiRouter.delete('/meals/:id', ErrorHandler.asyncHandler(this.deleteMeal.bind(this)));
    
    // ===== IMAGE MANAGEMENT (FREE) =====
    
    // Image endpoints - NO authentication needed!
    apiRouter.get('/meals/:id/images', ErrorHandler.asyncHandler(this.getMealImages.bind(this)));
    apiRouter.post('/meals/:id/images', ErrorHandler.asyncHandler(this.addMealImage.bind(this)));
    apiRouter.delete('/meals/:id/images/:imageIndex', ErrorHandler.asyncHandler(this.deleteMealImage.bind(this)));
    apiRouter.put('/meals/:id/images/primary/:imageIndex', ErrorHandler.asyncHandler(this.setPrimaryImage.bind(this)));

    // ===== MOUNT ALL ROUTES AS FREE API =====
    
    // Mount on multiple paths for maximum compatibility
    this.router.use('/v1', apiRouter);                    // /api/v1/random.php
    this.router.use('/json/v1/1', apiRouter);            // /api/json/v1/1/random.php (backward compatibility)
    this.router.use('/json/v1/:any', apiRouter);         // /api/json/v1/{anything}/random.php

    // ===== SIMPLIFIED PUBLIC ROUTES (ALTERNATIVE FORMATS) =====
    
    const publicRouter = express.Router();
    
    // Simple REST-style endpoints for modern apps
    publicRouter.get('/random', ErrorHandler.asyncHandler(this.getRandomMeal.bind(this)));
    publicRouter.get('/search/:query', ErrorHandler.asyncHandler(async (req, res) => {
      req.query.s = req.params.query;
      return this.searchMeals(req, res);
    }));
    publicRouter.get('/lookup/:id', ErrorHandler.asyncHandler(async (req, res) => {
      req.query.i = req.params.id;
      return this.lookupMeal(req, res);
    }));
    publicRouter.get('/filter/category/:category', ErrorHandler.asyncHandler(async (req, res) => {
      req.query.c = req.params.category;
      return this.filterMeals(req, res);
    }));
    publicRouter.get('/filter/area/:area', ErrorHandler.asyncHandler(async (req, res) => {
      req.query.a = req.params.area;
      return this.filterMeals(req, res);
    }));
    publicRouter.get('/categories', ErrorHandler.asyncHandler(this.getCategories.bind(this)));
    publicRouter.get('/areas', ErrorHandler.asyncHandler(async (req, res) => {
      req.query.a = 'list';
      return this.getListings(req, res);
    }));
    
    // API status and info endpoint
    publicRouter.get('/info', ErrorHandler.asyncHandler(async (req, res) => {
      try {
        const allRecipes = this.db.getAllRecipes ? await this.db.getAllRecipes() : [];
        const count = allRecipes.length;
        const randomResult = await this.recipeManager.getTrulyRandom();
        
        res.json({
          status: '🆓 COMPLETELY FREE API - NO KEYS REQUIRED!',
          message: 'All endpoints are free to use without any authentication',
          database: {
            type: this.db.getAllRecipes ? 'Firebase' : 'SQLite',
            totalRecipes: count,
            randomWorking: randomResult && randomResult.meals && randomResult.meals.length > 0
          },
          endpoints: {
            classicFormat: [
              '/api/v1/random.php',
              '/api/v1/search.php?s={query}',
              '/api/v1/lookup.php?i={id}',
              '/api/v1/filter.php?c={category}',
              '/api/v1/categories.php',
              '/api/v1/list.php?c=list',
              '/api/v1/randomselection.php?count=5',
              '/api/v1/latest.php'
            ],
            modernFormat: [
              '/api/public/random',
              '/api/public/search/{query}',
              '/api/public/lookup/{id}',
              '/api/public/filter/category/{category}',
              '/api/public/filter/area/{area}',
              '/api/public/categories',
              '/api/public/areas'
            ],
            backwardCompatibility: [
              '/api/json/v1/1/random.php (works with any "key")',
              '/api/json/v1/anything/random.php (ignores key)'
            ]
          },
          note: 'Use ANY format above - all work without authentication!'
        });
      } catch (error) {
        res.status(500).json({
          status: 'API error',
          error: error.message
        });
      }
    }));
    
    // Mount public routes  
    this.router.use('/public', publicRouter);

    // Images endpoint for Firebase Storage access
    this.router.get('/images/:type/:id?', ErrorHandler.asyncHandler(this.getImage.bind(this)));
  }

  // Search meals by name or first letter
  async searchMeals(req, res) {
    const { s: searchTerm, f: firstLetter } = req.query;
    
    if (!searchTerm && !firstLetter) {
      throw ErrorHandler.createError('Please provide either search term (s) or first letter (f)', 400);
    }

    let result;
    if (searchTerm) {
      result = await this.recipeManager.searchByName(searchTerm);
    } else {
      if (firstLetter.length !== 1) {
        throw ErrorHandler.createError('First letter must be a single character', 400);
      }
      result = await this.recipeManager.searchByFirstLetter(firstLetter);
    }

    res.json(result);
  }

  // Lookup meal by ID
  async lookupMeal(req, res) {
    const { i: mealId } = req.query;
    
    if (!mealId) {
      throw ErrorHandler.createError('Meal ID (i) is required', 400);
    }

    const result = await this.recipeManager.getById(mealId);
    res.json(result);
  }

  // Get truly random meal from complete database
  async getRandomMeal(req, res) {
    console.log('\n🎲 ═══════════════════════════════════════════');
    console.log('📍 API ENDPOINT: GET /random.php');
    console.log('⏰ Timestamp:', new Date().toISOString());
    
    // Enhanced random selection with optional filters
    const { 
      c: category,
      a: area,
      m: mealType,
      d: dishType,
      diet: dietary
    } = req.query;
    
    let result;
    if (category || area || mealType || dishType || dietary) {
      console.log('🔍 Using FILTERED random selection');
      console.log('   Filters:', { category, area, mealType, dishType, dietary });
      
      // Random with filters
      result = await this.recipeManager.getRandomWithFilters({
        category,
        area,
        mealType,
        dishType,
        dietary
      });
    } else {
      console.log('🌐 Using TRULY RANDOM selection (no filters)');
      
      // Truly random from complete database
      result = await this.recipeManager.getTrulyRandom();
    }
    
    console.log('📤 Sending response to client');
    console.log('═══════════════════════════════════════════\n');
    
    // Prevent caching of random results (aggressive - for all layers)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store'); // For CDN/proxy
    res.setHeader('Vary', '*'); // Prevent shared cache
    res.setHeader('X-Vercel-No-Cache', '1'); // Vercel-specific
    
    res.json(result);
  }

  // Get random selection (premium)
  async getRandomSelection(req, res) {
    const count = Math.min(parseInt(req.query.count) || 10, 50); // Max 50
    const result = await this.recipeManager.getRandomSelection(count);
    res.json(result);
  }

  // Get latest meals (premium)
  async getLatestMeals(req, res) {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const result = await this.recipeManager.getLatest(limit);
    res.json(result);
  }

  // Get categories
  async getCategories(req, res) {
    const result = await this.categoryManager.getAllCategories();
    res.json(result);
  }

  // Get listings (categories, areas, ingredients, meal types, dish types, dietary options)
  async getListings(req, res) {
    const { 
      c: categories, 
      a: areas, 
      i: ingredients,
      m: mealTypes,
      d: dishTypes,
      diet: dietary
    } = req.query;
    
    if (categories === 'list') {
      const result = await this.categoryManager.listCategories();
      res.json(result);
    } else if (areas === 'list') {
      const result = await this.categoryManager.listAreas();
      res.json(result);
    } else if (ingredients === 'list') {
      const result = await this.categoryManager.listIngredients();
      res.json(result);
    } else if (mealTypes === 'list') {
      // NEW: List all meal types (breakfast, brunch, lunch, dinner, snack, dessert)
      const result = await this.categoryManager.listMealTypes();
      res.json(result);
    } else if (dishTypes === 'list') {
      // NEW: List all dish types (appetizer, main course, side dish, dessert, etc.)
      const result = await this.categoryManager.listDishTypes();
      res.json(result);
    } else if (dietary === 'list') {
      // NEW: List all dietary preferences (vegetarian, vegan, keto, paleo, etc.)
      const result = await this.categoryManager.listDietaryOptions();
      res.json(result);
    } else {
      throw ErrorHandler.createError('Please specify c=list, a=list, i=list, m=list, d=list, or diet=list', 400);
    }
  }

  // Filter meals with comprehensive search options
  async filterMeals(req, res) {
    const { 
      i: ingredient, 
      c: category, 
      a: area,
      m: mealType,
      d: dishType,
      diet: dietary,
      contains: containsIngredients
    } = req.query;
    
    // Check if at least one filter parameter is provided
    if (!ingredient && !category && !area && !mealType && !dishType && !dietary && !containsIngredients) {
      throw ErrorHandler.createError('Please provide at least one filter parameter: i (ingredient), c (category), a (area), m (meal type), d (dish type), diet (dietary), or contains (ingredients)', 400);
    }

    let result;
    
    // Handle multiple filters combined
    if ([ingredient, category, area, mealType, dishType, dietary, containsIngredients].filter(Boolean).length > 1) {
      // Multiple filters combined
      result = await this.recipeManager.filterByCombined({
        ingredient,
        category,
        area,
        mealType,
        dishType,
        dietary,
        containsIngredients
      });
    }
    // Single filter handlers
    else if (ingredient) {
      // Multiple ingredient filtering
      if (ingredient.includes(',')) {
        result = await this.recipeManager.filterByMultipleIngredients(ingredient);
      } else {
        result = await this.recipeManager.filterByIngredient(ingredient);
      }
    } else if (category) {
      result = await this.recipeManager.filterByCategory(category);
    } else if (area) {
      result = await this.recipeManager.filterByArea(area);
    } else if (mealType) {
      // NEW: Filter by meal type (breakfast, brunch, lunch, dinner, snack, dessert)
      result = await this.recipeManager.filterByMealType(mealType);
    } else if (dishType) {
      // NEW: Filter by dish type (appetizer, main course, side dish, dessert, etc.)
      result = await this.recipeManager.filterByDishType(dishType);
    } else if (dietary) {
      // NEW: Filter by dietary preferences (vegetarian, vegan, keto, paleo, etc.)
      result = await this.recipeManager.filterByDietary(dietary);
    } else if (containsIngredients) {
      // NEW: Filter recipes that contain specific ingredients
      result = await this.recipeManager.filterByContainsIngredients(containsIngredients);
    }

    res.json(result);
  }

  // Create new meal (premium)
  async createMeal(req, res) {
    const mealData = req.body;
    
    // Validate required fields
    if (!mealData.strMeal || !mealData.strCategory || !mealData.strArea || !mealData.strInstructions) {
      throw ErrorHandler.createError('Missing required fields: strMeal, strCategory, strArea, strInstructions', 400);
    }

    // Create meal
    const result = await this.recipeManager.create(mealData);
    
    // Process image if uploaded
    if (req.file) {
      try {
        const mealId = result.meals[0].idMeal;
        const processedImages = await this.imageManager.processMealImage(req.file.path, mealId);
        
        // Update meal with image URL
        await this.recipeManager.update(mealId, {
          strMealThumb: processedImages.original.url
        });
        
        result.meals[0].strMealThumb = processedImages.original.url;
      } catch (imageError) {
        console.warn('Image processing failed:', imageError.message);
      }
    }

    res.status(201).json(result);
  }

  // Update meal (premium)
  async updateMeal(req, res) {
    const mealId = req.params.id;
    const updateData = req.body;
    
    // Process image if uploaded
    if (req.file) {
      try {
        const processedImages = await this.imageManager.processMealImage(req.file.path, mealId);
        updateData.strMealThumb = processedImages.original.url;
      } catch (imageError) {
        console.warn('Image processing failed:', imageError.message);
      }
    }

    const result = await this.recipeManager.update(mealId, updateData);
    res.json(result);
  }

  // Delete meal (premium)
  async deleteMeal(req, res) {
    const mealId = req.params.id;
    
    // Delete images
    try {
      await this.imageManager.deleteMealImages(mealId);
    } catch (error) {
      console.warn('Failed to delete meal images:', error.message);
    }
    
    const result = await this.recipeManager.delete(mealId);
    
    if (!result.success) {
      throw ErrorHandler.createError('Meal not found', 404);
    }
    
    res.json({ message: 'Meal deleted successfully' });
  }

  // Get image from Firebase Storage or redirect to Firebase URL
  async getImage(req, res) {
    const { type, id } = req.params;
    const { size = 'medium' } = req.query;
    
    try {
      // For now, construct the Firebase Storage URL pattern
      // This assumes your images are organized in Firebase Storage
      const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/fooddb-d274c.appspot.com/o/';
      
      let imagePath;
      switch (type) {
        case 'meals':
          imagePath = id ? `meals%2F${id}%2F` : 'generated%2Fai-generated%2F';
          break;
        case 'categories':
          imagePath = 'categories%2F';
          break;
        case 'ingredients':
          imagePath = 'ingredients%2F';
          break;
        default:
          imagePath = 'generated%2Fgeneral%2F';
      }
      
      // For now, return a JSON response with Firebase Storage info
      // You can enhance this to actually list and return specific images
      res.json({
        message: 'Firebase Storage image access',
        type: type,
        id: id,
        size: size,
        firebaseStorageUrl: `${baseUrl}${imagePath}`,
        note: 'Images are stored in Firebase Storage at gs://fooddb-d274c.firebasestorage.app',
        examples: {
          meals: '/api/images/meals/12345',
          categories: '/api/images/categories',
          ingredients: '/api/images/ingredients'
        }
      });
    } catch (error) {
      console.error('Error accessing image:', error);
      res.status(404).json({ error: 'Image not found' });
    }
  }

  // Get all images for a specific meal
  async getMealImages(req, res) {
    const { id } = req.params;
    
    try {
      const meal = await this.recipeManager.getById(id);
      
      if (!meal || !meal.meals || meal.meals.length === 0) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      const recipe = meal.meals[0];
      
      res.json({
        success: true,
        recipeId: id,
        recipeName: recipe.strMeal,
        imageCount: recipe.imageCount || 0,
        primaryImage: recipe.strMealThumb,
        images: recipe.images || [],
        imageUrls: recipe.imageUrls || [recipe.strMealThumb].filter(Boolean),
        additionalImages: recipe.additionalImages || [],
        imageGallery: recipe.imageGallery || []
      });
    } catch (error) {
      console.error('Error getting meal images:', error);
      res.status(500).json({ error: 'Failed to retrieve meal images' });
    }
  }
  
  // Add a new image to a meal
  async addMealImage(req, res) {
    const { id } = req.params;
    const { imageUrl, alt, isPrimary = false, metadata = {} } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    
    try {
      const meal = await this.recipeManager.getById(id);
      
      if (!meal || !meal.meals || meal.meals.length === 0) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      const Recipe = require('../models/Recipe');
      const recipe = new Recipe(meal.meals[0]);
      
      // Add the new image
      const imageIndex = recipe.addImage(imageUrl, {
        alt: alt || `${recipe.strMeal} image ${recipe.images.length + 1}`,
        isPrimary: isPrimary,
        metadata: metadata
      });
      
      // Update the recipe in database
      await this.recipeManager.update(id, {
        images: recipe.images,
        imageCount: recipe.imageCount,
        strMealThumb: recipe.strMealThumb,
        additionalImages: recipe.getImageUrls(),
        imageUrls: recipe.getImageUrls()
      });
      
      res.json({
        success: true,
        message: 'Image added successfully',
        imageIndex: imageIndex,
        imageCount: recipe.imageCount,
        images: recipe.images
      });
    } catch (error) {
      console.error('Error adding meal image:', error);
      res.status(500).json({ error: 'Failed to add image to meal' });
    }
  }
  
  // Delete an image from a meal
  async deleteMealImage(req, res) {
    const { id, imageIndex } = req.params;
    const index = parseInt(imageIndex);
    
    if (isNaN(index)) {
      return res.status(400).json({ error: 'Invalid image index' });
    }
    
    try {
      const meal = await this.recipeManager.getById(id);
      
      if (!meal || !meal.meals || meal.meals.length === 0) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      const Recipe = require('../models/Recipe');
      const recipe = new Recipe(meal.meals[0]);
      
      // Remove the image
      const removedImage = recipe.removeImage(index);
      
      if (!removedImage) {
        return res.status(404).json({ error: 'Image not found at specified index' });
      }
      
      // Update the recipe in database
      await this.recipeManager.update(id, {
        images: recipe.images,
        imageCount: recipe.imageCount,
        strMealThumb: recipe.strMealThumb,
        additionalImages: recipe.getImageUrls(),
        imageUrls: recipe.getImageUrls()
      });
      
      res.json({
        success: true,
        message: 'Image deleted successfully',
        removedImage: removedImage,
        imageCount: recipe.imageCount,
        images: recipe.images
      });
    } catch (error) {
      console.error('Error deleting meal image:', error);
      res.status(500).json({ error: 'Failed to delete image from meal' });
    }
  }
  
  // Set primary image for a meal
  async setPrimaryImage(req, res) {
    const { id, imageIndex } = req.params;
    const index = parseInt(imageIndex);
    
    if (isNaN(index)) {
      return res.status(400).json({ error: 'Invalid image index' });
    }
    
    try {
      const meal = await this.recipeManager.getById(id);
      
      if (!meal || !meal.meals || meal.meals.length === 0) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      const Recipe = require('../models/Recipe');
      const recipe = new Recipe(meal.meals[0]);
      
      // Set primary image
      const success = recipe.setPrimaryImage(index);
      
      if (!success) {
        return res.status(404).json({ error: 'Image not found at specified index' });
      }
      
      // Update the recipe in database
      await this.recipeManager.update(id, {
        images: recipe.images,
        strMealThumb: recipe.strMealThumb,
        additionalImages: recipe.getImageUrls(),
        imageUrls: recipe.getImageUrls()
      });
      
      res.json({
        success: true,
        message: 'Primary image updated successfully',
        primaryImage: recipe.getPrimaryImage(),
        images: recipe.images
      });
    } catch (error) {
      console.error('Error setting primary image:', error);
      res.status(500).json({ error: 'Failed to set primary image' });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = ApiRoutes;