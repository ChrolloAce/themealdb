const Recipe = require('../models/Recipe');

class RecipeManager {
  constructor(databaseManager) {
    this.db = databaseManager;
  }

  // Search recipes by name
  async searchByName(name, limit = 100) {
    try {
      // Check if we're using Firebase
      if (this.db.searchRecipes) {
        const recipes = await this.db.searchRecipes(name);
        return { meals: recipes.map(row => new Recipe(row).toApiFormat()) };
      }
      
      // Fallback to SQL for SQLite
      const query = `
        SELECT * FROM recipes 
        WHERE strMeal LIKE ? 
        ORDER BY strMeal 
        LIMIT ?
      `;
      const rows = await this.db.all(query, [`%${name}%`, limit]);
      return { meals: rows.map(row => new Recipe(row).toApiFormat()) };
    } catch (error) {
      throw new Error(`Search by name failed: ${error.message}`);
    }
  }

  // Search recipes by first letter
  async searchByFirstLetter(letter, limit = 100) {
    try {
      const query = `
        SELECT * FROM recipes 
        WHERE strMeal LIKE ? 
        ORDER BY strMeal 
        LIMIT ?
      `;
      const rows = await this.db.all(query, [`${letter}%`, limit]);
      return { meals: rows.map(row => new Recipe(row).toApiFormat()) };
    } catch (error) {
      throw new Error(`Search by letter failed: ${error.message}`);
    }
  }

  // Get recipe by ID
  async getById(id) {
    try {
      // Check if we're using Firebase
      if (this.db.getRecipeByIdMeal) {
        const recipe = await this.db.getRecipeByIdMeal(id);
        if (!recipe) {
          return { meals: null };
        }
        return { meals: [new Recipe(recipe).toApiFormat()] };
      }
      
      // Fallback to SQL for SQLite
      const query = 'SELECT * FROM recipes WHERE idMeal = ?';
      const row = await this.db.get(query, [id]);
      
      if (!row) {
        return { meals: null };
      }
      
      return { meals: [new Recipe(row).toApiFormat()] };
    } catch (error) {
      throw new Error(`Get by ID failed: ${error.message}`);
    }
  }

  // Get random recipe
  async getRandom() {
    try {
      console.log('🎲 getRandom() called');
      
      // Check if we're using Firebase
      if (this.db.getAllRecipes) {
        console.log('📊 Using Firebase/getAllRecipes method');
        
        // Get a larger sample for better randomness
        const recipes = await this.db.getAllRecipes(200);
        console.log(`📦 Retrieved ${recipes ? recipes.length : 0} recipes from database`);
        
        if (!recipes || recipes.length === 0) {
          console.log('⚠️ No recipes found in database!');
          return { meals: null };
        }
        
        // Log all available recipes
        console.log('📋 Available recipes in pool:');
        recipes.forEach((recipe, idx) => {
          console.log(`   ${idx + 1}. ${recipe.strMeal} (${recipe.strCategory} - ${recipe.strArea})`);
        });
        
        // Simple and truly random selection
        const randomIndex = Math.floor(Math.random() * recipes.length);
        const randomRecipe = recipes[randomIndex];
        
        console.log(`✅ SELECTED: Recipe #${randomIndex + 1} of ${recipes.length}: "${randomRecipe.strMeal}"`);
        console.log(`   Category: ${randomRecipe.strCategory}, Area: ${randomRecipe.strArea}`);
        
        return { meals: [new Recipe(randomRecipe).toApiFormat()] };
      }
      
      console.log('📊 Using SQLite with ORDER BY RANDOM()');
      
      // Fallback to SQL for SQLite
      const query = 'SELECT * FROM recipes ORDER BY RANDOM() LIMIT 1';
      const row = await this.db.get(query);
      
      if (!row) {
        console.log('⚠️ No recipes found in database!');
        return { meals: null };
      }
      
      console.log(`✅ SELECTED from SQLite: "${row.strMeal}"`);
      return { meals: [new Recipe(row).toApiFormat()] };
    } catch (error) {
      console.error('❌ getRandom() error:', error);
      throw new Error(`Get random recipe failed: ${error.message}`);
    }
  }

