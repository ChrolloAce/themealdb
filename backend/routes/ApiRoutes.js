const express = require('express');
const { ErrorHandler } = require('../middleware/errorHandler');
const { rateLimitManager } = require('../middleware/rateLimitMiddleware');
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
    // V1 API Routes
    const v1Router = express.Router();
    
    // Apply API key validation to v1 routes only
    v1Router.use(rateLimitManager.validateApiKey);
    
    // Search and lookup endpoints
    v1Router.get('/search.php', ErrorHandler.asyncHandler(this.searchMeals.bind(this)));
    v1Router.get('/lookup.php', ErrorHandler.asyncHandler(this.lookupMeal.bind(this)));
    v1Router.get('/random.php', ErrorHandler.asyncHandler(this.getRandomMeal.bind(this)));
    
    // Premium endpoints
    v1Router.get('/randomselection.php', 
      rateLimitManager.requirePremium,
      rateLimitManager.getPremiumLimiter(),
      ErrorHandler.asyncHandler(this.getRandomSelection.bind(this))
    );
    v1Router.get('/latest.php', 
      rateLimitManager.requirePremium,
      rateLimitManager.getPremiumLimiter(),
      ErrorHandler.asyncHandler(this.getLatestMeals.bind(this))
    );
    
    // Category and listing endpoints
    v1Router.get('/categories.php', ErrorHandler.asyncHandler(this.getCategories.bind(this)));
    v1Router.get('/list.php', ErrorHandler.asyncHandler(this.getListings.bind(this)));
    
    // Filter endpoints
    v1Router.get('/filter.php', ErrorHandler.asyncHandler(this.filterMeals.bind(this)));
    
    // CRUD endpoints for adding recipes (premium)
    v1Router.post('/meals', 
      rateLimitManager.requirePremium,
      rateLimitManager.getUploadLimiter(),
      this.imageManager.getSingleUploadMiddleware('image'),
      ErrorHandler.asyncHandler(this.createMeal.bind(this))
    );
    v1Router.put('/meals/:id', 
      rateLimitManager.requirePremium,
      this.imageManager.getSingleUploadMiddleware('image'),
      ErrorHandler.asyncHandler(this.updateMeal.bind(this))
    );
    v1Router.delete('/meals/:id', 
      rateLimitManager.requirePremium,
      ErrorHandler.asyncHandler(this.deleteMeal.bind(this))
    );

    // Mount v1 routes
    this.router.use('/json/v1/:key', (req, res, next) => {
      req.query.key = req.params.key;
      next();
    }, v1Router);

    // Alternative route structure without key in path
    this.router.use('/v1', v1Router);
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

  // Get random meal
  async getRandomMeal(req, res) {
    const result = await this.recipeManager.getRandom();
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

  // Get listings (categories, areas, ingredients)
  async getListings(req, res) {
    const { c: categories, a: areas, i: ingredients } = req.query;
    
    if (categories === 'list') {
      const result = await this.categoryManager.listCategories();
      res.json(result);
    } else if (areas === 'list') {
      const result = await this.categoryManager.listAreas();
      res.json(result);
    } else if (ingredients === 'list') {
      const result = await this.categoryManager.listIngredients();
      res.json(result);
    } else {
      throw ErrorHandler.createError('Please specify c=list, a=list, or i=list', 400);
    }
  }

  // Filter meals
  async filterMeals(req, res) {
    const { i: ingredient, c: category, a: area } = req.query;
    
    if (!ingredient && !category && !area) {
      throw ErrorHandler.createError('Please provide filter parameter: i (ingredient), c (category), or a (area)', 400);
    }

    let result;
    if (ingredient) {
      // Check if premium for multiple ingredients
      if (ingredient.includes(',') && req.apiKeyType !== 'premium') {
        throw ErrorHandler.createError('Multiple ingredient filtering requires premium API key', 403);
      }
      
      if (ingredient.includes(',')) {
        result = await this.recipeManager.filterByMultipleIngredients(ingredient);
      } else {
        result = await this.recipeManager.filterByIngredient(ingredient);
      }
    } else if (category) {
      result = await this.recipeManager.filterByCategory(category);
    } else if (area) {
      result = await this.recipeManager.filterByArea(area);
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

  getRouter() {
    return this.router;
  }
}

module.exports = ApiRoutes;