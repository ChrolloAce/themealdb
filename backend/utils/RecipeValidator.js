/**
 * RecipeValidator - Validates recipe completeness and consistency
 * 
 * Checks:
 * - All ingredients in instructions are listed in ingredients
 * - All listed ingredients are used in instructions
 * - No placeholder/fallback text remains
 * - Required fields are present and valid
 */

class RecipeValidator {
  /**
   * Comprehensive recipe validation
   */
  static validate(recipe) {
    console.log('\n🔍 ═══════════════════════════════════════════');
    console.log('🔍 RECIPE VALIDATION');
    console.log('═══════════════════════════════════════════');
    console.log(`📋 Recipe: "${recipe.strMeal}"`);
    
    const errors = [];
    const warnings = [];
    
    // CRITICAL: Check that values are from allowed lists
    const ALLOWED_CATEGORIES = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
    const ALLOWED_DISH_TYPES = [
      'Appetizers', 'Side Dishes', 'Main Courses', 'Soups', 'Salads',
      'Sandwiches & Wraps', 'Burgers', 'Pizza & Flatbreads', 'Pasta & Noodles',
      'Rice Dishes', 'Tacos, Burritos & Quesadillas', 'Stir-Fries', 'Curries',
      'Stews & Casseroles', 'Skillet & One-Pan Meals', 'Slow Cooker / Instant Pot',
      'Grilling / BBQ', 'Baked Goods', 'Pastries', 'Cookies & Bars',
      'Pies & Cobblers', 'Frozen Treats', 'Pancakes & Waffles', 'Dips & Spreads',
      'Bowls', 'Drinks & Smoothies', 'Breads', 'Meal Prep', 'Boards & Platters',
      'Protein Dishes', 'Cakes & Cupcakes'
    ];
    const ALLOWED_CUISINES = [
      'Italian', 'Mexican', 'American', 'Chinese', 'Japanese', 'Indian', 'Thai',
      'French', 'Mediterranean', 'Greek', 'Spanish', 'Korean', 'Vietnamese',
      'Middle Eastern', 'British', 'German', 'Brazilian', 'Moroccan', 'International'
    ];
    
    // Validate strCategory
    if (recipe.strCategory && !ALLOWED_CATEGORIES.includes(recipe.strCategory)) {
      errors.push(`CRITICAL: strCategory "${recipe.strCategory}" is NOT in allowed list. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`);
    }
    
    // Validate dishType
    if (recipe.dishType && !ALLOWED_DISH_TYPES.includes(recipe.dishType)) {
      errors.push(`CRITICAL: dishType "${recipe.dishType}" is NOT in allowed list. Must be one of: ${ALLOWED_DISH_TYPES.join(', ')}`);
    }
    
    // Validate strArea (cuisine)
    if (recipe.strArea && !ALLOWED_CUISINES.includes(recipe.strArea)) {
      errors.push(`CRITICAL: strArea "${recipe.strArea}" is NOT in allowed list. Must be one of: ${ALLOWED_CUISINES.join(', ')}`);
    }
    
    // Check 1: Basic required fields
    const requiredFields = ['strMeal', 'strCategory', 'strArea', 'strDescription'];
    for (const field of requiredFields) {
      if (!recipe[field] || recipe[field].trim() === '') {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Check 2: No fallback/placeholder text
    const fallbackPatterns = [
      /🚨.*FALLBACK/i,
      /placeholder/i,
      /\[INSERT.*\]/i,
      /TBD/i,
      /TO BE DETERMINED/i,
      /N\/A/i,
      /COMING SOON/i
    ];
    
    const allText = JSON.stringify(recipe);
    for (const pattern of fallbackPatterns) {
      if (pattern.test(allText)) {
        errors.push(`Recipe contains placeholder/fallback text matching: ${pattern}`);
      }
    }
    
    // Check 3: Extract and validate ingredients
    const listedIngredients = this.extractListedIngredients(recipe);
    console.log(`📦 Found ${listedIngredients.length} listed ingredients`);
    
    if (listedIngredients.length === 0) {
      errors.push('No ingredients listed');
    } else if (listedIngredients.length < 3) {
      warnings.push(`Only ${listedIngredients.length} ingredients - seems low`);
    }
    
    // Check 4: Extract ingredients mentioned in instructions
    const instructionText = this.getInstructionText(recipe);
    const mentionedIngredients = this.extractMentionedIngredients(instructionText, listedIngredients);
    
    console.log(`📝 Found ${mentionedIngredients.size} unique ingredients mentioned in instructions`);
    
    // Check 5: Find missing ingredients (in instructions but not in list)
    const missingIngredients = this.findMissingIngredients(mentionedIngredients, listedIngredients);
    
    if (missingIngredients.length > 0) {
      console.log(`❌ CRITICAL: ${missingIngredients.length} ingredients used but not listed!`);
      missingIngredients.forEach(ing => {
        console.log(`   ❌ Missing: ${ing}`);
        errors.push(`Ingredient "${ing}" is used in instructions but not listed in ingredients`);
      });
    }
    
    // Check 6: Find unused ingredients (in list but not in instructions)
    const unusedIngredients = this.findUnusedIngredients(listedIngredients, instructionText);
    
    if (unusedIngredients.length > 0) {
      console.log(`⚠️ Warning: ${unusedIngredients.length} ingredients listed but never used`);
      unusedIngredients.forEach(ing => {
        console.log(`   ⚠️ Unused: ${ing.name} (${ing.measure})`);
        warnings.push(`Ingredient "${ing.name}" is listed but never used in instructions`);
      });
    }
    
    // Check 7: Validate instructions
    if (!recipe.instructions || recipe.instructions.length === 0) {
      if (!recipe.strInstructions || recipe.strInstructions.trim() === '') {
        errors.push('No instructions provided');
      }
    } else if (recipe.instructions.length < 3) {
      warnings.push('Very few instruction steps (less than 3)');
    }
    
    // Check 8: Validate times
    if (recipe.prepTime <= 0 || recipe.cookTime <= 0) {
      warnings.push('Prep time or cook time is zero or negative');
    }
    
    // Check 9: Validate servings
    if (!recipe.numberOfServings || recipe.numberOfServings <= 0) {
      warnings.push('Number of servings is missing or invalid');
    }
    
    // Summary
    console.log('\n📊 VALIDATION SUMMARY');
    console.log('─'.repeat(45));
    console.log(`❌ Errors: ${errors.length}`);
    console.log(`⚠️ Warnings: ${warnings.length}`);
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ Recipe validation PASSED!');
    } else {
      if (errors.length > 0) {
        console.log('\n❌ ERRORS:');
        errors.forEach((err, idx) => console.log(`   ${idx + 1}. ${err}`));
      }
      if (warnings.length > 0) {
        console.log('\n⚠️ WARNINGS:');
        warnings.forEach((warn, idx) => console.log(`   ${idx + 1}. ${warn}`));
      }
    }
    
    console.log('═══════════════════════════════════════════\n');
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      missingIngredients,
      unusedIngredients
    };
  }
  