  // Get multiple random recipes (premium feature)
  async getRandomSelection(count = 10) {
    try {
      // Check if we're using Firebase
      if (this.db.getAllRecipes) {
        const recipes = await this.db.getAllRecipes();
        if (!recipes || recipes.length === 0) {
          return { meals: [] };
        }
        
        // Fisher-Yates shuffle for proper randomization
        const shuffled = [...recipes];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        const selected = shuffled.slice(0, Math.min(count, recipes.length));
        return { meals: selected.map(recipe => new Recipe(recipe).toApiFormat()) };
      }
      
      // Fallback to SQL for SQLite
      const query = 'SELECT * FROM recipes ORDER BY RANDOM() LIMIT ?';
      const rows = await this.db.all(query, [count]);
      return { meals: rows.map(row => new Recipe(row).toApiFormat()) };
    } catch (error) {
      throw new Error(`Get random selection failed: ${error.message}`);
    }
  }

  // Filter by main ingredient
  async filterByIngredient(ingredient, limit = 100) {
    try {
      // Check if we're using Firebase
      if (this.db.getRecipesByIngredient) {
        const recipes = await this.db.getRecipesByIngredient(ingredient);
        const limitedRecipes = recipes.slice(0, limit);
        return { 
          meals: limitedRecipes.map(recipe => ({
            idMeal: recipe.idMeal,
            strMeal: recipe.strMeal,
            strMealThumb: recipe.strMealThumb
          }))
        };
      }
      
      // Fallback to SQL for SQLite
      const conditions = [];
      const params = [];
      
      // Search in all ingredient columns
      for (let i = 1; i <= 20; i++) {
        conditions.push(`strIngredient${i} LIKE ?`);
        params.push(`%${ingredient}%`);
      }
      
      params.push(limit);
      
      const query = `
        SELECT idMeal, strMeal, strMealThumb 
        FROM recipes 
        WHERE ${conditions.join(' OR ')} 
        ORDER BY strMeal 
        LIMIT ?
      `;
      
      const rows = await this.db.all(query, params);
      return { meals: rows };
    } catch (error) {
      throw new Error(`Filter by ingredient failed: ${error.message}`);
    }
  }

  // Filter by multiple ingredients (premium feature)
  async filterByMultipleIngredients(ingredients, limit = 100) {
    try {
      const ingredientList = ingredients.split(',').map(ing => ing.trim());
      const conditions = [];
      const params = [];
      
      for (const ingredient of ingredientList) {
        const ingredientConditions = [];
        for (let i = 1; i <= 20; i++) {
          ingredientConditions.push(`strIngredient${i} LIKE ?`);
          params.push(`%${ingredient}%`);
        }
        conditions.push(`(${ingredientConditions.join(' OR ')})`);
      }
      
      params.push(limit);
      
      const query = `
        SELECT idMeal, strMeal, strMealThumb 
        FROM recipes 
        WHERE ${conditions.join(' AND ')} 
        ORDER BY strMeal 
        LIMIT ?
      `;
      
      const rows = await this.db.all(query, params);
      return { meals: rows };
    } catch (error) {
      throw new Error(`Filter by multiple ingredients failed: ${error.message}`);
    }
  }

  // Filter by category
  async filterByCategory(category, limit = 100) {
    try {
      // Check if we're using Firebase
      if (this.db.getRecipesByCategory) {
        const recipes = await this.db.getRecipesByCategory(category);
        const limitedRecipes = recipes.slice(0, limit);
        return { 
          meals: limitedRecipes.map(recipe => ({
            idMeal: recipe.idMeal,
            strMeal: recipe.strMeal,
            strMealThumb: recipe.strMealThumb
          }))
        };
      }
      
      // Fallback to SQL for SQLite
      const query = `
        SELECT idMeal, strMeal, strMealThumb 
        FROM recipes 
        WHERE strCategory = ? 
        ORDER BY strMeal 
        LIMIT ?
      `;
      const rows = await this.db.all(query, [category, limit]);
      return { meals: rows };
    } catch (error) {
      throw new Error(`Filter by category failed: ${error.message}`);
    }
  }

