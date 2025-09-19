class CategoryManager {
  constructor(databaseManager) {
    this.db = databaseManager;
  }

  // Get all categories with details
  async getAllCategories() {
    try {
      // Check if we're using Firebase
      if (this.db.getCategories) {
        const categories = await this.db.getCategories();
        return { categories };
      }
      
      // Fallback to SQL for SQLite
      const query = `
        SELECT 
          idCategory,
          strCategory,
          strCategoryThumb,
          strCategoryDescription
        FROM categories 
        ORDER BY strCategory
      `;
      const rows = await this.db.all(query);
      return { categories: rows };
    } catch (error) {
      throw new Error(`Get categories failed: ${error.message}`);
    }
  }

  // List category names only
  async listCategories() {
    try {
      // Check if we're using Firebase
      if (this.db.getCategories) {
        const categories = await this.db.getCategories();
        return { 
          meals: categories.map(category => ({ strCategory: category.strCategory }))
        };
      }
      
      // Fallback to SQL for SQLite
      const query = 'SELECT strCategory FROM categories ORDER BY strCategory';
      const rows = await this.db.all(query);
      return { 
        meals: rows.map(row => ({ strCategory: row.strCategory }))
      };
    } catch (error) {
      throw new Error(`List categories failed: ${error.message}`);
    }
  }

  // List area names only
  async listAreas() {
    try {
      // Check if we're using Firebase
      if (this.db.getAreas) {
        const areas = await this.db.getAreas();
        return { 
          meals: areas.map(area => ({ strArea: area.strArea }))
        };
      }
      
      // Fallback to SQL for SQLite
      const query = 'SELECT strArea FROM areas ORDER BY strArea';
      const rows = await this.db.all(query);
      return { 
        meals: rows.map(row => ({ strArea: row.strArea }))
      };
    } catch (error) {
      throw new Error(`List areas failed: ${error.message}`);
    }
  }

  // List ingredient names only
  async listIngredients() {
    try {
      const query = `
        SELECT DISTINCT strIngredient 
        FROM ingredients 
        WHERE strIngredient IS NOT NULL AND strIngredient != ''
        ORDER BY strIngredient
      `;
      const rows = await this.db.all(query);
      return { 
        meals: rows.map(row => ({ strIngredient: row.strIngredient }))
      };
    } catch (error) {
      throw new Error(`List ingredients failed: ${error.message}`);
    }
  }

  // Get ingredients from recipes (dynamic list)
  async getIngredientsFromRecipes() {
    try {
      const ingredients = new Set();
      
      // Query all ingredient columns from recipes
      for (let i = 1; i <= 20; i++) {
        const query = `
          SELECT DISTINCT strIngredient${i} as ingredient 
          FROM recipes 
          WHERE strIngredient${i} IS NOT NULL 
            AND strIngredient${i} != ''
          ORDER BY strIngredient${i}
        `;
        const rows = await this.db.all(query);
        rows.forEach(row => {
          if (row.ingredient && row.ingredient.trim()) {
            ingredients.add(row.ingredient.trim());
          }
        });
      }

      const sortedIngredients = Array.from(ingredients).sort();
      return { 
        meals: sortedIngredients.map(ingredient => ({ strIngredient: ingredient }))
      };
    } catch (error) {
      throw new Error(`Get ingredients from recipes failed: ${error.message}`);
    }
  }

  // Create new category
  async createCategory(categoryData) {
    try {
      const { strCategory, strCategoryThumb, strCategoryDescription } = categoryData;
      
      if (!strCategory) {
        throw new Error('Category name is required');
      }

      const query = `
        INSERT INTO categories (strCategory, strCategoryThumb, strCategoryDescription)
        VALUES (?, ?, ?)
      `;
      
      const result = await this.db.run(query, [strCategory, strCategoryThumb, strCategoryDescription]);
      
      return await this.getCategoryById(result.id);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint')) {
        throw new Error('Category already exists');
      }
      throw new Error(`Create category failed: ${error.message}`);
    }
  }

  // Create new area
  async createArea(areaData) {
    try {
      const { strArea } = areaData;
      
      if (!strArea) {
        throw new Error('Area name is required');
      }

      const query = 'INSERT INTO areas (strArea) VALUES (?)';
      const result = await this.db.run(query, [strArea]);
      
      return { idArea: result.id, strArea };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint')) {
        throw new Error('Area already exists');
      }
      throw new Error(`Create area failed: ${error.message}`);
    }
  }

  // Create new ingredient
  async createIngredient(ingredientData) {
    try {
      const { strIngredient, strDescription, strType } = ingredientData;
      
      if (!strIngredient) {
        throw new Error('Ingredient name is required');
      }

      const query = `
        INSERT INTO ingredients (strIngredient, strDescription, strType)
        VALUES (?, ?, ?)
      `;
      
      const result = await this.db.run(query, [strIngredient, strDescription, strType]);
      
      return {
        idIngredient: result.id,
        strIngredient,
        strDescription,
        strType
      };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint')) {
        throw new Error('Ingredient already exists');
      }
      throw new Error(`Create ingredient failed: ${error.message}`);
    }
  }

  // Get category by ID
  async getCategoryById(id) {
    try {
      const query = 'SELECT * FROM categories WHERE idCategory = ?';
      const row = await this.db.get(query, [id]);
      return row;
    } catch (error) {
      throw new Error(`Get category by ID failed: ${error.message}`);
    }
  }

  // Update category
  async updateCategory(id, categoryData) {
    try {
      const { strCategory, strCategoryThumb, strCategoryDescription } = categoryData;
      
      const query = `
        UPDATE categories 
        SET strCategory = ?, strCategoryThumb = ?, strCategoryDescription = ?
        WHERE idCategory = ?
      `;
      
      const result = await this.db.run(query, [strCategory, strCategoryThumb, strCategoryDescription, id]);
      
      if (result.changes === 0) {
        throw new Error('Category not found');
      }
      
      return await this.getCategoryById(id);
    } catch (error) {
      throw new Error(`Update category failed: ${error.message}`);
    }
  }

  // Delete category
  async deleteCategory(id) {
    try {
      const result = await this.db.run('DELETE FROM categories WHERE idCategory = ?', [id]);
      return { success: result.changes > 0 };
    } catch (error) {
      throw new Error(`Delete category failed: ${error.message}`);
    }
  }

  // Get recipe count by category
  async getRecipeCountByCategory() {
    try {
      const query = `
        SELECT 
          c.strCategory,
          COUNT(r.idMeal) as count
        FROM categories c
        LEFT JOIN recipes r ON c.strCategory = r.strCategory
        GROUP BY c.strCategory
        ORDER BY c.strCategory
      `;
      const rows = await this.db.all(query);
      return rows;
    } catch (error) {
      throw new Error(`Get recipe count by category failed: ${error.message}`);
    }
  }

  // Get recipe count by area
  async getRecipeCountByArea() {
    try {
      const query = `
        SELECT 
          a.strArea,
          COUNT(r.idMeal) as count
        FROM areas a
        LEFT JOIN recipes r ON a.strArea = r.strArea
        GROUP BY a.strArea
        ORDER BY a.strArea
      `;
      const rows = await this.db.all(query);
      return rows;
    } catch (error) {
      throw new Error(`Get recipe count by area failed: ${error.message}`);
    }
  }

  // =======================
  // NEW COMPREHENSIVE LISTING METHODS
  // =======================

  // List all meal types (breakfast, brunch, lunch, dinner, snack, dessert)
  async listMealTypes() {
    try {
      // Check if we're using Firebase
      if (this.db.getAllRecipes) {
        const recipes = await this.db.getAllRecipes();
        const mealTypesSet = new Set();
        
        recipes.forEach(recipe => {
          const mealTypes = recipe.mealType || [];
          mealTypes.forEach(type => {
            if (type && type.trim()) {
              mealTypesSet.add(type.trim());
            }
          });
        });
        
        const sortedMealTypes = Array.from(mealTypesSet).sort();
        return { 
          meals: sortedMealTypes.map(mealType => ({ strMealType: mealType }))
        };
      }
      
      // Fallback: return standard meal types
      const standardMealTypes = [
        'Breakfast',
        'Brunch', 
        'Lunch',
        'Dinner',
        'Snack',
        'Dessert'
      ];
      
      return { 
        meals: standardMealTypes.map(mealType => ({ strMealType: mealType }))
      };
    } catch (error) {
      throw new Error(`List meal types failed: ${error.message}`);
    }
  }

  // List all dish types (appetizer, main course, side dish, dessert, etc.)
  async listDishTypes() {
    try {
      // Check if we're using Firebase
      if (this.db.getAllRecipes) {
        const recipes = await this.db.getAllRecipes();
        const dishTypesSet = new Set();
        
        recipes.forEach(recipe => {
          const dishType = recipe.dishType;
          if (dishType && dishType.trim()) {
            dishTypesSet.add(dishType.trim());
          }
        });
        
        const sortedDishTypes = Array.from(dishTypesSet).sort();
        return { 
          meals: sortedDishTypes.map(dishType => ({ strDishType: dishType }))
        };
      }
      
      // Fallback: return standard dish types
      const standardDishTypes = [
        'Appetizer',
        'Soup',
        'Salad',
        'Main Course',
        'Side Dish',
        'Dessert',
        'Beverage',
        'Snack'
      ];
      
      return { 
        meals: standardDishTypes.map(dishType => ({ strDishType: dishType }))
      };
    } catch (error) {
      throw new Error(`List dish types failed: ${error.message}`);
    }
  }

  // List all dietary preferences (vegetarian, vegan, keto, paleo, etc.)
  async listDietaryOptions() {
    try {
      // Check if we're using Firebase
      if (this.db.getAllRecipes) {
        const recipes = await this.db.getAllRecipes();
        const dietaryOptionsSet = new Set();
        
        recipes.forEach(recipe => {
          const dietary = recipe.dietary || {};
          Object.entries(dietary).forEach(([key, value]) => {
            if (value === true) {
              // Convert camelCase to readable format
              const readableKey = key
                .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
                .replace(/No /g, 'No ') // Fix spacing for "No" prefixes
                .trim();
              
              dietaryOptionsSet.add(readableKey);
            }
          });
        });
        
        const sortedDietaryOptions = Array.from(dietaryOptionsSet).sort();
        return { 
          meals: sortedDietaryOptions.map(dietary => ({ strDietary: dietary }))
        };
      }
      
      // Fallback: return standard dietary options
      const standardDietaryOptions = [
        'Vegetarian',
        'Vegan',
        'Pescatarian',
        'Gluten Free',
        'Dairy Free',
        'Keto',
        'Paleo',
        'Halal',
        'No Red Meat',
        'No Pork',
        'No Shellfish',
        'Omnivore'
      ];
      
      return { 
        meals: standardDietaryOptions.map(dietary => ({ strDietary: dietary }))
      };
    } catch (error) {
      throw new Error(`List dietary options failed: ${error.message}`);
    }
  }
}

module.exports = CategoryManager;