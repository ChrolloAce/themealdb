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
    
    // Image management endpoints
    v1Router.get('/meals/:id/images', ErrorHandler.asyncHandler(this.getMealImages.bind(this)));
    v1Router.post('/meals/:id/images', 
      rateLimitManager.requirePremium,
      rateLimitManager.getUploadLimiter(),
      ErrorHandler.asyncHandler(this.addMealImage.bind(this))
    );
    v1Router.delete('/meals/:id/images/:imageIndex', 
      rateLimitManager.requirePremium,
      ErrorHandler.asyncHandler(this.deleteMealImage.bind(this))
    );
    v1Router.put('/meals/:id/images/primary/:imageIndex', 
      rateLimitManager.requirePremium,
      ErrorHandler.asyncHandler(this.setPrimaryImage.bind(this))
    );
    
    // Ingredient endpoints
    v1Router.get('/ingredients', ErrorHandler.asyncHandler(this.getIngredients.bind(this)));
    v1Router.get('/ingredients/:name/image', ErrorHandler.asyncHandler(this.getIngredientImage.bind(this)));

    // Mount v1 routes
    this.router.use('/json/v1/:key', (req, res, next) => {
      req.query.key = req.params.key;
      next();
    }, v1Router);

    // Alternative route structure without key in path
    this.router.use('/v1', v1Router);

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
    // Multiple ingredient filtering is now free for all users
    // (Premium requirement removed)
      
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

  // Get all available ingredients
  async getIngredients(req, res) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const ingredientsDir = path.join(__dirname, '../../in/ingredients');
      const files = fs.readdirSync(ingredientsDir);
      
      const ingredients = files
        .filter(file => file.endsWith('.png'))
        .map(file => {
          const name = file.replace('.png', '');
          return {
            name: name,
            displayName: name.charAt(0).toUpperCase() + name.slice(1),
            imageUrl: `/api/json/v1/1/ingredients/${encodeURIComponent(name)}/image`
          };
        })
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

      res.json({
        ingredients: ingredients,
        count: ingredients.length
      });
    } catch (error) {
      console.error('Error getting ingredients:', error);
      res.status(500).json({ error: 'Failed to get ingredients list' });
    }
  }

  // Get ingredient image
  async getIngredientImage(req, res) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const ingredientName = req.params.name;
      const imagePath = path.join(__dirname, '../../in/ingredients', `${ingredientName}.png`);
      
      // Check if image exists
      if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ 
          error: 'Ingredient image not found',
          availableEndpoint: '/api/json/v1/1/ingredients'
        });
      }

      // Set appropriate headers
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      
      // Send the image file
      res.sendFile(imagePath);
    } catch (error) {
      console.error('Error serving ingredient image:', error);
      res.status(500).json({ error: 'Failed to serve ingredient image' });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = ApiRoutes;