  // Filter by area
  async filterByArea(area, limit = 100) {
    try {
      // Check if we're using Firebase
      if (this.db.getRecipesByArea) {
        const recipes = await this.db.getRecipesByArea(area);
        const limitedRecipes = recipes.slice(0, limit);
        return { 
          meals: limitedRecipes.map(recipe => ({
            idMeal: recipe.idMeal,
            strMeal: recipe.strMeal,
            strMealThumb: recipe.strMealThumb
          }))
        };
      }
      
      // Fallback to SQL for SQLite
      const query = `
        SELECT idMeal, strMeal, strMealThumb 
        FROM recipes 
        WHERE strArea = ? 
        ORDER BY strMeal 
        LIMIT ?
      `;
      const rows = await this.db.all(query, [area, limit]);
      return { meals: rows };
    } catch (error) {
      throw new Error(`Filter by area failed: ${error.message}`);
    }
  }

  // Get latest meals (premium feature)
  async getLatest(limit = 20) {
    try {
      // Check if we're using Firebase
      if (this.db.getAllRecipes) {
        const recipes = await this.db.getAllRecipes(limit);
        return { meals: recipes.map(recipe => new Recipe(recipe).toApiFormat()) };
      }
      
      // Fallback to SQL for SQLite
      const query = `
        SELECT * FROM recipes 
        ORDER BY dateModified DESC, idMeal DESC 
        LIMIT ?
      `;
      const rows = await this.db.all(query, [limit]);
      return { meals: rows.map(row => new Recipe(row).toApiFormat()) };
    } catch (error) {
      throw new Error(`Get latest meals failed: ${error.message}`);
    }
  }

  // Create new recipe
  async create(recipeData) {
    try {
      console.log('🔍 RecipeManager.create - Raw recipe data:', JSON.stringify(recipeData, null, 2));
      
      const recipe = new Recipe(recipeData);
      
      console.log('🔍 Recipe object created, ingredients found:', recipe.ingredients.length);
      console.log('🔍 Recipe ingredients:', recipe.ingredients);
      
      if (!recipe.isValid()) {
        console.log('❌ Recipe validation failed in RecipeManager');
        throw new Error('Invalid recipe data');
      }
      
      // Check if we're using Firebase
      if (this.db.addRecipe) {
        const dbData = recipe.toDbFormat();
        const result = await this.db.addRecipe(dbData);
        return { meals: [new Recipe(result).toApiFormat()] };
      }
      
      // Fallback to SQL for SQLite
      const dbData = recipe.toDbFormat();
      const columns = Object.keys(dbData).filter(key => key !== 'idMeal');
      const placeholders = columns.map(() => '?').join(',');
      const values = columns.map(col => dbData[col]);
      
      const query = `
        INSERT INTO recipes (${columns.join(',')}) 
        VALUES (${placeholders})
      `;
      
      const result = await this.db.run(query, values);
      return await this.getById(result.lastID);
    } catch (error) {
      throw new Error(`Create recipe failed: ${error.message}`);
    }
  }

  // Update recipe
  async update(id, recipeData) {
    try {
      const existingRecipe = await this.getById(id);
      if (!existingRecipe.meals) {
        throw new Error('Recipe not found');
      }
      
      // Check if we're using Firebase
      if (this.db.updateRecipe) {
        console.log('🔥 Updating recipe in Firebase...');
        
        // For Firebase, we need to find the document by idMeal and update it
        const allRecipes = await this.db.getAllRecipes(1000); // Get more recipes to find the right one
        const targetRecipe = allRecipes.find(recipe => recipe.idMeal === id || recipe.idMeal === id.toString());
        
        if (!targetRecipe) {
          throw new Error('Recipe not found in Firebase');
        }
        
        // Update the recipe data
        const updatedData = { ...targetRecipe, ...recipeData };
        await this.db.updateRecipe(targetRecipe.id, updatedData); // Use Firebase document ID
        
        console.log('✅ Recipe updated in Firebase');
        return await this.getById(id);
      }
      
      // Fallback to SQL for SQLite
      const recipe = new Recipe({ ...existingRecipe.meals[0], ...recipeData });
      const dbData = recipe.toDbFormat();
      
      const columns = Object.keys(dbData).filter(key => key !== 'idMeal');
      const setClause = columns.map(col => `${col} = ?`).join(',');
      const values = [...columns.map(col => dbData[col]), id];
      
      const query = `UPDATE recipes SET ${setClause} WHERE idMeal = ?`;
      await this.db.run(query, values);
      
      return await this.getById(id);
    } catch (error) {
      throw new Error(`Update recipe failed: ${error.message}`);
    }
  }

