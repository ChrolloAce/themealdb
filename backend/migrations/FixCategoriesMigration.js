/**
 * FixCategoriesMigration.js
 * Migration script to fix recipe categories
 * Converts dish types in strCategory to proper meal types
 */

const CategoryConfig = require('../config/CategoryConfig');

class FixCategoriesMigration {
  constructor(databaseManager) {
    this.db = databaseManager;
    this.config = CategoryConfig;
    this.stats = {
      total: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };
  }

  /**
   * Run the migration
   */
  async run() {
    console.log('🔄 Starting category migration...');
    console.log('📋 This will convert dish types to proper meal categories');
    
    try {
      // Get all recipes
      const recipes = await this.getAllRecipes();
      this.stats.total = recipes.length;
      
      console.log(`📊 Found ${recipes.length} recipes to process`);
      
      // Process each recipe
      for (const recipe of recipes) {
        await this.processRecipe(recipe);
      }
      
      // Print results
      this.printResults();
      
      return this.stats;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Get all recipes from database
   */
  async getAllRecipes() {
    // Check if using Firebase
    if (this.db.getAllRecipes) {
      return await this.db.getAllRecipes();
    }
    
    // SQL query for traditional databases
    const query = 'SELECT * FROM recipes';
    return await this.db.all(query);
  }

  /**
   * Process a single recipe
   */
  async processRecipe(recipe) {
    try {
      const currentCategory = recipe.strCategory;
      const currentDishType = recipe.dishType;
      
      // Skip if already has valid meal category
      if (this.config.isValidMealCategory(currentCategory)) {
        this.stats.skipped++;
        return;
      }
      
      // Determine new values
      const newCategory = this.config.getMealCategory(currentCategory);
      const newDishType = currentDishType || this.config.getDishType(currentCategory);
      
      // Use the correct ID field - Firebase uses 'id', SQL uses 'idMeal'
      const recipeId = recipe.id || recipe.idMeal;
      
      // Update the recipe
      await this.updateRecipe(recipeId, {
        strCategory: newCategory,
        dishType: newDishType
      });
      
      console.log(`✅ Updated: ${recipe.strMeal}`);
      console.log(`   Category: ${currentCategory} → ${newCategory}`);
      console.log(`   Dish Type: ${currentDishType || 'none'} → ${newDishType}`);
      
      this.stats.updated++;
    } catch (error) {
      console.error(`❌ Error processing ${recipe.strMeal}:`, error.message);
      this.stats.errors++;
    }
  }

  /**
   * Update a recipe in the database
   */
  async updateRecipe(recipeId, updates) {
    // Check if using Firebase
    if (this.db.updateRecipe) {
      return await this.db.updateRecipe(recipeId, updates);
    }
    
    // SQL update for traditional databases
    const query = `
      UPDATE recipes 
      SET strCategory = ?, dishType = ?
      WHERE idMeal = ?
    `;
    
    return await this.db.run(query, [
      updates.strCategory,
      updates.dishType,
      recipeId
    ]);
  }

  /**
   * Print migration results
   */
  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION RESULTS');
    console.log('='.repeat(50));
    console.log(`Total recipes: ${this.stats.total}`);
    console.log(`✅ Updated: ${this.stats.updated}`);
    console.log(`⏭️  Skipped (already correct): ${this.stats.skipped}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log('='.repeat(50));
    
    if (this.stats.updated > 0) {
      console.log('✨ Migration completed successfully!');
      console.log('📝 Recipe categories have been fixed.');
    } else {
      console.log('ℹ️  No recipes needed updating.');
    }
  }

  /**
   * Dry run - preview changes without applying
   */
  async dryRun() {
    console.log('🔍 Running migration preview (no changes will be made)...\n');
    
    const recipes = await this.getAllRecipes();
    const changes = [];
    
    for (const recipe of recipes) {
      const currentCategory = recipe.strCategory;
      
      if (!this.config.isValidMealCategory(currentCategory)) {
        const newCategory = this.config.getMealCategory(currentCategory);
        const newDishType = recipe.dishType || this.config.getDishType(currentCategory);
        
        changes.push({
          name: recipe.strMeal,
          oldCategory: currentCategory,
          newCategory: newCategory,
          dishType: newDishType
        });
      }
    }
    
    if (changes.length === 0) {
      console.log('✅ All recipes already have correct categories!');
      return;
    }
    
    console.log(`📋 Found ${changes.length} recipes that need updating:\n`);
    
    // Show first 10 as examples
    const examples = changes.slice(0, 10);
    examples.forEach(change => {
      console.log(`• ${change.name}`);
      console.log(`  Category: ${change.oldCategory} → ${change.newCategory}`);
      console.log(`  Dish Type: ${change.dishType}\n`);
    });
    
    if (changes.length > 10) {
      console.log(`... and ${changes.length - 10} more recipes\n`);
    }
    
    console.log('💡 Run the migration without --dry-run to apply these changes.');
    
    return changes;
  }
}

module.exports = FixCategoriesMigration;
