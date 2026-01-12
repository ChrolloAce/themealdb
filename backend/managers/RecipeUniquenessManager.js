/**
 * RecipeUniquenessManager - Prevents duplicate recipes and ensures variety
 * 
 * This manager ensures:
 * 1. No duplicate recipe names (case-insensitive)
 * 2. No similar recipes (fuzzy matching)
 * 3. Tracks generation history to avoid repetition
 * 4. Provides feedback on why a recipe is considered duplicate
 */

class RecipeUniquenessManager {
  constructor(recipeManager) {
    this.recipeManager = recipeManager;
    this.similarityThreshold = 0.85; // 85% similarity = duplicate
  }

  /**
   * Check if a recipe name already exists (exact or very similar)
   */
  async isDuplicate(recipeName, recipeData = {}) {
    console.log(`\n🔍 ═══════════════════════════════════════════`);
    console.log(`🔍 DUPLICATE CHECK: "${recipeName}"`);
    console.log(`═══════════════════════════════════════════`);

    try {
      // Get all existing recipes
      const existingRecipes = await this.getAllExistingRecipes();
      console.log(`📊 Checking against ${existingRecipes.length} existing recipes`);

      if (existingRecipes.length === 0) {
        console.log(`✅ No existing recipes - this is unique!`);
        console.log(`═══════════════════════════════════════════\n`);
        return { isDuplicate: false, reason: 'No existing recipes' };
      }

      // Check 1: Exact name match (case-insensitive)
      const exactMatch = existingRecipes.find(recipe => 
        recipe.strMeal?.toLowerCase() === recipeName.toLowerCase()
      );

      if (exactMatch) {
        console.log(`❌ DUPLICATE: Exact name match found!`);
        console.log(`   Existing: "${exactMatch.strMeal}" (ID: ${exactMatch.idMeal})`);
        console.log(`═══════════════════════════════════════════\n`);
        return {
          isDuplicate: true,
          reason: 'Exact name match',
          existingRecipe: exactMatch
        };
      }

      // Check 2: Fuzzy/similar name match
      const similarMatch = this.findSimilarRecipe(recipeName, existingRecipes);
      if (similarMatch) {
        console.log(`⚠️ SIMILAR RECIPE: High similarity detected!`);
        console.log(`   New: "${recipeName}"`);
        console.log(`   Existing: "${similarMatch.recipe.strMeal}"`);
        console.log(`   Similarity: ${(similarMatch.similarity * 100).toFixed(1)}%`);
        console.log(`═══════════════════════════════════════════\n`);
        return {
          isDuplicate: true,
          reason: `Similar to existing recipe (${(similarMatch.similarity * 100).toFixed(1)}% match)`,
          existingRecipe: similarMatch.recipe,
          similarity: similarMatch.similarity
        };
      }

      // Check 3: Check if ingredients combination is too similar
      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        const ingredientMatch = this.findSimilarIngredientCombination(
          recipeData.ingredients,
          existingRecipes
        );
        
        if (ingredientMatch) {
          console.log(`⚠️ SIMILAR INGREDIENTS: Recipe with similar ingredients exists!`);
          console.log(`   Existing: "${ingredientMatch.recipe.strMeal}"`);
          console.log(`   Ingredient overlap: ${ingredientMatch.overlap}/${recipeData.ingredients.length}`);
          console.log(`═══════════════════════════════════════════\n`);
          return {
            isDuplicate: true,
            reason: `Similar ingredient combination (${ingredientMatch.overlap} matching ingredients)`,
            existingRecipe: ingredientMatch.recipe
          };
        }
      }

      console.log(`✅ UNIQUE: No duplicates or similar recipes found!`);
      console.log(`═══════════════════════════════════════════\n`);
      return { isDuplicate: false, reason: 'Unique recipe' };

    } catch (error) {
      console.error(`❌ Error checking duplicates:`, error);
      console.log(`═══════════════════════════════════════════\n`);
      // Fail-safe: allow the recipe but log warning
      return { isDuplicate: false, reason: 'Error checking - allowed by default', error: error.message };
    }
  }

  /**
   * Get all existing recipes from database
   */
  async getAllExistingRecipes() {
    try {
      if (this.recipeManager.db.getAllRecipes) {
        const recipes = await this.recipeManager.db.getAllRecipes();
        return recipes || [];
      }
      return [];
    } catch (error) {
      console.warn('Could not retrieve existing recipes:', error.message);
      return [];
    }
  }

  /**
   * Find recipes with similar names using fuzzy matching
   */
  findSimilarRecipe(newName, existingRecipes) {
    const normalizedNew = this.normalizeRecipeName(newName);
    
    for (const existing of existingRecipes) {
      const normalizedExisting = this.normalizeRecipeName(existing.strMeal);
      const similarity = this.calculateSimilarity(normalizedNew, normalizedExisting);
      
      if (similarity >= this.similarityThreshold) {
        return { recipe: existing, similarity };
      }
    }
    
    return null;
  }

  /**
   * Normalize recipe name for comparison
   */
  normalizeRecipeName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')         // Normalize whitespace
      .trim();
  }

  /**
   * Calculate similarity between two strings (Levenshtein distance based)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Levenshtein distance algorithm
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Check if ingredient combination is too similar to existing recipes
   */
  findSimilarIngredientCombination(newIngredients, existingRecipes) {
    const normalizedNew = newIngredients.map(ing => ing.toLowerCase().trim());
    
    for (const existing of existingRecipes) {
      const existingIngredients = this.extractIngredients(existing);
      const normalizedExisting = existingIngredients.map(ing => ing.toLowerCase().trim());
      
      const commonIngredients = normalizedNew.filter(ing => 
        normalizedExisting.includes(ing)
      );
      
      // If 70%+ of ingredients match, consider it too similar
      const overlapPercentage = commonIngredients.length / Math.min(normalizedNew.length, normalizedExisting.length);
      
      if (overlapPercentage >= 0.7 && commonIngredients.length >= 4) {
        return {
          recipe: existing,
          overlap: commonIngredients.length,
          percentage: overlapPercentage
        };
      }
    }
    
    return null;
  }

  /**
   * Extract ingredients from a recipe object
   */
  extractIngredients(recipe) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipe[`strIngredient${i}`];
      if (ingredient && ingredient.trim() && ingredient.toLowerCase() !== 'n/a') {
        ingredients.push(ingredient.trim());
      }
    }
    return ingredients;
  }

  /**
   * Get existing recipes filtered by criteria to build context
   */
  async getFilteredExistingRecipes(filters) {
    console.log('📋 Getting existing recipes matching filters:', filters);
    
    try {
      const allRecipes = await this.getAllExistingRecipes();
      
      let filtered = allRecipes;
      
      // Apply category filter
      if (filters.category) {
        filtered = filtered.filter(recipe => 
          recipe.strCategory?.toLowerCase() === filters.category.toLowerCase()
        );
      }
      
      // Apply area/cuisine filter
      if (filters.area || filters.cuisine) {
        const targetArea = (filters.area || filters.cuisine).toLowerCase();
        filtered = filtered.filter(recipe => 
          recipe.strArea?.toLowerCase() === targetArea
        );
      }
      
      // Apply dietary filter
      if (filters.dietary) {
        filtered = filtered.filter(recipe => {
          const dietary = recipe.dietary || {};
          return dietary[filters.dietary] === true;
        });
      }
      
      console.log(`📊 Found ${filtered.length} existing recipes matching filters`);
      return filtered;
      
    } catch (error) {
      console.warn('Could not filter existing recipes:', error.message);
      return [];
    }
  }

  /**
   * Build context string for AI to avoid generating duplicates
   */
  async buildAntiDuplicateContext(filters = {}) {
    const existingRecipes = filters && Object.keys(filters).length > 0
      ? await this.getFilteredExistingRecipes(filters)
      : await this.getAllExistingRecipes();
    
    if (existingRecipes.length === 0) {
      return '';
    }
    
    // Get recipe names
    const recipeNames = existingRecipes
      .slice(0, 30) // Limit to 30 most relevant
      .map(recipe => `"${recipe.strMeal}"`)
      .join(', ');
    
    return `\n🚫 EXISTING RECIPES - DO NOT DUPLICATE THESE (${existingRecipes.length} total):
${recipeNames}

🎯 CRITICAL: Generate a recipe that is COMPLETELY DIFFERENT from all of the above. Use different main ingredients, cooking techniques, and flavor profiles. Be creative and innovative!\n\n`;
  }
}

module.exports = RecipeUniquenessManager;