  // Delete recipe
  async delete(id) {
    try {
      const result = await this.db.run('DELETE FROM recipes WHERE idMeal = ?', [id]);
      return { success: result.changes > 0 };
    } catch (error) {
      throw new Error(`Delete recipe failed: ${error.message}`);
    }
  }

  // =======================
  // NEW COMPREHENSIVE SEARCH METHODS
  // =======================

  // Filter by meal type (breakfast, brunch, lunch, dinner, snack, dessert)
  async filterByMealType(mealType, limit = 100) {
    try {
      // Check if we're using Firebase
      if (this.db.getAllRecipes) {
        const recipes = await this.db.getAllRecipes();
        const filtered = recipes.filter(recipe => {
          const mealTypes = recipe.mealType || [];
          return mealTypes.some(type => type.toLowerCase() === mealType.toLowerCase());
        }).slice(0, limit);
        
        return { 
          meals: filtered.map(recipe => ({
            idMeal: recipe.idMeal,
            strMeal: recipe.strMeal,
            strMealThumb: recipe.strMealThumb
          }))
        };
      }
      
      // Fallback for SQL (if mealType column exists)
      const query = `
        SELECT idMeal, strMeal, strMealThumb 
        FROM recipes 
        WHERE mealType LIKE ? 
        ORDER BY strMeal 
        LIMIT ?
      `;
      const rows = await this.db.all(query, [`%${mealType}%`, limit]);
      return { meals: rows };
    } catch (error) {
      throw new Error(`Filter by meal type failed: ${error.message}`);
    }
  }

  // Filter by dish type (appetizer, main course, side dish, dessert, etc.)
  async filterByDishType(dishType, limit = 100) {
    try {
      // Check if we're using Firebase
      if (this.db.getAllRecipes) {
        const recipes = await this.db.getAllRecipes();
        const filtered = recipes.filter(recipe => {
          const recipesDishType = recipe.dishType || '';
          return recipesDishType.toLowerCase().includes(dishType.toLowerCase());
        }).slice(0, limit);
        
        return { 
          meals: filtered.map(recipe => ({
            idMeal: recipe.idMeal,
            strMeal: recipe.strMeal,
            strMealThumb: recipe.strMealThumb
          }))
        };
      }
      
      // Fallback for SQL
      const query = `
        SELECT idMeal, strMeal, strMealThumb 
        FROM recipes 
        WHERE dishType LIKE ? 
        ORDER BY strMeal 
        LIMIT ?
      `;
      const rows = await this.db.all(query, [`%${dishType}%`, limit]);
      return { meals: rows };
    } catch (error) {
      throw new Error(`Filter by dish type failed: ${error.message}`);
    }
  }

  // Filter by dietary preferences (vegetarian, vegan, keto, paleo, etc.)
  async filterByDietary(dietary, limit = 100) {
    try {
      // Check if we're using Firebase
      if (this.db.getAllRecipes) {
        const recipes = await this.db.getAllRecipes();
        const filtered = recipes.filter(recipe => {
          const dietaryInfo = recipe.dietary || {};
          // Handle different dietary filter formats
          switch(dietary.toLowerCase()) {
            case 'vegetarian':
              return dietaryInfo.vegetarian === true;
            case 'vegan':
              return dietaryInfo.vegan === true;
            case 'pescatarian':
              return dietaryInfo.pescatarian === true;
            case 'gluten-free':
            case 'glutenfree':
              return dietaryInfo.glutenFree === true;
            case 'dairy-free':
            case 'dairyfree':
              return dietaryInfo.dairyFree === true;
            case 'keto':
              return dietaryInfo.keto === true;
            case 'paleo':
              return dietaryInfo.paleo === true;
            case 'halal':
              return dietaryInfo.halal === true;
            case 'no-red-meat':
            case 'noredmeat':
              return dietaryInfo.noRedMeat === true;
            case 'no-pork':
            case 'nopork':
              return dietaryInfo.noPork === true;
            case 'no-shellfish':
            case 'noshellfish':
              return dietaryInfo.noShellfish === true;
            case 'omnivore':
              return dietaryInfo.omnivore === true;
            default:
              return false;
          }
        }).slice(0, limit);
        
        return { 
          meals: filtered.map(recipe => ({
            idMeal: recipe.idMeal,
            strMeal: recipe.strMeal,
            strMealThumb: recipe.strMealThumb
          }))
        };
      }
      
      // Fallback for SQL (would need dietary columns)
      throw new Error('Dietary filtering requires Firebase database');
    } catch (error) {
      throw new Error(`Filter by dietary failed: ${error.message}`);
    }
  }

