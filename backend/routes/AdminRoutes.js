const express = require('express');
const { ErrorHandler } = require('../middleware/errorHandler');
const { requireAdmin, requirePermission, login, logout, refreshToken, getCurrentAdmin } = require('../middleware/adminAuth');
const OpenAIManager = require('../managers/OpenAIManager');
const RecipeManager = require('../managers/RecipeManager');
const ImageManager = require('../managers/ImageManager');
const AdminManager = require('../managers/AdminManager');

class AdminRoutes {
  constructor(databaseManager) {
    this.router = express.Router();
    this.db = databaseManager;
    this.openaiManager = new OpenAIManager();
    this.recipeManager = new RecipeManager(databaseManager);
    this.imageManager = new ImageManager();
    this.adminManager = new AdminManager();
    
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
    
    this.router.post('/recipes/batch-generate', 
      requirePermission('ai_generate'),
      ErrorHandler.asyncHandler(this.batchGenerateRecipes.bind(this))
    );
    
    // Admin recipe management
    this.router.get('/recipes', ErrorHandler.asyncHandler(this.getAllRecipes.bind(this)));
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
    
    const recipe = await this.openaiManager.generateRecipe(params);
    
    res.json({
      success: true,
      recipe,
      message: 'Recipe generated successfully'
    });
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

  // Generate recipe image
  async generateRecipeImage(req, res) {
    const { recipeName, description, mealId } = req.body;
    
    if (!recipeName) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Recipe name is required'
      });
    }
    
    try {
      console.log(`🎨 Starting AI image generation for: ${recipeName}`);
      
      const imageData = await this.openaiManager.generateRecipeImage(recipeName, description, mealId);
      
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

  // Create recipe with AI and save to database
  async createRecipeWithAI(req, res) {
    const aiParams = req.body;
    
    try {
      // Generate recipe with AI
      const generatedRecipe = await this.openaiManager.generateRecipe(aiParams);
      
      // Save to database
      const savedRecipe = await this.recipeManager.create(generatedRecipe);
      
      // Generate image if requested
      let imageUrl = null;
      if (req.body.generateImage) {
        try {
          console.log('🎨 Generating AI image for new recipe...');
          
          const imageData = await this.openaiManager.generateRecipeImage(
            generatedRecipe.strMeal,
            `${generatedRecipe.strCategory} dish from ${generatedRecipe.strArea}`,
            savedRecipe.meals[0].idMeal
          );
          
          // Use the local URL that we saved
          imageUrl = imageData.url;
          
          // Update recipe with local image URL
          await this.recipeManager.update(savedRecipe.meals[0].idMeal, {
            strMealThumb: imageUrl
          });
          
          console.log('✅ AI image generated and saved!');
        } catch (imageError) {
          console.error('❌ Image generation failed:', imageError.message);
        }
      }
      
      res.json({
        success: true,
        recipe: savedRecipe.meals[0],
        imageGenerated: !!imageUrl,
        imageUrl,
        imageQuality: imageUrl ? 'ultra-hd' : null,
        message: 'Recipe created successfully with ULTRA-HIGH QUALITY AI image'
      });
    } catch (error) {
      throw new Error(`Failed to create recipe with AI: ${error.message}`);
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
            
            const imageData = await this.openaiManager.generateRecipeImage(
              generatedRecipe.strMeal,
              `${generatedRecipe.strCategory} dish from ${generatedRecipe.strArea}`,
              savedRecipe.meals[0].idMeal
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

  // Delete recipe
  async deleteRecipe(req, res) {
    const recipeId = req.params.id;
    
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

  getRouter() {
    return this.router;
  }
}

module.exports = AdminRoutes;