  /**
   * Extract listed ingredients from recipe
   */
  static extractListedIngredients(recipe) {
    const ingredients = [];
    
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipe[`strIngredient${i}`];
      const measure = recipe[`strMeasure${i}`];
      
      if (ingredient && ingredient.trim() && 
          ingredient.toLowerCase() !== 'n/a' &&
          !ingredient.includes('FALLBACK')) {
        ingredients.push({
          name: ingredient.trim(),
          measure: measure ? measure.trim() : '',
          normalized: this.normalizeIngredient(ingredient)
        });
      }
    }
    
    return ingredients;
  }
  
  /**
   * Get all instruction text
   */
  static getInstructionText(recipe) {
    let text = '';
    
    // Get from instructions array
    if (recipe.instructions && Array.isArray(recipe.instructions)) {
      text += recipe.instructions.join(' ');
    }
    
    // Get from strInstructions
    if (recipe.strInstructions) {
      text += ' ' + recipe.strInstructions;
    }
    
    return text.toLowerCase();
  }
  
  /**
   * Extract ingredients mentioned in instructions
   */
  static extractMentionedIngredients(instructionText, listedIngredients) {
    const mentioned = new Set();
    
    // Common ingredient keywords to look for
    const ingredientKeywords = [
      'egg', 'eggs', 'butter', 'oil', 'flour', 'sugar', 'salt', 'pepper',
      'milk', 'cream', 'cheese', 'vanilla', 'cinnamon', 'garlic', 'onion',
      'tomato', 'chicken', 'beef', 'pork', 'fish', 'shrimp', 'pasta',
      'rice', 'bread', 'lemon', 'lime', 'orange', 'honey', 'chocolate',
      'ice cream', 'yogurt', 'sour cream', 'heavy cream', 'whipping cream'
    ];
    
    // Check each keyword
    for (const keyword of ingredientKeywords) {
      if (instructionText.includes(keyword)) {
        mentioned.add(keyword);
      }
    }
    
    // Also check all listed ingredients
    for (const ing of listedIngredients) {
      if (instructionText.includes(ing.normalized)) {
        mentioned.add(ing.normalized);
      }
    }
    
    return mentioned;
  }
  
  /**
   * Find ingredients used in instructions but not listed
   */
  static findMissingIngredients(mentionedIngredients, listedIngredients) {
    const missing = [];
    const listedNormalized = listedIngredients.map(ing => ing.normalized);
    
    for (const mentioned of mentionedIngredients) {
      // Check if this mentioned ingredient is in the listed ingredients
      const found = listedNormalized.some(listed => 
        listed.includes(mentioned) || mentioned.includes(listed)
      );
      
      if (!found) {
        missing.push(mentioned);
      }
    }
    
    return missing;
  }
  
  /**
   * Find ingredients listed but never used in instructions
   */
  static findUnusedIngredients(listedIngredients, instructionText) {
    const unused = [];
    
    for (const ingredient of listedIngredients) {
      if (!instructionText.includes(ingredient.normalized)) {
        unused.push(ingredient);
      }
    }
    
    return unused;
  }
  
  /**
   * Normalize ingredient name for comparison
   */
  static normalizeIngredient(ingredient) {
    return ingredient
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')         // Normalize whitespace
      .trim();
  }
  
  /**
   * Auto-fix recipe by adding missing ingredients and fixing invalid values
   */
  static autoFix(recipe, validationResult) {
    if (validationResult.valid) {
      return { fixed: false, recipe, message: 'Recipe is already valid' };
    }
    
    console.log('\n🔧 AUTO-FIX ATTEMPT');
    console.log('═══════════════════════════════════════════');
    
    let fixed = false;
    const fixedRecipe = { ...recipe };
    
    const ALLOWED_CATEGORIES = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
    const ALLOWED_DISH_TYPES = [
      'Appetizers', 'Side Dishes', 'Main Courses', 'Soups', 'Salads',
      'Sandwiches & Wraps', 'Burgers', 'Pizza & Flatbreads', 'Pasta & Noodles',
      'Rice Dishes', 'Tacos, Burritos & Quesadillas', 'Stir-Fries', 'Curries',
      'Stews & Casseroles', 'Skillet & One-Pan Meals', 'Slow Cooker / Instant Pot',
      'Grilling / BBQ', 'Baked Goods', 'Pastries', 'Cookies & Bars',
      'Pies & Cobblers', 'Frozen Treats', 'Pancakes & Waffles', 'Dips & Spreads',
      'Bowls', 'Drinks & Smoothies', 'Breads', 'Meal Prep', 'Boards & Platters',
      'Protein Dishes', 'Cakes & Cupcakes'
    ];
    const ALLOWED_CUISINES = [
      'Italian', 'Mexican', 'American', 'Chinese', 'Japanese', 'Indian', 'Thai',
      'French', 'Mediterranean', 'Greek', 'Spanish', 'Korean', 'Vietnamese',
      'Middle Eastern', 'British', 'German', 'Brazilian', 'Moroccan', 'International'
    ];
    
    // Fix invalid strCategory
    if (fixedRecipe.strCategory && !ALLOWED_CATEGORIES.includes(fixedRecipe.strCategory)) {
      console.log(`🔧 Fixing invalid strCategory: "${fixedRecipe.strCategory}" → "Dinner"`);
      fixedRecipe.strCategory = 'Dinner'; // Default to Dinner
      fixed = true;
    }
    
    // Fix invalid dishType
    if (fixedRecipe.dishType && !ALLOWED_DISH_TYPES.includes(fixedRecipe.dishType)) {
      console.log(`🔧 Fixing invalid dishType: "${fixedRecipe.dishType}" → "Main Courses"`);
      fixedRecipe.dishType = 'Main Courses'; // Default to Main Courses
      fixed = true;
    }
    
    // Fix invalid strArea
    if (fixedRecipe.strArea && !ALLOWED_CUISINES.includes(fixedRecipe.strArea)) {
      console.log(`🔧 Fixing invalid strArea: "${fixedRecipe.strArea}" → "International"`);
      fixedRecipe.strArea = 'International'; // Default to International
      fixed = true;
    }
    
    // Try to add missing ingredients
    if (validationResult.missingIngredients && validationResult.missingIngredients.length > 0) {
      console.log(`🔧 Attempting to add ${validationResult.missingIngredients.length} missing ingredients`);
      
      // Find first empty slot
      let slotIndex = 1;
      for (let i = 1; i <= 20; i++) {
        if (!fixedRecipe[`strIngredient${i}`] || !fixedRecipe[`strIngredient${i}`].trim()) {
          slotIndex = i;
          break;
        }
      }
      
      // Add missing ingredients to empty slots with SPECIFIC measurements
      for (const missing of validationResult.missingIngredients) {
        if (slotIndex <= 20) {
          fixedRecipe[`strIngredient${slotIndex}`] = this.capitalizeWords(missing);
          // Use intelligent default measurements instead of "To taste"
          fixedRecipe[`strMeasure${slotIndex}`] = this.getDefaultMeasurement(missing);
          console.log(`   ✅ Added: ${missing} (${fixedRecipe[`strMeasure${slotIndex}`]}) at slot ${slotIndex}`);
          slotIndex++;
          fixed = true;
        }
      }
    }
    
    console.log('═══════════════════════════════════════════\n');
    
    return {
      fixed,
      recipe: fixedRecipe,
      message: fixed ? 'Auto-fixed: Corrected invalid values and added missing ingredients' : 'Could not auto-fix'
    };
  }
  
  /**
   * Get intelligent default measurement for an ingredient
   */
  static getDefaultMeasurement(ingredient) {
    const ing = ingredient.toLowerCase();
    
    // Spices and seasonings - use teaspoons
    if (ing.includes('powder') || ing.includes('cumin') || ing.includes('paprika') || 
        ing.includes('oregano') || ing.includes('basil') || ing.includes('thyme') || 
        ing.includes('cinnamon') || ing.includes('ginger') || ing.includes('turmeric') ||
        ing.includes('cayenne') || ing.includes('chili') || ing.includes('curry')) {
      return '1 tsp';
    }
    
    // Salt and pepper - use small amounts
    if (ing.includes('salt')) return '1/2 tsp';
    if (ing.includes('pepper')) return '1/4 tsp';
    
    // Liquids - use tablespoons or cups
    if (ing.includes('oil') || ing.includes('vinegar') || ing.includes('sauce') || 
        ing.includes('juice')) {
      return '2 tbsp';
    }
    
    // Dairy products
    if (ing.includes('milk') || ing.includes('cream')) return '1/2 cup';
    if (ing.includes('butter')) return '2 tbsp';
    if (ing.includes('cheese')) return '1/4 cup';
    
    // Herbs - use tablespoons
    if (ing.includes('parsley') || ing.includes('cilantro') || ing.includes('mint') ||
        ing.includes('dill') || ing.includes('chives')) {
      return '2 tbsp';
    }
    
    // Vegetables and aromatics
    if (ing.includes('garlic')) return '2 cloves';
    if (ing.includes('onion')) return '1 medium';
    if (ing.includes('tomato')) return '2 medium';
    
    // Default for unknown ingredients
    return '1/4 cup';
  }
  
  /**
   * Capitalize first letter of each word
   */
  static capitalizeWords(str) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  }
}

module.exports = RecipeValidator;