  // Filter by ingredients that the recipe contains
  async filterByContainsIngredients(ingredientList, limit = 100) {
    try {
      const ingredients = ingredientList.split(',').map(ing => ing.trim().toLowerCase());
      
      // Check if we're using Firebase
      if (this.db.getAllRecipes) {
        const recipes = await this.db.getAllRecipes();
        const filtered = recipes.filter(recipe => {
          // Check all ingredient fields
          for (let i = 1; i <= 20; i++) {
            const ingredient = recipe[`strIngredient${i}`];
            if (ingredient) {
              const hasMatchingIngredient = ingredients.some(searchIng => 
                ingredient.toLowerCase().includes(searchIng)
              );
              if (hasMatchingIngredient) return true;
            }
          }
          return false;
        }).slice(0, limit);
        
        return { 
          meals: filtered.map(recipe => ({
            idMeal: recipe.idMeal,
            strMeal: recipe.strMeal,
            strMealThumb: recipe.strMealThumb
          }))
        };
      }
      
      // Fallback to existing method
      return this.filterByMultipleIngredients(ingredientList, limit);
    } catch (error) {
      throw new Error(`Filter by contains ingredients failed: ${error.message}`);
    }
  }

  // Combined filtering (multiple filters at once)
  async filterByCombined(filters, limit = 100) {
    try {
      // Check if we're using Firebase
      if (this.db.getAllRecipes) {
        const recipes = await this.db.getAllRecipes();
        
        let filtered = recipes;
        
        // Apply each filter sequentially
        if (filters.category) {
          filtered = filtered.filter(recipe => 
            recipe.strCategory?.toLowerCase() === filters.category.toLowerCase()
          );
        }
        
        if (filters.area) {
          filtered = filtered.filter(recipe => 
            recipe.strArea?.toLowerCase() === filters.area.toLowerCase()
          );
        }
        
        if (filters.mealType) {
          filtered = filtered.filter(recipe => {
            const mealTypes = recipe.mealType || [];
            return mealTypes.some(type => type.toLowerCase() === filters.mealType.toLowerCase());
          });
        }
        
        if (filters.dishType) {
          filtered = filtered.filter(recipe => 
            recipe.dishType?.toLowerCase().includes(filters.dishType.toLowerCase())
          );
        }
        
        if (filters.dietary) {
          filtered = filtered.filter(recipe => {
            const dietaryInfo = recipe.dietary || {};
            switch(filters.dietary.toLowerCase()) {
              case 'vegetarian':
                return dietaryInfo.vegetarian === true;
              case 'vegan':
                return dietaryInfo.vegan === true;
              case 'keto':
                return dietaryInfo.keto === true;
              case 'paleo':
                return dietaryInfo.paleo === true;
              default:
                return false;
            }
          });
        }
        
        if (filters.ingredient) {
          filtered = filtered.filter(recipe => {
            for (let i = 1; i <= 20; i++) {
              const ingredient = recipe[`strIngredient${i}`];
              if (ingredient?.toLowerCase().includes(filters.ingredient.toLowerCase())) {
                return true;
              }
            }
            return false;
          });
        }
        
        if (filters.containsIngredients) {
          const ingredients = filters.containsIngredients.split(',').map(ing => ing.trim().toLowerCase());
          filtered = filtered.filter(recipe => {
            for (let i = 1; i <= 20; i++) {
              const ingredient = recipe[`strIngredient${i}`];
              if (ingredient) {
                const hasMatchingIngredient = ingredients.some(searchIng => 
                  ingredient.toLowerCase().includes(searchIng)
                );
                if (hasMatchingIngredient) return true;
              }
            }
            return false;
          });
        }
        
        return { 
          meals: filtered.slice(0, limit).map(recipe => ({
            idMeal: recipe.idMeal,
            strMeal: recipe.strMeal,
            strMealThumb: recipe.strMealThumb
          }))
        };
      }
      
      throw new Error('Combined filtering requires Firebase database');
    } catch (error) {
      throw new Error(`Combined filtering failed: ${error.message}`);
    }
  }

  // Get truly random recipe from complete database
  async getTrulyRandom() {
    try {
      console.log('🎯 getTrulyRandom() called - fetching ALL recipes for maximum randomness');
      
      // Check if we're using Firebase
      if (this.db.getAllRecipes) {
        console.log('📊 Using Firebase/getAllRecipes method (no limit)');
        
        // Get ALL recipes for maximum randomness
        const recipes = await this.db.getAllRecipes();
        console.log(`📦 Retrieved ${recipes ? recipes.length : 0} TOTAL recipes from database`);
        
        if (!recipes || recipes.length === 0) {
          console.log('⚠️ No recipes found in database!');
          return { meals: null };
        }
        
        // Log all available recipes
        console.log('📋 Complete recipe pool for truly random selection:');
        recipes.forEach((recipe, idx) => {
          console.log(`   ${idx + 1}. ${recipe.strMeal} (${recipe.strCategory} - ${recipe.strArea})`);
        });
        
        // Triple entropy for maximum randomness
        const timestamp = Date.now();
        const randomValue1 = Math.random();
        const randomValue2 = Math.random();
        const randomValue3 = Math.random();
        
        // Combine multiple random sources
        const combinedRandom = (randomValue1 + randomValue2 + randomValue3 + (timestamp % 1000) / 1000) / 4;
        const normalizedRandom = combinedRandom % 1; // Ensure 0 <= value < 1
        const randomIndex = Math.floor(normalizedRandom * recipes.length);
        const randomRecipe = recipes[randomIndex];
        
        console.log(`🎲 Entropy sources: ${randomValue1.toFixed(6)}, ${randomValue2.toFixed(6)}, ${randomValue3.toFixed(6)}, timestamp ${timestamp}`);
        console.log(`🎲 Combined random value: ${normalizedRandom.toFixed(6)}`);
        console.log(`🎲 Calculated index: ${randomIndex} (from 0 to ${recipes.length - 1})`);
        console.log(`✅ TRULY RANDOM SELECTED: Recipe #${randomIndex + 1} of ${recipes.length}: "${randomRecipe.strMeal}"`);
        console.log(`   Category: ${randomRecipe.strCategory}, Area: ${randomRecipe.strArea}`);
        
        return { meals: [new Recipe(randomRecipe).toApiFormat()] };
      }
      
      console.log('📊 Using SQLite with ORDER BY RANDOM()');
      
      // Fallback to SQL
      const query = 'SELECT * FROM recipes ORDER BY RANDOM() LIMIT 1';
      const row = await this.db.get(query);
      
      if (!row) {
        return { meals: null };
      }
      
      return { meals: [new Recipe(row).toApiFormat()] };
    } catch (error) {
      throw new Error(`Get truly random recipe failed: ${error.message}`);
    }
  }

  // Get random recipe with filters applied
  async getRandomWithFilters(filters) {
    try {
      console.log('🔍 getRandomWithFilters() called with:', filters);
      
      // First filter recipes, then pick random from results
      const filteredResults = await this.filterByCombined(filters, 1000); // Get more for better randomness
      
      if (!filteredResults.meals || filteredResults.meals.length === 0) {
        console.log('⚠️ No recipes found matching filters:', filters);
        return { meals: null };
      }
      
      console.log(`📦 Found ${filteredResults.meals.length} recipes matching filters`);
      
      // Triple entropy for filtered random selection too
      const timestamp = Date.now();
      const randomValue1 = Math.random();
      const randomValue2 = Math.random();
      const randomValue3 = Math.random();
      
      const combinedRandom = (randomValue1 + randomValue2 + randomValue3 + (timestamp % 1000) / 1000) / 4;
      const normalizedRandom = combinedRandom % 1;
      const randomIndex = Math.floor(normalizedRandom * filteredResults.meals.length);
      const randomMeal = filteredResults.meals[randomIndex];
      
      console.log(`🎲 Triple-entropy random value: ${normalizedRandom.toFixed(6)}`);
      console.log(`✅ Selected filtered recipe #${randomIndex + 1} of ${filteredResults.meals.length}: ${randomMeal.strMeal}`);
      
      // Get full recipe details
      return await this.getById(randomMeal.idMeal);
    } catch (error) {
      console.error('❌ getRandomWithFilters() error:', error);
      throw new Error(`Get random with filters failed: ${error.message}`);
    }
  }
}

module.exports = RecipeManager;