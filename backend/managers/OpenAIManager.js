const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const RecipeUniquenessManager = require('./RecipeUniquenessManager');
const JSONRepair = require('../utils/JSONRepair');
const RecipeValidator = require('../utils/RecipeValidator');
const MultiStepRecipeGenerator = require('./MultiStepRecipeGenerator');

class OpenAIManager {
  constructor(recipeManager = null) {
    // Only initialize OpenAI if API key is provided
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      this.model = process.env.OPENAI_MODEL || 'gpt-4';
      // Try GPT-5.2 Instant first, fallback to gpt-4o-mini if not available
      this.reviewModel = process.env.OPENAI_REVIEW_MODEL || 'gpt-4o-mini'; // Faster, cheaper model for review step
      this.imageModel = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3';
      this.isAvailable = true;
      console.log('✅ OpenAI Manager initialized with API key');
    } else {
      this.openai = null;
      this.model = null;
      this.imageModel = null;
      this.isAvailable = false;
      console.log('⚠️ OpenAI Manager initialized without API key - AI features disabled');
    }
    
    // Cache for equipment and ingredients lists
    this.equipmentList = null;
    this.ingredientsList = null;
    
    // Uniqueness manager for duplicate detection
    this.uniquenessManager = null;
    if (recipeManager) {
      this.uniquenessManager = new RecipeUniquenessManager(recipeManager);
      console.log('✅ RecipeUniquenessManager initialized');
    }
    
    // Multi-step generator for high-quality recipes
    this.multiStepGenerator = null;
    if (this.isAvailable) {
      this.multiStepGenerator = new MultiStepRecipeGenerator(this);
      console.log('✅ MultiStepRecipeGenerator initialized');
    }
  }

  /**
   * List all available OpenAI models for this API key
   * Useful for debugging which models you have access to
   */
  async listAvailableModels() {
    this.checkAvailability();
    
    try {
      const models = await this.openai.models.list();
      const modelIds = models.data.map(m => m.id).sort();
      console.log('📋 Available OpenAI models:');
      modelIds.forEach(id => console.log(`   - ${id}`));
      return modelIds;
    } catch (error) {
      console.error('❌ Failed to list models:', error.message);
      throw error;
    }
  }

  /**
   * Get smart defaults based on recipe category/type
   * ⚠️ NOTE: These are ONLY used as FALLBACKS when AI doesn't provide values.
   * The AI should ALWAYS calculate times/servings based on the actual recipe being generated.
   */
  getSmartDefaults(category = 'Dinner', dishType = 'Main Courses', difficulty = 'Medium', servings = null) {
    // Smart defaults based on category
    const categoryDefaults = {
      'Breakfast': { prep: 10, cook: 15, total: 25, servings: 2 },
      'Brunch': { prep: 15, cook: 20, total: 35, servings: 4 },
      'Lunch': { prep: 15, cook: 20, total: 35, servings: 4 },
      'Dinner': { prep: 20, cook: 30, total: 50, servings: 4 },
      'Snack': { prep: 5, cook: 10, total: 15, servings: 2 },
      'Dessert': { prep: 20, cook: 25, total: 45, servings: 6 }
    };

    // Adjust based on difficulty
    const difficultyMultipliers = {
      'Easy': { prep: 0.8, cook: 0.8, total: 0.8 },
      'Medium': { prep: 1.0, cook: 1.0, total: 1.0 },
      'Hard': { prep: 1.3, cook: 1.5, total: 1.4 }
    };

    // Adjust based on dish type
    const dishTypeAdjustments = {
      'Soups': { cook: 1.5 }, // Soups take longer
      'Stews & Casseroles': { cook: 2.0 }, // Stews take much longer
      'Slow Cooker / Instant Pot': { cook: 0.3, total: 0.5 }, // Instant pot is faster
      'Raw/No-Cook': { cook: 0, total: 0.3 }, // No cooking time
      'Salads': { cook: 0, total: 0.5 }, // No cooking
      'Snacks': { prep: 0.5, cook: 0.5, total: 0.5 }, // Quick snacks
      'Baked Goods': { cook: 1.5 }, // Baking takes longer
      'Pastries': { prep: 1.5, cook: 1.2 } // Pastries need more prep
    };

    const defaults = categoryDefaults[category] || categoryDefaults['Dinner'];
    const multiplier = difficultyMultipliers[difficulty] || difficultyMultipliers['Medium'];
    const adjustment = dishTypeAdjustments[dishType] || {};

    const prepTime = Math.round(defaults.prep * multiplier.prep * (adjustment.prep || 1));
    const cookTime = Math.round(defaults.cook * multiplier.cook * (adjustment.cook || 1));
    const totalTime = Math.round(defaults.total * multiplier.total * (adjustment.total || 1));
    const numberOfServings = servings || defaults.servings;

    // Smart equipment based on dish type
    let equipment = ['Chef\'s knife', 'Cutting board', 'Measuring cups/spoons'];
    if (dishType && dishType.includes('Baked') || dishType.includes('Pastries') || dishType.includes('Cookies')) {
      equipment = ['Oven', 'Baking sheet', 'Mixing bowl', 'Chef\'s knife', 'Cutting board', 'Measuring cups/spoons'];
    } else if (dishType && (dishType.includes('Slow Cooker') || dishType.includes('Stew') || dishType.includes('Casserole'))) {
      equipment = ['Dutch oven or Slow cooker', 'Chef\'s knife', 'Cutting board', 'Measuring cups/spoons'];
    } else if (dishType && (dishType.includes('Salad') || dishType.includes('Raw'))) {
      equipment = ['Mixing bowl', 'Chef\'s knife', 'Cutting board', 'Measuring cups/spoons'];
    } else if (dishType && dishType.includes('Grilling')) {
      equipment = ['Grill', 'Tongs', 'Chef\'s knife', 'Cutting board', 'Measuring cups/spoons'];
    } else {
      // Default stovetop
      equipment = ['Large skillet or saucepan', 'Chef\'s knife', 'Cutting board', 'Measuring cups/spoons'];
    }

    return {
      prepTime,
      cookTime,
      totalTime: totalTime || (prepTime + cookTime),
      numberOfServings,
      equipment
    };
  }

  /**
   * Review and fix recipe - send to ChatGPT for review, get fixes, return corrected recipe
   */
  async reviewAndFixRecipe(recipe, params = {}) {
    this.checkAvailability();
    
    console.log(`📤 Sending recipe to ChatGPT for review and fixes (combined step) using ${this.reviewModel}...`);
    
    // Limit recipe JSON size to avoid token limits and timeouts
    let recipeToReview = recipe;
    const recipeJson = JSON.stringify(recipe, null, 2);
    if (recipeJson.length > 4000) { // More aggressive truncation for faster processing
      console.warn('⚠️  Recipe JSON is very large, truncating for review...');
      // Keep essential fields only - prioritize review-critical fields
      recipeToReview = {
        strMeal: recipe.strMeal,
        strCategory: recipe.strCategory,
        strArea: recipe.strArea,
        strDescription: recipe.strDescription,
        instructions: recipe.instructions?.slice(0, 12) || [], // Limit instructions further
        ingredientsDetailed: recipe.ingredientsDetailed || [],
        equipmentRequired: recipe.equipmentRequired || [],
        numberOfServings: recipe.numberOfServings,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        difficulty: recipe.difficulty,
        occasion: recipe.occasion,
        seasonality: recipe.seasonality,
        skillsRequired: recipe.skillsRequired,
        dietary: recipe.dietary,
        allergenFlags: recipe.allergenFlags || []
        // Note: nutrition removed from truncated version to save tokens - will be preserved from original
      };
    }
    
    const finalRecipeJson = JSON.stringify(recipeToReview, null, 2);
    
    // COMBINED PROMPT: Review AND fix in one call - COMPREHENSIVE WITH EXPLICIT VERIFICATION
    const combinedPrompt = `Review this recipe for logical consistency. Check ALL fields and fix issues. For fields that are CORRECT, explicitly state why they don't need changes.

RECIPE:
${finalRecipeJson}

CHECKLIST - Review EVERY field:

1. INSTRUCTIONS: Flow, order, remove unnecessary steps, match cooking methods, clarify vague measurements.
2. INGREDIENTS: Must match instructions, measurements consistent, quantities logical.
3. EQUIPMENT: Must match cooking methods (e.g., oven for baking, skillet for stovetop).
4. SKILLS REQUIRED: Must match techniques in instructions (e.g., sautéing, baking, chopping).
5. OCCASION: Must be specific to recipe type (not generic "Weeknight" unless appropriate).
6. SEASONALITY: Must match ingredients/recipe type (not generic "All Season" unless appropriate).
7. DIETARY: Flags must match ingredients (dairyFree=false if contains cheese/milk).
8. ALLERGEN FLAGS: Must match actual ingredients.
9. MEASUREMENTS: Consistent between ingredients and instructions, specific (not vague).
10. NUTRITION: Values should be realistic for ingredients and servings.
11. SERVINGS: Should match ingredient quantities.
12. TIMES: Should match recipe complexity.
13. DIFFICULTY: Should match step count and techniques.

Return JSON:
{
  "review": {
    "issues": [
      {"field": "path", "severity": "critical|warning", "issue": "problem", "fixedValue": "fix"},
      {"field": "path", "severity": "verified", "issue": "Checked and verified correct - [reason why]", "fixedValue": "No change needed"}
    ],
    "reviewNotes": "Comprehensive summary: List ALL fields checked. For each field, state either: (1) What was fixed and why, OR (2) Why it was correct and didn't need changes. Be explicit about instructions, ingredients, equipment, skills, occasion, seasonality, dietary, allergen flags, measurements, nutrition, servings, times, difficulty - check them ALL."
  },
  "fixedRecipe": {/* COMPLETE fixed recipe */}
}

CRITICAL: In reviewNotes, explicitly state for EACH major field (instructions, ingredients, equipment, skills, occasion, seasonality, dietary, allergen flags, measurements, nutrition, servings, times, difficulty) whether it was changed and why, OR why it was correct and didn't need changes. Be thorough and explicit.`;

    // SINGLE COMBINED CALL: Review + Fix (saves time)
    // Try models in order: configured review model -> gpt-4o-mini -> gpt-3.5-turbo
    const fallbackModels = [this.reviewModel, 'gpt-4o-mini', 'gpt-3.5-turbo'];
    let completion;
    let lastError = null;
    
    for (const modelToTry of fallbackModels) {
      try {
        console.log(`🔄 Attempting review with model: ${modelToTry}`);
        completion = await Promise.race([
          this.openai.chat.completions.create({
            model: modelToTry,
            messages: [
              {
                role: 'system',
                content: 'You are a professional recipe reviewer and editor. Review recipes for issues and return both the review data and the complete corrected recipe. Return ONLY valid JSON.'
              },
              {
                role: 'user',
                content: combinedPrompt
              }
            ],
            temperature: 0.2, // Lower temperature for faster, more focused responses
            max_tokens: 4096 // Safe limit for most OpenAI models
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Review and fix step timed out after 55 seconds')), 55000) // Increased to 55s (5s buffer before Vercel 60s)
          )
        ]);
        console.log(`✅ Successfully used model: ${modelToTry}`);
        break; // Success, exit loop
      } catch (error) {
        lastError = error;
        // If it's a model not found error, try next fallback
        if (error.message && (error.message.includes('does not exist') || error.message.includes('404') || error.code === 'model_not_found')) {
          console.warn(`⚠️  Model ${modelToTry} not available, trying next fallback...`);
          continue; // Try next model
        }
        // If it's a timeout, break and handle below
        if (error.message && error.message.includes('timed out')) {
          break;
        }
        // For other errors, try next model
        console.warn(`⚠️  Error with model ${modelToTry}: ${error.message}, trying next fallback...`);
        continue;
      }
    }
    
    // If we exhausted all models or got a timeout
    if (!completion) {
      if (lastError && lastError.message && lastError.message.includes('timed out')) {
        console.error('⏱️  Review and fix step timed out:', lastError.message);
        console.warn('⚠️  Continuing with original recipe (review step skipped due to timeout)');
      } else {
        console.error('❌ All review models failed:', lastError?.message || 'Unknown error');
        console.warn('⚠️  Continuing with original recipe (review step skipped due to model errors)');
      }
      // Return original recipe with a note that review was skipped
      return {
        recipe: recipe,
        review: {
          issues: [],
          reviewNotes: lastError?.message?.includes('timed out') 
            ? 'Review step timed out - using original recipe without review'
            : `Review step failed - ${lastError?.message || 'Unknown error'}. Using original recipe without review`,
          timeout: lastError?.message?.includes('timed out') || false,
          error: lastError?.message || 'Unknown error'
        }
      };
    }

    const response = completion.choices[0].message.content.trim();
    console.log('\n📋 ChatGPT Review & Fix Response:');
    console.log('─'.repeat(45));
    console.log(response.substring(0, 1500) + (response.length > 1500 ? '...' : ''));
    console.log('─'.repeat(45));

    // Parse combined response
    const JSONRepair = require('../utils/JSONRepair');
    const result = JSONRepair.parseWithRepair(response);
    
    if (!result.success) {
      throw new Error('Failed to parse review and fix response');
    }

    const data = result.data;
    
    // Extract review data and fixed recipe
    const review = data.review || { issues: [], reviewNotes: 'No issues found' };
    const fixedRecipe = data.fixedRecipe || recipe; // Fallback to original if fix failed
    
    const criticalIssues = review.issues?.filter(i => i.severity === 'critical') || [];
    const warnings = review.issues?.filter(i => i.severity === 'warning') || [];
    const verified = review.issues?.filter(i => i.severity === 'verified') || [];
    
    console.log(`\n🔍 Review Summary:`);
    console.log(`   Critical issues: ${criticalIssues.length}`);
    console.log(`   Warnings: ${warnings.length}`);
    console.log(`   Verified (correct): ${verified.length}`);
    
    if (criticalIssues.length > 0) {
      console.log(`\n❌ Critical Issues:`);
      criticalIssues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue.field}: ${issue.issue}`);
        console.log(`      → Fixed: ${issue.fixedValue}`);
      });
    }
    
    if (warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      warnings.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue.field}: ${issue.issue}`);
        console.log(`      → Fixed: ${issue.fixedValue}`);
      });
    }
    
    if (verified.length > 0) {
      console.log(`\n✅ Verified (No Changes Needed):`);
      verified.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue.field}: ${issue.issue}`);
      });
    }
    
    if (review.reviewNotes) {
      console.log(`\n📝 Comprehensive Review Notes:`);
      console.log(`   ${review.reviewNotes}`);
    }
    
    // Merge with original to preserve any fields that might be missing
    const mergedRecipe = { ...recipe, ...fixedRecipe };
    
    console.log('\n✅ Recipe review completed');
    console.log(`   Fixed: ${criticalIssues.length} critical, ${warnings.length} warnings`);
    console.log(`   Verified: ${verified.length} fields checked and confirmed correct`);
    
    // Return both the fixed recipe and the review data
    return {
      recipe: mergedRecipe,
      review: {
        issues: review.issues || [],
        reviewNotes: review.reviewNotes,
        rawResponse: response // Single combined response
      }
    };
  }

  /**
   * Set recipe manager (for lazy initialization)
   */
  setRecipeManager(recipeManager) {
    if (!this.uniquenessManager) {
      this.uniquenessManager = new RecipeUniquenessManager(recipeManager);
      console.log('✅ RecipeUniquenessManager initialized (late binding)');
    }
  }

  /**
   * Generate recipe using multi-step process (RECOMMENDED for best quality)
   */
  async generateRecipeMultiStep(params = {}) {
    this.checkAvailability();
    
    if (!this.multiStepGenerator) {
      throw new Error('MultiStepRecipeGenerator not initialized');
    }
    
    console.log('🎯 Using MULTI-STEP generation for maximum accuracy');
    return await this.multiStepGenerator.generateRecipe(params);
  }

  // Read equipment list from Equipment.txt
  async getEquipmentList() {
    if (this.equipmentList) {
      return this.equipmentList;
    }
    
    try {
      const equipmentPath = path.join(__dirname, '../../Equipment.txt');
      const equipmentData = await fs.readFile(equipmentPath, 'utf8');
      this.equipmentList = equipmentData
        .split('\n')
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      console.log(`🔧 Loaded ${this.equipmentList.length} equipment items from Equipment.txt`);
      return this.equipmentList;
    } catch (error) {
      console.error('❌ Error reading Equipment.txt:', error.message);
      // Fallback to a basic equipment list
      this.equipmentList = [
        'Chef\'s knife', 'Cutting board', 'Frying pan', 'Saucepan', 'Mixing bowl',
        'Measuring cups', 'Measuring spoons', 'Spatula', 'Whisk', 'Tongs'
      ];
      return this.equipmentList;
    }
  }

  // Read ingredients list from clean_ingredients.txt
  async getIngredientsList() {
    if (this.ingredientsList) {
      return this.ingredientsList;
    }
    
    try {
      const ingredientsPath = path.join(__dirname, '../../clean_ingredients.txt');
      const ingredientsData = await fs.readFile(ingredientsPath, 'utf8');
      this.ingredientsList = ingredientsData
        .split('\n')
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      console.log(`🥕 Loaded ${this.ingredientsList.length} ingredients from clean_ingredients.txt`);
      return this.ingredientsList;
    } catch (error) {
      console.error('❌ Error reading clean_ingredients.txt:', error.message);
      // Fallback to a basic ingredients list
      this.ingredientsList = [
        'chicken', 'beef', 'pork', 'fish', 'eggs', 'milk', 'cheese', 'butter',
        'onion', 'garlic', 'tomato', 'carrot', 'potato', 'rice', 'pasta', 'bread',
        'salt', 'pepper', 'olive oil', 'flour'
      ];
      return this.ingredientsList;
    }
  }

  // Check if OpenAI is available
  checkAvailability() {
    if (!this.isAvailable) {
      throw new Error('OpenAI API key not configured. AI features are disabled.');
    }
  }

  // Build prompt from filter criteria
  buildFilterPrompt(filters) {
    const criteria = [];
    
    if (filters.categories && filters.categories.length > 0) {
      criteria.push(`Meal Category: ${filters.categories.join(' OR ')}`);
    }
    
    if (filters.dishTypes && filters.dishTypes.length > 0) {
      criteria.push(`Dish Type: ${filters.dishTypes.join(' OR ')}`);
    }
    
    if (filters.cuisines && filters.cuisines.length > 0) {
      criteria.push(`Cuisine: ${filters.cuisines.join(' OR ')}`);
    }
    
    if (filters.dietary && filters.dietary.length > 0) {
      criteria.push(`Dietary Requirements: ${filters.dietary.join(' AND ')}`);
    }
    
    if (filters.difficulty && filters.difficulty.length > 0) {
      criteria.push(`Difficulty Level: ${filters.difficulty.join(' OR ')}`);
    }
    
    if (criteria.length === 0) {
      return 'Create a random, creative recipe.';
    }
    
    return `Create a recipe that meets these specific criteria:
${criteria.map(c => `- ${c}`).join('\n')}

The recipe MUST match ALL specified criteria where possible. Be creative within these constraints.`;
  }

  // Generate a complete recipe based on input parameters (OPTIMIZED SINGLE-STEP)
  async generateRecipe(params = {}) {
    this.checkAvailability();
    
    console.log('🚀 Starting OPTIMIZED single-step recipe generation...');
    return this.generateOptimizedRecipe(params);
  }

  /**
   * Generate a unique recipe with duplicate checking and retries
   * This is the RECOMMENDED method for all recipe generation
   */
  async generateUniqueRecipe(params = {}, maxRetries = 3) {
    this.checkAvailability();

    console.log('\n🎨 ═══════════════════════════════════════════');
    console.log('🎨 UNIQUE RECIPE GENERATION WITH FILTERS');
    console.log('═══════════════════════════════════════════');
    console.log('📋 Parameters:', JSON.stringify(params, null, 2));
    console.log(`🔄 Max retries: ${maxRetries}`);
    console.log(`🎯 Using ${params.useMultiStep ? 'MULTI-STEP' : 'SINGLE-STEP'} generation`);
    console.log('═══════════════════════════════════════════\n');

    // Build anti-duplicate context
    let antiDuplicateContext = '';
    if (this.uniquenessManager) {
      antiDuplicateContext = await this.uniquenessManager.buildAntiDuplicateContext(params.filters);
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`\n🔄 ATTEMPT ${attempt}/${maxRetries}`);
      console.log('─'.repeat(45));

      try {
        let recipe;
        
        // Choose generation method
        if (params.useMultiStep && this.multiStepGenerator) {
          // Multi-step generation (4 API calls, higher quality)
          console.log('🎯 Using MULTI-STEP generation (4 AI calls)');
          recipe = await this.multiStepGenerator.generateRecipe(params);
        } else {
          // Single-step generation (1 API call, faster)
          console.log('⚡ Using SINGLE-STEP generation (1 AI call)');
          const enhancedParams = {
            ...params,
            antiDuplicateContext,
            attempt
          };
          recipe = await this.generateOptimizedRecipe(enhancedParams);
        }
        
        if (!recipe || !recipe.strMeal) {
          console.log(`❌ Attempt ${attempt}: No recipe generated`);
          continue;
        }

        console.log(`✅ Generated: "${recipe.strMeal}"`);

        // VALIDATION DISABLED - Skip validation during recipe generation
        // Validation can be re-enabled later if needed
        // const validation = RecipeValidator.validate(recipe);
        
        // Log recipe (validation disabled)
        console.log('\n✅ ═══════════════════════════════════════════');
        console.log('✅ RECIPE GENERATED (Validation Disabled)');
        console.log('═══════════════════════════════════════════');
        console.log('\n📋 Recipe Data:');
        console.log(JSON.stringify(recipe, null, 2));
        console.log('═══════════════════════════════════════════\n');

        // Check for duplicates
        if (this.uniquenessManager) {
          const ingredients = [];
          for (let i = 1; i <= 20; i++) {
            if (recipe[`strIngredient${i}`] && recipe[`strIngredient${i}`].trim()) {
              ingredients.push(recipe[`strIngredient${i}`]);
            }
          }

          const duplicateCheck = await this.uniquenessManager.isDuplicate(
            recipe.strMeal,
            { ingredients }
          );

          if (duplicateCheck.isDuplicate) {
            console.log(`🔄 Attempt ${attempt}: Duplicate detected - ${duplicateCheck.reason}`);
            console.log(`   Conflicting with: "${duplicateCheck.existingRecipe.strMeal}"`);
            
            if (attempt < maxRetries) {
              console.log(`   Retrying with more specific constraints...\n`);
              // Add the duplicate to the anti-duplicate context for next attempt
              antiDuplicateContext += `\n❌ JUST TRIED AND REJECTED: "${recipe.strMeal}" - Generate something COMPLETELY DIFFERENT!\n`;
              continue;
            } else {
              console.log(`   ⚠️ Max retries reached. Returning duplicate with warning.\n`);
              return {
                ...recipe,
                _isDuplicate: true,
                _duplicateReason: duplicateCheck.reason,
                _duplicateOf: duplicateCheck.existingRecipe.strMeal
              };
            }
          }
        }

        // Review and fix recipe with ChatGPT (OPTIONAL - disabled by default to avoid timeouts)
        let reviewData = null;
        if (params.enableReviewAndFix === true) {
          console.log('\n🔍 ═══════════════════════════════════════════');
          console.log('🔍 REVIEW AND FIX STEP');
          console.log('═══════════════════════════════════════════');
          try {
            const reviewResult = await this.reviewAndFixRecipe(recipe, params);
            // reviewResult contains { recipe, review }
            recipe = reviewResult.recipe;
            reviewData = reviewResult.review;
            console.log('✅ Recipe reviewed and fixed by ChatGPT');
            console.log(`   Found ${reviewData.issues?.length || 0} issues, all fixed`);
          } catch (reviewError) {
            console.error('⚠️  Review step failed, using original recipe:', reviewError.message);
            // Continue with original recipe if review fails
          }
          console.log('═══════════════════════════════════════════\n');
        }

        // Log final recipe before returning
        console.log('\n🎉 ═══════════════════════════════════════════');
        console.log('🎉 FINAL RECIPE (Ready to Save)');
        console.log('═══════════════════════════════════════════');
        console.log(JSON.stringify(recipe, null, 2));
        console.log('═══════════════════════════════════════════\n');
        
        console.log(`\n✅ SUCCESS: Unique recipe generated!`);
        console.log(`═══════════════════════════════════════════\n`);
        
        // Return recipe with review data if available
        if (reviewData) {
          return { ...recipe, _review: reviewData };
        }
        return recipe;

      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          console.log(`═══════════════════════════════════════════\n`);
          throw new Error(`Failed to generate unique recipe after ${maxRetries} attempts: ${error.message}`);
        }
      }
    }

    throw new Error('Failed to generate unique recipe');
  }

  // Original single-step generation as fallback
  async generateRecipeSingleStep(params = {}) {
    this.checkAvailability();
    try {
      console.log('🤖 Starting CONTEXT-AWARE AI recipe generation...');

      // Log API key status (masked for security)
      const apiKeyMasked = process.env.OPENAI_API_KEY ? 
        `${process.env.OPENAI_API_KEY.substring(0, 7)}...${process.env.OPENAI_API_KEY.slice(-4)}` : 
        'NOT_SET';
      console.log('🔑 OpenAI API Key status:', apiKeyMasked);
      console.log('🤖 Using model:', this.model);
      console.log('🧠 Generation params:', JSON.stringify(params, null, 2));
      
      // Get existing recipes for context if requested
      let existingContext = '';
      if (params.includeExistingContext) {
        try {
          existingContext = await this.getExistingRecipesContext();
          console.log('📚 Retrieved existing recipes context for variety');
        } catch (error) {
          console.warn('⚠️ Could not get existing recipes context:', error.message);
        }
      }

      // Handle different generation modes
      let comprehensivePrompt;
      
      if (params.mode === 'filtered' && params.filters) {
        // Filtered generation mode
        console.log('🎯 Using FILTERED generation mode');
        const filterPrompt = this.buildFilterPrompt(params.filters);
        comprehensivePrompt = `${existingContext}

${filterPrompt}

Generate a HIGHLY DETAILED recipe that matches the specified criteria with:
1. VERY DETAILED step-by-step instructions (minimum 7-10 steps) explaining techniques, temperatures, timing, and what to look for
2. COMPLETE list of cooking equipment/instruments with sizes (e.g., "12-inch skillet", "8-inch chef's knife")
3. Make it creative and unique

${existingContext ? 'IMPORTANT: Create something different from the existing recipes to add variety to our collection.' : ''}

🚨 CRITICAL: ALL fields must have realistic values (no zeros, empty strings, or N/A):
- strDescription: 2-3 appetizing sentences
- Times: Calculate REALISTIC prep/cook/total minutes based on THIS SPECIFIC RECIPE's complexity, ingredients, and cooking methods (never 0, never generic defaults)
  * Count actual prep steps (chopping, mixing, etc.) to determine prepTime
  * Count actual cooking steps and methods (baking, simmering, etc.) to determine cookTime
  * totalTime = prepTime + cookTime
  * Example: Simple salad = 10min prep, 0min cook. Complex stew = 30min prep, 90min cook.
- servingSize: specify portion like "1 cup", "2 slices"
- yield: Calculate based on THIS RECIPE - specify output like "4 servings", "12 cookies", "2 portions"
- numberOfServings: MANDATORY CALCULATION from ACTUAL ingredient quantities
  🚨 CALCULATION PROCESS (DO THIS):
  STEP 1: List all ingredient quantities (e.g., "2 cups flour", "4 eggs", "1 cup milk")
  STEP 2: Estimate total volume/weight of finished dish
  STEP 3: Divide by typical serving size (300-400ml for main dishes, 150-200ml for sides)
  STEP 4: Round to reasonable number (2, 4, 6, 8 servings)
  
  EXAMPLE: 2 cups flour + 4 eggs + 1 cup milk = ~1200ml total = ~4 servings (300ml each)
  EXAMPLE: 1 lb pasta (450g) + 2 cups sauce (480ml) = ~4 servings
  
  ❌ WRONG: Using "4 servings" because it's a main dish
  ✅ CORRECT: Calculating from actual ingredient volumes/weights
- nutrition: realistic numbers based on ingredients (NEVER use 0 for calories/protein/carbs/fat - calculate based on actual ingredients!)
- dietary: Analyze ACTUAL ingredients and set flags appropriately (vegetarian, vegan, pescatarian, glutenFree, dairyFree, keto, paleo, halal, noRedMeat, noPork, noShellfish, omnivore)
- dishType: specify appropriate type based on the recipe (Appetizer, Soup, Salad, Main Course, Side Dish, Dessert, etc.)
- difficulty: Calculate from recipe complexity - count steps, techniques, ingredient count, equipment needed
  * Easy: <15 steps, simple techniques, <8 ingredients
  * Medium: 15-25 steps, moderate techniques, 8-12 ingredients
  * Hard: >25 steps, advanced techniques, >12 ingredients
- occasion: Determine from recipe type/ingredients (Weeknight, Weekend, Holiday, Date Night, Party, etc.) - NOT default "Weeknight"
- seasonality: Determine from ingredients (Spring, Summer, Fall, Winter, All Season) - analyze actual ingredients, NOT default "All Season"
- skillsRequired: Extract from actual cooking techniques in instructions (Chopping, Baking, Grilling, Sautéing, etc.) - NOT default ["Chopping", "Cooking"]
- Arrays: all must have at least 1-2 items

🔥 INSTRUCTIONS MUST BE ULTRA-DETAILED (FLEXIBLE STEP COUNT BASED ON COMPLEXITY):
- BREAK DOWN EVERY SINGLE ACTION into separate detailed steps (NEVER combine multiple actions)
- EVERY step must include specific temperatures, exact times, and precise techniques
- Include exact visual cues (golden brown, bubbling, tender when pierced)
- Mention specific cooking sounds, smells, and textures to watch for
- Explain WHY each step is important (develops flavor, ensures doneness)
- Include troubleshooting tips (if this happens, do this)
- Specify exact pan sizes, heat levels, and timing
- Detail ALL prep work separately (washing technique, peeling method, cutting size, arrangement)
- Include resting times, temperature checks, doneness indicators, and food safety measures
- Add professional chef tips, advanced techniques, and kitchen organization advice for each step
- Mention equipment positioning, ingredient preparation sequence, and workspace management
- Include safety precautions, proper handling techniques, and storage instructions where needed
- Add sensory descriptions (what to smell, hear, see, feel) at each critical stage
- Instructions: MUST be an ARRAY with 10-40 separate items (depending on complexity), each item is ONE complete step
- CRITICAL: Return instructions as an ARRAY: ["Step 1: first step", "Step 2: second step", "Step 3: third step"] NOT as a string: "first step. second step. third step"
- CRITICAL: Each array item is a SEPARATE step - do NOT combine multiple steps into one string
- CRITICAL: Include "Step 1:", "Step 2:", etc. in each instruction text for clarity
- Example CORRECT format (stovetop): ["Step 1: Begin by washing vegetables", "Step 2: Heat cooking vessel over medium heat", "Step 3: Add oil to pan"]
- Example CORRECT format (oven): ["Step 1: Begin by preparing ingredients", "Step 2: Preheat oven to 375°F", "Step 3: Prepare baking dish"]
- Example CORRECT format (raw/no-cook): ["Step 1: Wash and prepare vegetables", "Step 2: Combine ingredients in bowl", "Step 3: Toss and season"]
- Example WRONG format: "Begin by washing vegetables. Heat skillet. Add oil." (this is a string, not an array!)

🚨 CRITICAL: INSTRUCTION LOGIC RULES - FOLLOW THESE EXACTLY:
- ONLY include steps that are ACTUALLY NEEDED for this specific recipe
- If recipe uses OVEN/BAKING: Include preheating step early (Step 1-3)
- If recipe is STOVETOP ONLY (pan-fried, sautéed, boiled, steamed, etc.): Do NOT include oven preheating - start with actual prep/cooking steps
- If recipe is RAW/NO-COOK (salads, ceviche, sushi, etc.): Start with prep steps, no heating steps
- Do NOT add unnecessary steps just to fill space - every step must serve a purpose
- Match steps to the equipment actually selected - if no oven equipment, no oven steps!

🥄 INGREDIENTS MUST BE ULTRA-SPECIFIC WITH MAXIMUM DETAIL:
- Include exact measurements with alternatives (1 cup = 240ml)
- Specify preparation method (diced small 1/4-inch, julienned thin)
- Include quality indicators (ripe, fresh, room temperature)
- Mention substitutions where applicable (or 2 tsp dried herbs)
- For proteins: specify cut, grade, or type (boneless skinless, 85% lean)
- For produce: specify ripeness level, size, variety, and preparation state (medium yellow onion, peeled and quartered)
- Include storage and handling notes (refrigerated until use, brought to room temperature)
- Add ingredient-specific tips (choose heavy fruits, avoid soft spots, select bright green herbs)
- Mention texture and quality indicators for each ingredient
- Include seasonal availability and freshness markers where applicable
- 🥗 DIETARY ANALYSIS: Analyze ingredients and set dietary flags appropriately:
  * vegetarian: true if no meat, fish, or animal products (except dairy/eggs)
  * vegan: true if no animal products whatsoever (no meat, fish, dairy, eggs, honey)
  * pescatarian: true if contains fish but no other meat
  * keto: true if very low carb (under 10g carbs per serving)
  * lowCarb: true if moderate low carb (under 30g carbs per serving)
  * highProtein: true if over 25g protein per serving
  * glutenFree: true if no wheat, barley, rye, or gluten-containing ingredients
  * dairyFree: true if no milk, cheese, butter, cream, or dairy products
  * nutFree: true if no nuts or nut products
  * lowSodium: true if under 600mg sodium per serving
  * lowSugar: true if under 10g sugar per serving
  * mediterraneanDiet: true if uses olive oil, fish, vegetables, herbs typical of Mediterranean cuisine
- 🚨 ONLY use ingredients from this EXACT list (match names precisely): abalone, acai berry, ackee, acorn squash, active dry yeast, adzuki beans, agar agar, agave nectar, aioli, aleppo pepper, alfalfa sprouts, alfredo sauce, all-purpose flour, allspice, almond butter, almond extract, almond flour, almond milk, almond paste, almonds, anchovies, Anchovy Paste, andouille sausage, anise seeds, annatto, apple, apple butter, applesauce, apricot, apricot jam, arborio rice, Arrowroot powder, artichoke, asafoetida, asiago cheese, Asian Pear, asparagus, avocado, bacon, Baguette, baking powder, baking soda, balsamic vinegar, banana, banana blossom, barbecue sauce, barley, barley flour, basil, basil seeds, Basmati Rice, Bay Leaf, beef, Beef Bourguignon, beef brisket, beef broth, Beef Ribs, beef stock, beef tenderloin, beets, Belacan (shrimp paste), bell pepper, bell peppers, besan (chickpea flour), black beans, black cardamom, black fungus (cloud ear), Black Garlic, Black Pepper, Black Peppercorns, black salt (kala namak), Black Tea, black truffle, Black-Eyed Peas, Blood Sausage, blue cheese, blue cheese dressing, blueberry, bok choy, Bonito Flakes, bourbon, Brandy, Bread, bread flour, Breadcrumbs, Breakfast Sausage, Brie, Broccoli, Broccolini, Brown Mustard Seeds, brown rice, brown sugar, brownie mix, brussels sprouts, buckwheat, buckwheat flour, bulgur, burdock root, butter, butter lettuce, buttermilk, buttermilk powder, butternut squash, cabbage, Cacao Nibs, Cactus Pear (Prickly Pear), Cajun Seasoning, Calamari (Squid), camembert, candied ginger, candied orange peel, candlenut, cane vinegar, canned salmon, canned tomatoes, canned tuna, cannellini beans, Caper Berries, Capers, Caramel Sauce, caraway seeds, carne asada, carolina reaper, carrot, cashew butter, cashew milk, cashews, cassava, catfish, cauliflower, cayenne pepper, celery, celery root (celeriac), champagne vinegar, chana dal, chanterelle mushrooms, char siu sauce, cheddar cheese, cheese, cheese curds, cherry, cherry tomato, chervil, chickpeas, chili oil, chili paste, chili powder, chili sauce, Chinese five-spice, chipotle chili powder, chives, chocolate chips, chocolate hazelnut spread, chocolate syrup, cider, cilantro, cinnamon, cinnamon stick, clam juice, clams, clarified butter, clotted cream, cloves, cocoa powder, coconut, coconut aminos, coconut cream, coconut milk, coconut oil, coconut sugar, coconut vinegar, cod, coffee, cognac, collard greens, condensed milk, coriander seeds, corn, corn flakes, corn oil, corn syrup, corn tortillas, corned beef, cornmeal, cotija cheese, cottage cheese, crab, crab meat, cranberries, cream cheese, cream of coconut, cream of tartar, crème fraîche, cremebrule, cremini mushrooms, cucumber, cumin seeds, curly parsley, currants, curry leaves, curry paste, curry powder, daikon radish, dashi, dates, demi-glace, diced tomatoes, dijon mustard, dill, dill seeds, dried apricots, dried cranberries, dried figs, dried hibiscus, dried shrimp, dried thyme, dry mustard powder, duck, duck eggs, duck fat, duck sauce, dulce de leche, edam cheese, edamame, egg noodles, egg whites, egg yolks, eggplant, eggs, egusi seeds, elderberry, empanadas, enoki mushrooms, espresso powder, evaporated milk, extra virgin olive oil, fava beans, fennel bulb, fennel seeds, fenugreek leaves, fenugreek seeds, fermented black beans, filé powder, fish maw, fish sauce, five-spice powder, flaxseeds, flour tortillas, fontina cheese, forbidden rice (black rice), freekeh, freeze-dried fruit, french dressing, fried onions, frosting, fruit cocktail (canned), garam masala, garlic, garlic chives, garlic powder, garlic scapes, gelatin, gin, ginger, ginger paste, ginger powder, gingersnaps (crushed), glucose syrup, glutinous rice (sticky rice), goat, goat cheese, gochugaru (Korean chili flakes), gochujang, salmon, salt, spaghetti, Spaghetti Carbonara, spinach, sugar, sushi, tiramisu

Return ONLY this CLEAN JSON format with NO extra text (MODERN ARRAYS ONLY):
{
  "strMeal": "Creative Recipe Name",
  "strCategory": "Meal type (Breakfast, Brunch, Lunch, Dinner, Snack, Dessert)",
  "strArea": "Cuisine type (Italian, Mexican, Asian, etc)",
  "strDescription": "Brief appetizing 2-3 sentence description",
  "strTags": "tag1,tag2,tag3",
  "strMealThumb": "",
  "prepTime": 20,
  "cookTime": 30,
  "totalTime": 50,
  "numberOfServings": 4,
  "servingSize": "1 serving",
  "difficulty": "Easy/Medium/Hard",
  "instructions": [
    "Step 1: Begin by preparing all ingredients - wash, chop, and measure everything needed",
    "Step 2: [CONDITIONAL - Only if stovetop cooking] Heat your cooking vessel over appropriate heat for 3-4 minutes until properly heated",
    "Step 2: [CONDITIONAL - Only if oven baking] Preheat oven to specified temperature",
    "Step 2: [CONDITIONAL - Only if raw/no-cook] Continue with prep steps - no heating needed",
    "Step 3: Add oil/ingredients and cook with specific temperatures and timing, OR [if baking] prepare baking vessel, OR [if raw] combine ingredients",
    "Step 4: Continue with remaining comprehensive steps appropriate for this recipe's complexity (8-40 steps total), each as a separate array item",
    "Step 5: Each step should be detailed and complete with 'Step X:' prefix"
  ],
  "ingredientsDetailed": [
    {"name": "Ingredient name", "quantity": "2", "unit": "cups", "optional": false, "required": true},
    {"name": "Second ingredient", "quantity": "1", "unit": "tsp", "optional": false, "required": true}
  ],
  "equipmentRequired": ["Appropriate cooking vessel (skillet/pan/oven/bowl based on recipe)", "Chef's knife", "Cutting board", "Measuring cups/spoons"],
  "dietary": {
    "vegetarian": false,
    "vegan": false,
    "pescatarian": false,
    "keto": false,
    "lowCarb": false,
    "highProtein": false,
    "glutenFree": false,
    "dairyFree": false,
    "nutFree": false,
    "lowSodium": false,
    "lowSugar": false,
    "mediterraneanDiet": false
  }
}`;
      } else {
        // Random mode - generate creative diverse recipe
        console.log('🎲 Using RANDOM mode with variety');
        
        const cuisines = ['Italian', 'Mexican', 'Asian', 'Mediterranean', 'Indian', 'French', 'American', 'Japanese', 'Thai', 'Greek', 'Chinese', 'Korean', 'Vietnamese', 'Middle Eastern', 'British', 'German', 'Brazilian', 'Moroccan'];
        const categories = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
        const themes = ['healthy', 'comfort food', 'spicy', 'fresh', 'hearty', 'light', 'creative fusion', 'traditional', 'modern twist'];
        const mealTypes = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
        const dishTypes = ['Appetizers', 'Side Dishes', 'Main Courses', 'Soups', 'Salads', 'Sandwiches & Wraps', 'Burgers', 'Pizza & Flatbreads', 'Pasta & Noodles', 'Rice Dishes', 'Tacos, Burritos & Quesadillas', 'Stir-Fries', 'Curries', 'Stews & Casseroles', 'Skillet & One-Pan Meals', 'Slow Cooker / Instant Pot', 'Grilling / BBQ', 'Baked Goods', 'Pastries', 'Cookies & Bars', 'Pies & Cobblers', 'Frozen Treats', 'Pancakes & Waffles', 'Dips & Spreads', 'Bowls', 'Drinks & Smoothies', 'Breads', 'Meal Prep', 'Boards & Platters', 'Protein Dishes', 'Cakes & Cupcakes'];
        const dietaryOptions = ['Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Low-Carb', 'High-Protein', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Low-Sodium', 'Low-Sugar', 'Mediterranean Diet'];
        
        const randomCuisine = cuisines[Math.floor(Math.random() * cuisines.length)];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];
        const randomMealType = mealTypes[Math.floor(Math.random() * mealTypes.length)];
        const randomDishType = dishTypes[Math.floor(Math.random() * dishTypes.length)];
        const randomDietary = dietaryOptions[Math.floor(Math.random() * dietaryOptions.length)];
        
        comprehensivePrompt = `${existingContext}

Generate a creative ${randomTheme} ${randomCuisine} ${randomCategory} recipe that would be unique and interesting.
This should be a ${randomMealType} recipe that fits the ${randomDishType} category and has ${randomDietary} dietary characteristics.
${existingContext ? 'IMPORTANT: Create something completely different from the existing recipes listed above to ensure variety and innovation in our collection.' : ''}

Make it innovative and delicious. Use unexpected flavor combinations or techniques that align with the specified meal type, dish type, and dietary requirements.

🚨 CRITICAL: ALL fields must have realistic values (no zeros, empty strings, or N/A):
- strDescription: 2-3 appetizing sentences
- Times: realistic prep/cook/total minutes (never 0)  
- servingSize: specify portion like "1 cup", "2 slices"
- yield: specify output like "4 servings", "12 cookies"
- nutrition: realistic numbers based on ingredients
- mealType: MUST include "${randomMealType}" and can include additional appropriate meal times
- dishType: MUST be "${randomDishType}" or closest appropriate match
- dietary: Set appropriate true/false values with emphasis on ${randomDietary} characteristics
- Arrays: all must have at least 1-2 items

🔥 INSTRUCTIONS MUST BE ULTRA-DETAILED (FLEXIBLE STEP COUNT BASED ON COMPLEXITY):
- BREAK DOWN EVERY SINGLE ACTION into separate detailed steps (NEVER combine multiple actions)
- EVERY step must include specific temperatures, exact times, and precise techniques
- Include exact visual cues (golden brown, bubbling, tender when pierced)
- Mention specific cooking sounds, smells, and textures to watch for
- Explain WHY each step is important (develops flavor, ensures doneness)
- Include troubleshooting tips (if this happens, do this)
- Specify exact pan sizes, heat levels, and timing
- Detail ALL prep work separately (washing technique, peeling method, cutting size, arrangement)
- Include resting times, temperature checks, doneness indicators, and food safety measures
- Add professional chef tips, advanced techniques, and kitchen organization advice for each step
- Mention equipment positioning, ingredient preparation sequence, and workspace management
- Include safety precautions, proper handling techniques, and storage instructions where needed
- Add sensory descriptions (what to smell, hear, see, feel) at each critical stage
- Instructions: MUST be an ARRAY with 10-40 separate items (depending on complexity), each item is ONE complete step
- CRITICAL: Return instructions as an ARRAY: ["Step 1: first step", "Step 2: second step", "Step 3: third step"] NOT as a string: "first step. second step. third step"
- CRITICAL: Each array item is a SEPARATE step - do NOT combine multiple steps into one string
- CRITICAL: Include "Step 1:", "Step 2:", etc. in each instruction text for clarity
- Example CORRECT format (stovetop): ["Step 1: Begin by washing vegetables", "Step 2: Heat cooking vessel over medium heat", "Step 3: Add oil to pan"]
- Example CORRECT format (oven): ["Step 1: Begin by preparing ingredients", "Step 2: Preheat oven to 375°F", "Step 3: Prepare baking dish"]
- Example CORRECT format (raw/no-cook): ["Step 1: Wash and prepare vegetables", "Step 2: Combine ingredients in bowl", "Step 3: Toss and season"]
- Example WRONG format: "Begin by washing vegetables. Heat skillet. Add oil." (this is a string, not an array!)

🚨 CRITICAL: INSTRUCTION LOGIC RULES - FOLLOW THESE EXACTLY:
- ONLY include steps that are ACTUALLY NEEDED for this specific recipe
- If recipe uses OVEN/BAKING: Include preheating step early (Step 1-3)
- If recipe is STOVETOP ONLY (pan-fried, sautéed, boiled, steamed, etc.): Do NOT include oven preheating - start with actual prep/cooking steps
- If recipe is RAW/NO-COOK (salads, ceviche, sushi, etc.): Start with prep steps, no heating steps
- Do NOT add unnecessary steps just to fill space - every step must serve a purpose
- Match steps to the equipment actually selected - if no oven equipment, no oven steps!

🥄 INGREDIENTS MUST BE ULTRA-SPECIFIC WITH MAXIMUM DETAIL:
- Include exact measurements with alternatives (1 cup = 240ml)
- Specify preparation method (diced small 1/4-inch, julienned thin)
- Include quality indicators (ripe, fresh, room temperature)
- Mention substitutions where applicable (or 2 tsp dried herbs)
- For proteins: specify cut, grade, or type (boneless skinless, 85% lean)
- For produce: specify ripeness level, size, variety, and preparation state (medium yellow onion, peeled and quartered)
- Include storage and handling notes (refrigerated until use, brought to room temperature)
- Add ingredient-specific tips (choose heavy fruits, avoid soft spots, select bright green herbs)
- Mention texture and quality indicators for each ingredient
- Include seasonal availability and freshness markers where applicable

Return ONLY this JSON format with NO extra text:
{
  "strMeal": "Creative Recipe Name",
  "strDescription": "Brief appetizing description of the dish (2-3 sentences)",
  "strCategory": "${randomCategory}",
  "strArea": "${randomCuisine}",
  "instructions": [
    "Preheat your oven to 375°F (190°C) and position the rack in the center. Line a 12-cup muffin tin with paper liners or grease thoroughly with butter, ensuring no spots are missed to prevent sticking.",
    "Prep all ingredients: Dice 8 strips of thick-cut bacon into 1/4-inch pieces (about 1 cup total). Crack 8 large eggs into a large mixing bowl and whisk vigorously for 30 seconds until completely smooth with no streaks.",
    "Heat a large 12-inch skillet over medium heat (setting 5 out of 10). Add diced bacon and cook for 6-8 minutes, stirring every 2 minutes with a wooden spoon. You'll hear gentle sizzling - not violent spattering. Cook until edges are golden brown and fat is rendered but bacon is still slightly chewy, not crispy.",
    "Remove bacon with slotted spoon to paper towel-lined plate, leaving 2 tablespoons of fat in pan (discard excess). The fat should be golden and fragrant, not dark or burned.",
    "Season whisked eggs with 1/2 teaspoon kosher salt and 1/4 teaspoon freshly ground black pepper. Add any additional seasonings like garlic powder or herbs at this stage.",
    "Divide cooked bacon evenly among 12 muffin cups (about 1 tablespoon per cup). Pour egg mixture over bacon, filling each cup about 3/4 full - they will puff during baking.",
    "Bake for 18-22 minutes until tops are set and lightly golden. Centers should no longer jiggle when gently shaken. A toothpick inserted in center should come out with just a few moist crumbs.",
    "Cool in pan for 5 minutes before removing - this prevents breaking. Run a knife around edges if needed.",
    "Serve immediately while warm, or cool completely and refrigerate up to 4 days for meal prep."
  ],
  "strMealThumb": "",
  "strTags": "${randomTheme},${randomCuisine.toLowerCase()},${randomCategory.toLowerCase()}",
  "prepTime": 15,
  "cookTime": 30,
  "totalTime": 45,
  "numberOfServings": 4,
  "servingSize": "1 cup",
  "difficulty": "Medium",
  "yield": "4 servings",
  "nutrition": {
    "caloriesPerServing": 420,
    "protein": 28,
    "carbs": 38,
    "fat": 15,
    "fiber": 7,
    "sugar": 6,
    "sodium": 750,
    "cholesterol": 55,
    "saturatedFat": 5,
    "vitaminA": 18,
    "vitaminC": 30,
    "iron": 15,
    "calcium": 12
  },
  "dietary": {
    "vegetarian": true,
    "vegan": false,
    "pescatarian": false,
    "glutenFree": false,
    "dairyFree": false,
    "keto": false,
    "paleo": true,
    "halal": true,
    "noRedMeat": false,
    "noPork": true,
    "noShellfish": true,
    "omnivore": false
  },
  "mealType": ["${randomMealType}"],
  "dishType": "${randomDishType}",
  "mainIngredient": "chicken",
  "occasion": ["Weeknight", "Family Dinner", "Date Night"],
  "seasonality": ["Fall", "Winter"],
  "equipmentRequired": ["Chef's knife", "Cutting board", "Large mixing bowl", "Measuring cups", "Frying pan", "Spatula (rubber)", "Tongs", "Timer"],
  "skillsRequired": ["Chopping", "Sautéing", "Seasoning", "Pan-frying", "Timing"],
  "keywords": ["comfort food", "hearty", "flavorful", "easy weeknight", "family-friendly", "one-pan"],
  "allergenFlags": ["dairy", "gluten", "eggs"],
  "timeCategory": "30-60 mins",
  "ingredientsDetailed": [
    {"name": "Thick-cut bacon (applewood smoked preferred)", "quantity": "8", "unit": "slices (about 8 oz/225g)", "optional": false, "required": true},
    {"name": "Large eggs (room temperature, free-range preferred)", "quantity": "8", "unit": "eggs (about 1 lb/450g total)", "optional": false, "required": true},
    {"name": "Kosher salt (Diamond Crystal brand)", "quantity": "1/2", "unit": "teaspoon (3g)", "optional": false, "required": true},
    {"name": "Fresh ground black pepper", "quantity": "1/4", "unit": "teaspoon (0.5g)", "optional": false, "required": true},
    {"name": "Unsalted butter (for greasing)", "quantity": "2", "unit": "tablespoons (28g)", "optional": false, "required": true},
    {"name": "Fresh chives (finely chopped)", "quantity": "2", "unit": "tablespoons (6g)", "optional": true, "required": false}
  ]
}

🚨 FINAL CHECK: Before responding, verify EVERY field has realistic values:
- NO zeros, empty strings, or N/A values
- ALL nutrition values are realistic numbers
- ALL arrays have at least one item
- ALL times are realistic (prep: 10-45 mins, cook: 15-120 mins)
- strDescription is 2-3 complete sentences
- servingSize specifies portion (like "1 cup", "2 slices")
- yield specifies output (like "4 servings", "12 cookies")`;
      }

      console.log('📝 Using comprehensive prompt for complete recipe data...');

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Use faster model
        messages: [
          {
            role: 'system',
            content: 'You are a professional chef. Generate complete, detailed recipes with ALL fields filled. NEVER use N/A, TBD, or placeholder text. Return only valid JSON.'
          },
          {
            role: 'user',
            content: comprehensivePrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000 // Increased to prevent JSON truncation
      });

      console.log('✅ OpenAI API call successful, processing response...');
      
      // Validate OpenAI response structure
      if (!completion || !completion.choices || !completion.choices[0]) {
        throw new Error('Invalid OpenAI response: No choices returned');
      }
      
      if (!completion.choices[0].message || !completion.choices[0].message.content) {
        throw new Error('Invalid OpenAI response: No message content');
      }
      
      // Log the raw AI response (FULL response)
      const rawResponse = completion.choices[0].message.content;
      console.log('\n📥 ═══════════════════════════════════════════');
      console.log('📥 RAW AI RESPONSE (FULL)');
      console.log('═══════════════════════════════════════════');
      console.log(`📏 Total length: ${rawResponse.length} characters`);
      console.log('═══════════════════════════════════════════');
      console.log(rawResponse);
      console.log('═══════════════════════════════════════════\n');
      
      const recipeData = this.parseAIResponse(rawResponse);
      
      // Log the parsed recipe (after JSON parsing)
      console.log('\n📦 ═══════════════════════════════════════════');
      console.log('📦 PARSED RECIPE (After JSON Parsing)');
      console.log('═══════════════════════════════════════════');
      console.log(JSON.stringify(recipeData, null, 2));
      console.log('═══════════════════════════════════════════\n');
      
      // Simple formatting - fill missing slots immediately
      const formattedRecipe = await this.quickFormatRecipe(recipeData, params);
      
      // Log the formatted recipe (after quickFormatRecipe)
      console.log('\n✨ ═══════════════════════════════════════════');
      console.log('✨ FORMATTED RECIPE (After quickFormatRecipe)');
      console.log('═══════════════════════════════════════════');
      console.log(JSON.stringify(formattedRecipe, null, 2));
      console.log('═══════════════════════════════════════════\n');
      
      console.log('✅ Recipe generation completed successfully');
      return formattedRecipe;
    } catch (error) {
      console.error('❌ Recipe generation error:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // Provide more specific error messages
      if (error.message?.includes('API key') || error.message?.includes('Incorrect API key')) {
        throw new Error('OpenAI API key is missing or invalid. Please check your environment variables.');
      } else if (error.message?.includes('insufficient_quota') || error.message?.includes('quota')) {
        throw new Error('OpenAI API quota exceeded. Please check your OpenAI account billing.');
      } else if (error.message?.includes('rate_limit') || error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Network error: Unable to connect to OpenAI API. Please check your internet connection.');
      } else if (error.status === 401) {
        throw new Error('OpenAI API authentication failed. Please check your API key.');
      } else if (error.status === 400) {
        throw new Error('Invalid request to OpenAI API. Please check your configuration.');
      } else {
        throw new Error(`Recipe generation failed: ${error.message}`);
      }
    }
  }

  // Robust JSON parsing with error handling and cleanup using JSONRepair
  parseAIResponse(content) {
    // Use the new JSONRepair class
    const result = JSONRepair.parseWithRepair(content, 4);
    
    if (result.success) {
      if (result.repairs > 0) {
        console.log(`✅ Successfully parsed AI response after ${result.repairs} repair attempt(s)`);
      } else {
        console.log('✅ Successfully parsed AI response (no repairs needed)');
      }
      return result.data;
    }
    
    // If parsing failed completely but we got partial data
    if (result.partial && result.data) {
      console.log('⚠️ Partial data extraction succeeded');
      console.log('📊 Extracted fields:', Object.keys(result.data).length);
      
      // Merge with fallback recipe to fill missing fields
      const fallback = this.createFallbackRecipe(content);
      const merged = { ...fallback, ...result.data };
      
      console.log('✅ Merged partial data with fallback recipe');
      return merged;
    }
    
    // Complete failure - use fallback
    console.error('❌ ALL PARSING ATTEMPTS FAILED');
    console.error('📄 Content length:', content.length);
    console.error('📄 First 500 chars:', content.substring(0, 500));
    console.error('📄 Last 500 chars:', content.substring(Math.max(0, content.length - 500)));
    
    console.log('🚨 FALLBACK TRIGGERED: Creating generic recipe due to JSON parsing failure');
    return this.createFallbackRecipe(content);
  }

  // Fix incomplete JSON by finding the last complete field and closing the object
  fixIncompleteJSON(incompleteContent) {
    try {
      // Find the last complete field (ends with comma or quote)
      const lines = incompleteContent.split('\n');
      let validLines = [];
      let braceCount = 0;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('{')) braceCount++;
        if (trimmedLine.endsWith('}')) braceCount--;
        
        // Add line if it looks like a complete field
        if (trimmedLine.includes(':') && (trimmedLine.endsWith(',') || trimmedLine.endsWith('"'))) {
          validLines.push(line);
        } else if (trimmedLine.startsWith('{') || trimmedLine === '') {
          validLines.push(line);
        }
      }
      
      // Remove trailing comma and close the object
      const lastLineIndex = validLines.length - 1;
      if (validLines[lastLineIndex].trim().endsWith(',')) {
        validLines[lastLineIndex] = validLines[lastLineIndex].replace(/,$/, '');
      }
      
      validLines.push('}');
      return validLines.join('\n');
    } catch (error) {
      throw new Error('Could not fix incomplete JSON');
    }
  }

  // Create a fallback recipe when JSON parsing completely fails
  createFallbackRecipe(originalContent) {
    const recipeName = originalContent.match(/"strMeal":\s*"([^"]+)"/)?.[1] || 'Generated Recipe';
    const category = originalContent.match(/"strCategory":\s*"([^"]+)"/)?.[1] || 'Main Course';
    const area = originalContent.match(/"strArea":\s*"([^"]+)"/)?.[1] || 'International';
    
    return {
      strMeal: recipeName,
      strCategory: category,
      strArea: area,
      strDescription: "🚨 FALLBACK RECIPE - AI JSON parsing failed. This indicates a problem with the AI response format.",
      strInstructions: "Prepare ingredients. Cook according to recipe. Serve hot.",
      strMealThumb: "",
      strTags: "FALLBACK,JSON_PARSING_FAILED",
      strEquipment: "🚨 FALLBACK: Basic kitchen tools",
      strPrepTime: "15 minutes",
      strCookTime: "30 minutes",
      strTotalTime: "45 minutes",
      strServings: "4",
      instructions: ["🚨 FALLBACK: Prepare ingredients", "🚨 FALLBACK: Cook as directed", "🚨 FALLBACK: Serve hot"],
      ingredientsDetailed: [
        {name: "🚨 FALLBACK: Main ingredient", quantity: "1", unit: "lb", optional: false, required: true},
        {name: "🚨 FALLBACK: Seasoning", quantity: "1", unit: "tsp", optional: false, required: true}
      ],
      equipmentRequired: ["🚨 FALLBACK: Basic kitchen tools"]
    };
  }

  // OPTIMIZED single-step recipe generation
  async generateOptimizedRecipe(params = {}) {
    const { mode, filters, antiDuplicateContext } = params;
    
    const dishTypes = ['Appetizers', 'Side Dishes', 'Main Courses', 'Soups', 'Salads', 'Sandwiches & Wraps', 'Burgers', 'Pizza & Flatbreads', 'Pasta & Noodles', 'Rice Dishes', 'Tacos, Burritos & Quesadillas', 'Stir-Fries', 'Curries', 'Stews & Casseroles', 'Skillet & One-Pan Meals', 'Slow Cooker / Instant Pot', 'Grilling / BBQ', 'Baked Goods', 'Pastries', 'Cookies & Bars', 'Pies & Cobblers', 'Frozen Treats', 'Pancakes & Waffles', 'Dips & Spreads', 'Bowls', 'Drinks & Smoothies', 'Breads', 'Meal Prep', 'Boards & Platters', 'Protein Dishes', 'Cakes & Cupcakes'];
    
    let optimizedPrompt;
    if (mode === 'filtered' && filters) {
      // If dishType not specified in filters, randomly select one
      if (!filters.dishType) {
        const randomDishType = dishTypes[Math.floor(Math.random() * dishTypes.length)];
        filters.dishType = randomDishType;
        params.randomDishType = randomDishType;
        console.log(`🎲 No dish type specified, randomly selected: ${randomDishType}`);
      }
      
      // If difficulty not specified in filters, randomly select one
      if (!filters.difficulty || filters.difficulty.length === 0) {
        const difficulties = ['Easy', 'Medium', 'Hard'];
        const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
        filters.difficulty = [randomDifficulty];
        params.randomDifficulty = randomDifficulty;
        console.log(`🎲 No difficulty specified, randomly selected: ${randomDifficulty}`);
      }
      
      // Filtered generation
      const filterPrompt = this.buildFilterPrompt(filters);
      optimizedPrompt = `${antiDuplicateContext || ''}${filterPrompt}

Generate a recipe that matches these criteria with ultra-detailed, comprehensive instructions.

🔥 INSTRUCTIONS MUST BE ULTRA-DETAILED (FLEXIBLE STEP COUNT BASED ON COMPLEXITY):
- BREAK DOWN EVERY SINGLE ACTION into separate detailed steps (NEVER combine multiple actions)  
- EVERY step must include specific temperatures, exact times, and precise techniques
- Include exact visual cues (golden brown edges, vigorous bubbling, tender when pierced with fork)
- Mention specific cooking sounds (gentle sizzling, rapid bubbling, crackling), distinct aromas, and texture changes
- Explain WHY each step is crucial (develops flavor layers, ensures proper texture, prevents overcooking)
- Include detailed troubleshooting tips and exactly what to do if something goes wrong
- Specify exact pan sizes, precise heat levels, and accurate timing for every single step
- Detail ALL prep work separately (washing technique, peeling method, cutting size, arrangement)
- Include resting times, temperature checks, doneness indicators, and food safety measures
- Add professional chef tips, advanced techniques, and kitchen organization advice for each step
- Mention equipment positioning, ingredient preparation sequence, and workspace management
- Include safety precautions, proper handling techniques, and storage instructions where needed
- Add sensory descriptions (what to smell, hear, see, feel) at each critical stage

🚨🚨🚨 MEGA CRITICAL - PERFECT INGREDIENT SYNC RULES 🚨🚨🚨
THIS IS THE MOST IMPORTANT RULE - FAILURE = REJECTED RECIPE:

⚠️ IRON-CLAD RULE #1: EXACT 1:1 MATCH (NO EXTRAS, NO DUPLICATES)
   - Every ingredient in ingredientsDetailed[] MUST be used in instructions[]
   - Every ingredient in instructions[] MUST be in ingredientsDetailed[]
   - Each ingredient appears EXACTLY ONCE (no duplicates with different amounts)

⚠️ IRON-CLAD RULE #2: NO DUPLICATE INGREDIENTS
   ❌ BAD: {"name": "Sugar", "quantity": "1/2", "unit": "cup"} AND {"name": "Sugar", "quantity": "1/4", "unit": "cup"}
   ✅ GOOD: {"name": "Sugar", "quantity": "1/2", "unit": "cup"} (appears once, instructions use 1/2 cup total)
   ❌ BAD: {"name": "Garlic cloves", "quantity": "4"} AND {"name": "Garlic", "quantity": "2"}
   ✅ GOOD: {"name": "Garlic cloves", "quantity": "4"} (use 4 cloves throughout)

⚠️ IRON-CLAD RULE #3: NO UNUSED INGREDIENTS
   ❌ BAD: List includes "Salt (1/2 tsp)" but instructions NEVER mention salt
   ❌ BAD: List includes "Shrimp (1/4 cup)" but instructions only say "serve with shrimp if desired"
   ❌ BAD: List includes "Lemon (1/4 cup)" but instructions never mention lemon
   ✅ GOOD: Every single ingredient in the list is explicitly used in at least one step

⚠️ IRON-CLAD RULE #4: WRITE RECIPE IN THIS ORDER
   Step A: Decide what you're making and list EXACT ingredients needed (e.g., for sauce: lemongrass, chilies, garlic, sugar, fish sauce, water)
   Step B: Write detailed instructions using ONLY those ingredients
   Step C: Cross-check: Does EVERY ingredient get used? If not, DELETE it from the list
   Step D: Cross-check: Does EVERY ingredient mentioned in instructions exist in the list? If not, ADD it

⚠️ IRON-CLAD RULE #5: MEASUREMENT RULES - EXACT MEASUREMENTS REQUIRED
   🚨 CRITICAL: ALWAYS use EXACT measurements for ALL ingredients, including salt, pepper, and seasonings
   ✅ CORRECT: {"name": "Salt", "quantity": "1/2", "unit": "tsp"}
   ✅ CORRECT: {"name": "Black pepper", "quantity": "1/4", "unit": "tsp"}
   ✅ CORRECT: {"name": "Cumin", "quantity": "1", "unit": "tsp"}
   ✅ CORRECT: {"name": "Fresh cilantro", "quantity": "2", "unit": "tbsp"} (for garnish, use exact amount like 2 tbsp)
   ❌ WRONG: {"name": "Salt", "quantity": "", "unit": "to taste"} (MUST use exact measurement like "1/2 tsp")
   ❌ WRONG: {"name": "Pepper", "quantity": "", "unit": "to taste"} (MUST use exact measurement like "1/4 tsp")
   ❌ WRONG: {"name": "Fresh cilantro", "quantity": "", "unit": "to garnish"} (MUST use exact measurement like "2 tbsp")
   📝 For seasonings: Use realistic amounts (e.g., salt: 1/4 to 1 tsp, pepper: 1/4 to 1/2 tsp, herbs: 1-2 tbsp)

⚠️ IRON-CLAD RULE #6: FINAL VERIFICATION CHECKLIST
   □ Count ingredients in list: ___
   □ Count ingredients mentioned in instructions: ___
   □ Are the numbers IDENTICAL? □ YES □ NO (if NO, fix it!)
   □ Any duplicate ingredients? □ YES (DELETE DUPLICATES!) □ NO (good!)
   □ Any unused ingredients? □ YES (DELETE THEM!) □ NO (good!)

🚨🚨🚨 ALLOWED VALUES - YOU MUST PICK FROM THESE EXACT LISTS 🚨🚨🚨
DO NOT MAKE UP YOUR OWN VALUES - CHOOSE FROM THESE LISTS ONLY:

📋 strCategory - MUST BE EXACTLY ONE OF THESE 6:
   Breakfast, Brunch, Lunch, Dinner, Snack, Dessert

📋 dishType - MUST BE EXACTLY ONE OF THESE 31:
   Appetizers, Side Dishes, Main Courses, Soups, Salads, 
   Sandwiches & Wraps, Burgers, Pizza & Flatbreads, 
   Pasta & Noodles, Rice Dishes, Tacos, Burritos & Quesadillas, 
   Stir-Fries, Curries, Stews & Casseroles, 
   Skillet & One-Pan Meals, Slow Cooker / Instant Pot, 
   Grilling / BBQ, Baked Goods, Pastries, Cookies & Bars, 
   Pies & Cobblers, Frozen Treats, Pancakes & Waffles, 
   Dips & Spreads, Bowls, Drinks & Smoothies, Breads, 
   Meal Prep, Boards & Platters, Protein Dishes, Cakes & Cupcakes

📋 strArea (cuisine) - MUST BE EXACTLY ONE OF THESE 19:
   Italian, Mexican, American, Chinese, Japanese, Indian, Thai, 
   French, Mediterranean, Greek, Spanish, Korean, Vietnamese, 
   Middle Eastern, British, German, Brazilian, Moroccan, International

❌ DO NOT USE: "Oven", "Stove", "Grill", "Pan" for dishType - these are NOT dish types!
❌ DO NOT USE: "European", "Asian", "African" for strArea - use specific countries!
❌ DO NOT make up categories like "Main Course", "Appetizer", "Entree" - use the 6 listed!

🚨 CRITICAL JSON FORMATTING RULES:
1. NO trailing commas in arrays or objects
2. All strings must use double quotes (")
3. No comments in JSON
4. Return ONLY valid JSON - no markdown, no explanations

Return ONLY this JSON:`;
    } else {
      // Random recipe - truly randomize ALL aspects
      const cuisines = ['Italian', 'Mexican', 'American', 'Chinese', 'Japanese', 'Indian', 'Thai', 'French', 'Mediterranean', 'Greek', 'Spanish', 'Korean', 'Vietnamese', 'Middle Eastern', 'British', 'German', 'Brazilian', 'Moroccan', 'International'];
      const categories = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
      const difficulties = ['Easy', 'Medium', 'Hard'];
      
      const randomCuisine = cuisines[Math.floor(Math.random() * cuisines.length)];
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const randomDishType = dishTypes[Math.floor(Math.random() * dishTypes.length)];
      const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
      
      console.log(`🎲 Random generation values:`);
      console.log(`   Cuisine: ${randomCuisine}`);
      console.log(`   Category: ${randomCategory}`);
      console.log(`   Dish Type: ${randomDishType}`);
      console.log(`   Difficulty: ${randomDifficulty}`);
      
      // Store random values in params for use in quickFormatRecipe
      params.randomCuisine = randomCuisine;
      params.randomCategory = randomCategory;
      params.randomDishType = randomDishType;
      params.randomDifficulty = randomDifficulty;
      
      optimizedPrompt = `Create a creative ${randomCuisine} ${randomCategory} recipe that fits the ${randomDishType} category with ${randomDifficulty} difficulty level and ultra-detailed, comprehensive instructions.

🎯 CRITICAL REQUIREMENTS FOR THIS RECIPE:
- Category (strCategory): MUST be "${randomCategory}"
- Cuisine (strArea): MUST be "${randomCuisine}"  
- Dish Type (dishType): MUST be "${randomDishType}" EXACTLY - DO NOT change this!
- Difficulty: MUST be "${randomDifficulty}" EXACTLY - Easy, Medium, or Hard
- Create a recipe that authentically matches ALL four of these criteria

🔥 INSTRUCTIONS MUST BE ULTRA-DETAILED (FLEXIBLE STEP COUNT BASED ON COMPLEXITY):
- BREAK DOWN EVERY SINGLE ACTION into separate detailed steps (NEVER combine multiple actions)  
- EVERY step must include specific temperatures, exact times, and precise techniques
- Include exact visual cues (golden brown edges, vigorous bubbling, tender when pierced with fork)
- Mention specific cooking sounds (gentle sizzling, rapid bubbling, crackling), distinct aromas, and texture changes
- Explain WHY each step is crucial (develops flavor layers, ensures proper texture, prevents overcooking)
- Include detailed troubleshooting tips and exactly what to do if something goes wrong
- Specify exact pan sizes, precise heat levels, and accurate timing for every single step
- Detail ALL prep work separately (washing technique, peeling method, cutting size, arrangement)
- Include resting times, temperature checks, doneness indicators, and food safety measures
- Add professional chef tips, advanced techniques, and kitchen organization advice for each step
- Mention equipment positioning, ingredient preparation sequence, and workspace management
- Include safety precautions, proper handling techniques, and storage instructions where needed
- Add sensory descriptions (what to smell, hear, see, feel) at each critical stage

🚨🚨🚨 MEGA CRITICAL - PERFECT INGREDIENT SYNC RULES 🚨🚨🚨
THIS IS THE MOST IMPORTANT RULE - FAILURE = REJECTED RECIPE:

⚠️ IRON-CLAD RULE #1: EXACT 1:1 MATCH (NO EXTRAS, NO DUPLICATES)
   - Every ingredient in ingredientsDetailed[] MUST be used in instructions[]
   - Every ingredient in instructions[] MUST be in ingredientsDetailed[]
   - Each ingredient appears EXACTLY ONCE (no duplicates with different amounts)

⚠️ IRON-CLAD RULE #2: NO DUPLICATE INGREDIENTS
   ❌ BAD: {"name": "Sugar", "quantity": "1/2", "unit": "cup"} AND {"name": "Sugar", "quantity": "1/4", "unit": "cup"}
   ✅ GOOD: {"name": "Sugar", "quantity": "1/2", "unit": "cup"} (appears once, instructions use 1/2 cup total)
   ❌ BAD: {"name": "Garlic cloves", "quantity": "4"} AND {"name": "Garlic", "quantity": "2"}
   ✅ GOOD: {"name": "Garlic cloves", "quantity": "4"} (use 4 cloves throughout)

⚠️ IRON-CLAD RULE #3: NO UNUSED INGREDIENTS
   ❌ BAD: List includes "Salt (1/2 tsp)" but instructions NEVER mention salt
   ❌ BAD: List includes "Shrimp (1/4 cup)" but instructions only say "serve with shrimp if desired"
   ❌ BAD: List includes "Lemon (1/4 cup)" but instructions never mention lemon
   ✅ GOOD: Every single ingredient in the list is explicitly used in at least one step

⚠️ IRON-CLAD RULE #4: WRITE RECIPE IN THIS ORDER
   Step A: Decide what you're making and list EXACT ingredients needed (e.g., for sauce: lemongrass, chilies, garlic, sugar, fish sauce, water)
   Step B: Write detailed instructions using ONLY those ingredients
   Step C: Cross-check: Does EVERY ingredient get used? If not, DELETE it from the list
   Step D: Cross-check: Does EVERY ingredient mentioned in instructions exist in the list? If not, ADD it

⚠️ IRON-CLAD RULE #5: MEASUREMENT RULES - EXACT MEASUREMENTS REQUIRED
   🚨 CRITICAL: ALWAYS use EXACT measurements for ALL ingredients, including salt, pepper, and seasonings
   ✅ CORRECT: {"name": "Salt", "quantity": "1/2", "unit": "tsp"}
   ✅ CORRECT: {"name": "Black pepper", "quantity": "1/4", "unit": "tsp"}
   ✅ CORRECT: {"name": "Cumin", "quantity": "1", "unit": "tsp"}
   ✅ CORRECT: {"name": "Fresh cilantro", "quantity": "2", "unit": "tbsp"} (for garnish, use exact amount like 2 tbsp)
   ❌ WRONG: {"name": "Salt", "quantity": "", "unit": "to taste"} (MUST use exact measurement like "1/2 tsp")
   ❌ WRONG: {"name": "Pepper", "quantity": "", "unit": "to taste"} (MUST use exact measurement like "1/4 tsp")
   ❌ WRONG: {"name": "Fresh cilantro", "quantity": "", "unit": "to garnish"} (MUST use exact measurement like "2 tbsp")
   📝 For seasonings: Use realistic amounts (e.g., salt: 1/4 to 1 tsp, pepper: 1/4 to 1/2 tsp, herbs: 1-2 tbsp)

⚠️ IRON-CLAD RULE #6: FINAL VERIFICATION CHECKLIST
   □ Count ingredients in list: ___
   □ Count ingredients mentioned in instructions: ___
   □ Are the numbers IDENTICAL? □ YES □ NO (if NO, fix it!)
   □ Any duplicate ingredients? □ YES (DELETE DUPLICATES!) □ NO (good!)
   □ Any unused ingredients? □ YES (DELETE THEM!) □ NO (good!)

🚨🚨🚨 ALLOWED VALUES - YOU MUST PICK FROM THESE EXACT LISTS 🚨🚨🚨
DO NOT MAKE UP YOUR OWN VALUES - CHOOSE FROM THESE LISTS ONLY:

📋 strCategory - MUST BE EXACTLY ONE OF THESE 6:
   Breakfast, Brunch, Lunch, Dinner, Snack, Dessert

📋 dishType - MUST BE EXACTLY ONE OF THESE 31:
   Appetizers, Side Dishes, Main Courses, Soups, Salads, 
   Sandwiches & Wraps, Burgers, Pizza & Flatbreads, 
   Pasta & Noodles, Rice Dishes, Tacos, Burritos & Quesadillas, 
   Stir-Fries, Curries, Stews & Casseroles, 
   Skillet & One-Pan Meals, Slow Cooker / Instant Pot, 
   Grilling / BBQ, Baked Goods, Pastries, Cookies & Bars, 
   Pies & Cobblers, Frozen Treats, Pancakes & Waffles, 
   Dips & Spreads, Bowls, Drinks & Smoothies, Breads, 
   Meal Prep, Boards & Platters, Protein Dishes, Cakes & Cupcakes

📋 strArea (cuisine) - MUST BE EXACTLY ONE OF THESE 19:
   Italian, Mexican, American, Chinese, Japanese, Indian, Thai, 
   French, Mediterranean, Greek, Spanish, Korean, Vietnamese, 
   Middle Eastern, British, German, Brazilian, Moroccan, International

❌ DO NOT USE: "Oven", "Stove", "Grill", "Pan" for dishType - these are NOT dish types!
❌ DO NOT USE: "European", "Asian", "African" for strArea - use specific countries!
❌ DO NOT make up categories like "Main Course", "Appetizer", "Entree" - use the 6 listed!

🚨 CRITICAL JSON FORMATTING RULES:
1. NO trailing commas in arrays or objects
2. All strings must use double quotes (")
3. No comments in JSON
4. Return ONLY valid JSON - no markdown, no explanations

⚠️ NUTRITION VALUES - MANDATORY CALCULATION PROCESS:
🚨 YOU MUST CALCULATE THIS - NO GUESSES, NO DEFAULTS:

STEP 1: List each ingredient with its quantity
STEP 2: Look up nutrition per unit for each ingredient
STEP 3: Multiply by quantity used in recipe
STEP 4: Sum all ingredients to get TOTAL recipe nutrition
STEP 5: Divide by numberOfServings to get PER SERVING values

EXAMPLE CALCULATION:
- 2 cups flour (455 cal/cup) = 910 calories, 26g protein
- 4 eggs (70 cal each) = 280 calories, 28g protein  
- 1 cup milk (150 cal) = 150 calories, 8g protein
- TOTAL: 1340 calories, 62g protein
- For 4 servings: 335 calories/serving, 15.5g protein/serving

❌ WRONG: Using default 350 calories or guessing
✅ CORRECT: Actually calculating from ingredient quantities

- NEVER use 0 for any nutrition field
- NEVER use default values like 350 calories
- MUST show your work by calculating from actual ingredients!

Return ONLY this JSON:`;
    }

    // Build template with context-specific values
    const templateCategory = params.randomCategory || params.filters?.category || "Category";
    const templateCuisine = params.randomCuisine || params.filters?.cuisine || params.filters?.area || "Cuisine";
    const templateDishType = params.randomDishType || params.filters?.dishType || "appropriate dish type";
    const templateDifficulty = params.randomDifficulty || (params.filters?.difficulty && params.filters.difficulty.length > 0 ? params.filters.difficulty[0] : "Medium");
    
    // Set difficulty in params for use in quickFormatRecipe
    params.difficulty = templateDifficulty;
    
    optimizedPrompt += `
{
  "strMeal": "Recipe Name",
  "strCategory": "${templateCategory}",
  "strArea": "${templateCuisine}",
  "strDescription": "2-3 sentence description",
  "instructions": [
    "Step 1: Begin by preparing the ingredients - wash and chop vegetables as needed for this specific recipe",
    "Step 2: [CONDITIONAL - Only if stovetop cooking] Heat your cooking vessel over appropriate heat for 3-4 minutes until properly heated",
    "Step 2: [CONDITIONAL - Only if oven baking] Preheat oven to specified temperature and position rack appropriately",
    "Step 2: [CONDITIONAL - Only if raw/no-cook] Continue with prep steps - no heating needed",
    "Step 3: [CONDITIONAL - Only if stovetop] Add oil/fat to heated vessel and swirl to coat evenly, waiting until oil shimmers",
    "Step 3: [CONDITIONAL - Only if oven] Prepare baking vessel with appropriate preparation",
    "Step 3: [CONDITIONAL - Only if raw/no-cook] Combine ingredients in mixing bowl",
    "Step 4: Continue with remaining ultra-detailed steps appropriate for this recipe's complexity (10-40 steps total), each as a separate array item",
    "Step 5: Each instruction should be a complete, detailed step with 'Step X:' prefix",
    "Include specific temperatures, exact times, visual cues, sounds, aromas, and professional techniques",
    "...continue with remaining steps, ensuring each is a separate array item..."
  ],
  "ingredientsDetailed": [
    {"name": "ingredient name", "quantity": "2", "unit": "cups", "optional": false, "required": true},
    {"name": "ingredient name", "quantity": "1", "unit": "tsp", "optional": false, "required": true}
  ],
  "equipmentRequired": ["Equipment 1", "Equipment 2", "Equipment 3"],
  "prepTime": 20,
  "cookTime": 30,
  "totalTime": 50,
  "numberOfServings": 4,
  "servingSize": "1 serving",
  "difficulty": "${templateDifficulty}",
  "yield": "4 servings",
  "nutrition": {
    "caloriesPerServing": 400,
    "protein": 25,
    "carbs": 30,
    "fat": 15,
    "fiber": 5,
    "sugar": 8,
    "sodium": 600,
    "cholesterol": 50,
    "saturatedFat": 6,
    "vitaminA": 15,
    "vitaminC": 20,
    "iron": 12,
    "calcium": 10
  },
  
  ⚠️ CRITICAL NOTE: The nutrition and numberOfServings values above are EXAMPLES ONLY.
  You MUST calculate ACTUAL values from the ingredients you list:
  - numberOfServings: Calculate from ingredient volumes/weights (estimate total, divide by serving size)
  - nutrition: Sum calories/protein/carbs/fat from each ingredient, divide by numberOfServings
  - Example calculation: 2 cups flour (910 cal) + 4 eggs (280 cal) = 1190 total ÷ 4 servings = 297.5 cal/serving
  "dietary": {
    "vegetarian": false,
    "vegan": false,
    "pescatarian": false,
    "glutenFree": false,
    "dairyFree": false,
    "keto": false,
    "paleo": false,
    "halal": true,
    "noRedMeat": false,
    "noPork": true,
    "noShellfish": true,
    "omnivore": true
  },
  "mealType": ["${templateCategory}"],
  "dishType": "${templateDishType}",
  "mainIngredient": "main ingredient from recipe",
  "occasion": ["Weeknight"],
  "seasonality": ["All Season"],
  "equipmentRequired": ["Select 4-8 appropriate tools from the comprehensive equipment list based on cooking methods"],
  "skillsRequired": ["techniques used"],
  "keywords": ["${templateCategory.toLowerCase()}", "${templateCuisine.toLowerCase()}"],
  "allergenFlags": ["list any allergens"],
  "timeCategory": "30-60 mins"
}

Fill with realistic values based on the recipe. NO zeros or empty strings.`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a professional chef and culinary instructor. Create ultra-detailed, comprehensive recipes with 10-40 step-by-step instructions (match complexity: simple recipes 10-15 steps, moderate 15-25, complex 25-40). Break down EVERY single action into separate steps. Include specific temperatures, times, techniques, visual cues, sounds, aromas, and professional tips. Return only valid JSON with realistic data.'
        },
        {
          role: 'user',
          content: optimizedPrompt
        }
      ],
      temperature: 0.8,
      max_tokens: 4000 // Increased for ultra-detailed instructions (10-40 steps depending on complexity)
    });

    // Log the raw AI response (FULL response)
    const rawResponse = completion.choices[0].message.content;
    console.log('\n📥 ═══════════════════════════════════════════');
    console.log('📥 RAW AI RESPONSE (FULL)');
    console.log('═══════════════════════════════════════════');
    console.log(`📏 Total length: ${rawResponse.length} characters`);
    console.log('═══════════════════════════════════════════');
    console.log(rawResponse);
    console.log('═══════════════════════════════════════════\n');

    const recipeData = this.parseAIResponse(rawResponse);
    
    // Log the parsed recipe (after JSON parsing)
    console.log('\n📦 ═══════════════════════════════════════════');
    console.log('📦 PARSED RECIPE (After JSON Parsing)');
    console.log('═══════════════════════════════════════════');
    console.log(JSON.stringify(recipeData, null, 2));
    console.log('═══════════════════════════════════════════\n');
    
    const formattedRecipe = await this.quickFormatRecipe(recipeData, params);
    
    // Log the formatted recipe (after quickFormatRecipe)
    console.log('\n✨ ═══════════════════════════════════════════');
    console.log('✨ FORMATTED RECIPE (After quickFormatRecipe)');
    console.log('═══════════════════════════════════════════');
    console.log(JSON.stringify(formattedRecipe, null, 2));
    console.log('═══════════════════════════════════════════\n');
    
    return formattedRecipe;
  }

  // STEP 1: Generate basic recipe with simple prompt
  async generateBasicRecipe(params = {}) {
    const { customPrompt, mode } = params;
    
    let basicPrompt;
    if (mode === 'custom' && customPrompt) {
      basicPrompt = `Create a ${customPrompt} recipe. Return ONLY this JSON format:
{
  "strMeal": "Recipe Name",
  "strCategory": "Meal type (Breakfast, Brunch, Lunch, Dinner, Snack, Dessert)",
  "strArea": "Cuisine (Italian, Mexican, Asian, etc)",
  "strDescription": "Brief appetizing description (2-3 sentences)",
  "instructions": [
    "Step 1: Begin by preparing the ingredients - wash and chop vegetables as needed for this specific recipe",
    "Step 2: [CONDITIONAL - Only if stovetop cooking] Heat your cooking vessel over appropriate heat for 3-4 minutes until properly heated",
    "Step 2: [CONDITIONAL - Only if oven baking] Preheat oven to specified temperature and position rack appropriately",
    "Step 2: [CONDITIONAL - Only if raw/no-cook] Continue with prep steps - no heating needed",
    "Step 3: [CONDITIONAL - Only if stovetop] Add oil/fat to heated vessel and swirl to coat evenly, waiting until oil shimmers",
    "Step 3: [CONDITIONAL - Only if oven] Prepare baking vessel with appropriate preparation",
    "Step 3: [CONDITIONAL - Only if raw/no-cook] Combine ingredients in mixing bowl",
    "Step 4: Continue with remaining ultra-detailed steps appropriate for this recipe's complexity (10-40 steps total), each as a separate array item",
    "Step 5: Each instruction should be a complete, detailed step with 'Step X:' prefix",
    "Include specific temperatures, exact times, visual cues, sounds, aromas, and professional techniques",
    "...continue with remaining steps, ensuring each is a separate array item..."
  ],
  "dietary": {
    "vegetarian": false,
    "vegan": false,
    "pescatarian": false,
    "keto": false,
    "lowCarb": false,
    "highProtein": false,
    "glutenFree": false,
    "dairyFree": false,
    "nutFree": false,
    "lowSodium": false,
    "lowSugar": false,
    "mediterraneanDiet": false
  },
  "ingredientsDetailed": [
    {"name": "First ingredient", "quantity": "2", "unit": "cups", "optional": false, "required": true},
    {"name": "Second ingredient", "quantity": "1", "unit": "tsp", "optional": false, "required": true}
  ],
  "equipmentRequired": ["Equipment 1", "Equipment 2"]
}`;
    } else {
      // Random recipe
      const cuisines = ['Italian', 'Mexican', 'Asian', 'Mediterranean', 'Indian', 'French', 'American'];
      const categories = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
      const themes = ['healthy', 'comfort food', 'spicy', 'fresh', 'hearty'];
      
      const randomCuisine = cuisines[Math.floor(Math.random() * cuisines.length)];
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const randomTheme = themes[Math.floor(Math.random() * themes.length)];
      
      basicPrompt = `Create a creative ${randomTheme} ${randomCuisine} ${randomCategory} recipe. Return ONLY this JSON format:
{
  "strMeal": "Creative Recipe Name",
  "strCategory": "${randomCategory}",
  "strArea": "${randomCuisine}",
  "strDescription": "Brief appetizing description (2-3 sentences)",
  "instructions": [
    "Step 1: First detailed instruction with step number prefix",
    "Step 2: Second detailed instruction with step number prefix",
    "Step 3: Third detailed instruction with step number prefix",
    "...continue with 10-40 total steps (match complexity), each as separate array items with Step X: prefix..."
  ],
  "dietary": {
    "vegetarian": false,
    "vegan": false,
    "pescatarian": false,
    "keto": false,
    "lowCarb": false,
    "highProtein": false,
    "glutenFree": false,
    "dairyFree": false,
    "nutFree": false,
    "lowSodium": false,
    "lowSugar": false,
    "mediterraneanDiet": false
  },
  "ingredientsDetailed": [
    {"name": "First ingredient", "quantity": "2", "unit": "cups", "optional": false, "required": true},
    {"name": "Second ingredient", "quantity": "1", "unit": "tsp", "optional": false, "required": true}
  ],
  "equipmentRequired": ["Equipment 1", "Equipment 2"]
}`;
    }

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a chef. Create realistic recipes with real ingredients and detailed instructions. IMPORTANT: Analyze ingredients and set dietary flags appropriately (vegetarian if no meat/fish, vegan if no animal products, glutenFree if no wheat/gluten, etc.). Return only valid JSON.'
        },
        {
          role: 'user',
          content: basicPrompt
        }
      ],
      temperature: 0.8,
      max_tokens: 1000 // Smaller for basic recipe
    });

    return this.parseAIResponse(completion.choices[0].message.content);
  }

  // STEP 2: Enhance basic recipe with comprehensive data
  async enhanceRecipeWithComprehensiveData(basicRecipe) {
    const enhancementPrompt = `Take this basic recipe and add comprehensive nutritional and categorization data.

BASIC RECIPE:
Recipe Name: ${basicRecipe.strMeal}
Category: ${basicRecipe.strCategory}
Cuisine: ${basicRecipe.strArea}
Ingredients: ${basicRecipe.strIngredient1}, ${basicRecipe.strIngredient2}, ${basicRecipe.strIngredient3}

CRITICAL: Return ONLY valid JSON with ALL these fields filled with realistic numbers (NEVER use 0):

{
  "strMeal": "${basicRecipe.strMeal}",
  "strCategory": "${basicRecipe.strCategory}",
  "strArea": "${basicRecipe.strArea}",
  "strDescription": "${basicRecipe.strDescription}",
  "instructions": ${JSON.stringify(basicRecipe.instructions)},
  "ingredientsDetailed": ${JSON.stringify(basicRecipe.ingredientsDetailed || [])},
  "prepTime": 20,
  "cookTime": 30,
  "totalTime": 50,
  "numberOfServings": 4,
  "servingSize": "1 serving",
  "difficulty": "Medium",
  "yield": "4 servings",
  "equipmentRequired": ["Appropriate cooking vessel (skillet/pan/oven/bowl based on recipe)", "Chef's knife", "Cutting board", "Measuring cups/spoons"],
  "nutrition": {
    "caloriesPerServing": 420,
    "protein": 28,
    "carbs": 15,
    "fat": 18,
    "fiber": 3,
    "sugar": 5,
    "sodium": 650,
    "cholesterol": 75,
    "saturatedFat": 6,
    "vitaminA": 12,
    "vitaminC": 8,
    "iron": 15,
    "calcium": 10
  },
  "dietary": {
    "vegetarian": false,
    "vegan": false,
    "pescatarian": true,
    "glutenFree": true,
    "dairyFree": false,
    "keto": false,
    "paleo": true,
    "halal": true,
    "noRedMeat": true,
    "noPork": true,
    "noShellfish": false,
    "omnivore": false
  },
  "mealType": ["Dinner"],
  "dishType": "Main Course",
  "mainIngredient": "${basicRecipe.strIngredient1}",
  "occasion": ["Date Night", "Special Occasion"],
  "seasonality": ["All Season"],
  "equipmentRequired": ["Appropriate cooking vessel (skillet/pan/oven/bowl based on recipe)", "Chef's knife", "Cutting board", "Measuring cups/spoons"],
  "skillsRequired": ["Pan-frying", "Marinating", "Timing"],
  "keywords": ["seafood", "umami", "Japanese", "elegant"],
  "allergenFlags": ["fish"],
  "timeCategory": "30-60 mins"
}

Replace the nutrition values with realistic numbers based on the actual ingredients.`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a nutritionist. Fill in realistic nutritional data based on the recipe ingredients. Return only valid JSON with NO placeholders.'
        },
        {
          role: 'user',
          content: enhancementPrompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent data
      max_tokens: 1500
    });

    const enhancedData = this.parseAIResponse(completion.choices[0].message.content);
    
    // Ensure we don't lose the basic recipe data
    return { ...basicRecipe, ...enhancedData };
  }

  // Add minimal enhancements if Step 2 fails
  addMinimalEnhancements(basicRecipe) {
    return {
      ...basicRecipe,
      // Use smart defaults
      ...(() => {
        const smartDefaults = this.getSmartDefaults(
          params.filters?.category || 'Dinner',
          params.filters?.dishType || 'Main Courses',
          params.difficulty || 'Medium',
          params.servings
        );
        return {
          prepTime: smartDefaults.prepTime,
          cookTime: smartDefaults.cookTime,
          totalTime: smartDefaults.totalTime,
          numberOfServings: smartDefaults.numberOfServings,
          servingSize: "1 serving"
        };
      })(),
      difficulty: "Medium",
      yield: "4 servings",
      strEquipment: "Basic cooking tools",
      nutrition: {
        caloriesPerServing: 350,
        protein: 20,
        carbs: 25,
        fat: 15,
        fiber: 4,
        sugar: 6,
        sodium: 600,
        cholesterol: 50,
        saturatedFat: 5,
        vitaminA: 10,
        vitaminC: 15,
        iron: 12,
        calcium: 8
      },
      dietary: {
        vegetarian: false,
        vegan: false,
        pescatarian: false,
        glutenFree: false,
        dairyFree: false,
        keto: false,
        paleo: false,
        halal: true,
        noRedMeat: false,
        noPork: true,
        noShellfish: true,
        omnivore: true
      },
      mealType: ["Dinner"],
      dishType: "Main Course",
      mainIngredient: basicRecipe.strIngredient1 || "main ingredient",
      occasion: ["Weeknight"],
      seasonality: ["All Season"],
      equipmentRequired: ["Appropriate cooking vessel (skillet/pan/oven/bowl based on recipe)", "Chef's knife", "Cutting board", "Measuring cups/spoons"],
      skillsRequired: ["Basic cooking"],
      keywords: ["homemade", "delicious"],
      allergenFlags: [],
      timeCategory: "30-60 mins"
    };
  }

  // Generate multiple recipe ideas
  async generateRecipeIdeas(params = {}) {
    try {
      const {
        count = 5,
        cuisine = 'any',
        category = 'any',
        trending = false,
        seasonal = false
      } = params;

      const prompt = `Generate ${count} creative recipe ideas for ${cuisine !== 'any' ? cuisine : 'various'} cuisine${category !== 'any' ? ` in the ${category} category` : ''}. ${trending ? 'Focus on current food trends. ' : ''}${seasonal ? 'Consider seasonal ingredients. ' : ''}

Return a JSON array with each idea containing:
- name: Recipe name
- description: Brief description
- cuisine: Cuisine type
- category: Food category
- estimatedTime: Cooking time
- difficulty: easy/medium/hard
- keyIngredients: Array of 3-5 main ingredients
- uniqueFeature: What makes this recipe special

Format as valid JSON array.`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a creative chef specializing in innovative recipe development. Generate diverse, interesting recipe ideas. CRITICAL: Return ONLY valid JSON format - no additional text, explanations, or markdown formatting. The response must be pure JSON that starts with [ and ends with ].'
          },
          {
            role: 'user',
            content: prompt + '\n\nIMPORTANT: Respond with ONLY the JSON array, no other text.'
          }
        ],
        temperature: 0.9,
        max_tokens: 1500
      });

      return this.parseAIResponse(completion.choices[0].message.content);
    } catch (error) {
      throw new Error(`Recipe ideas generation failed: ${error.message}`);
    }
  }

  // Generate recipe image - FAST and SIMPLE with INGREDIENTS
  async generateRecipeImage(recipeName, description = '', mealId = null, ingredients = []) {
    try {
      console.log('🎨 Starting FAST image generation with ingredients...');
      
      // Build ingredient-aware prompt
      let simplePrompt;
      if (ingredients && ingredients.length > 0) {
        const mainIngredients = ingredients.slice(0, 4).join(', ');
        simplePrompt = `Professional food photography of ${recipeName} made with ${mainIngredients}, restaurant quality, well-lit, appetizing, high-resolution, centered on white plate, showing the actual ingredients`;
        console.log('📸 Using ingredient-aware prompt:', simplePrompt);
      } else {
        simplePrompt = `Professional food photography of ${recipeName}, restaurant quality, well-lit, appetizing, high-resolution, centered on white plate`;
        console.log('📸 Using simple prompt (no ingredients provided):', simplePrompt);
      }
      
      // Generate image directly
      const imageUrl = await this.generateFluxImage(simplePrompt);
      console.log('✅ Image generated successfully!');

      return {
        url: imageUrl, // Return URL directly - no download for speed
        localPath: null,
        fluxUrl: imageUrl,
        prompt: simplePrompt,
        basicPrompt: simplePrompt,
        quality: 'high',
        model: 'getimg-ai',
        cost: '$0.006',
        saved: false // Skip download for speed
      };
    } catch (error) {
      console.error('❌ Image generation failed:', error.message);
      
      // Return placeholder immediately
      return {
        url: '/images/placeholder-recipe.jpg',
        localPath: null,
        fluxUrl: null,
        prompt: `${recipeName} food photo`,
        basicPrompt: `${recipeName} food photo`,
        quality: 'placeholder',
        model: 'fallback',
        cost: '$0.00',
        saved: false,
        error: error.message
      };
    }
  }

  // Generate image using multiple APIs with fallbacks
  async generateFluxImage(prompt) {
    console.log('🎯 Starting generateFluxImage with prompt:', prompt.substring(0, 100) + '...');
    console.log('🔑 Available API keys:', {
      getimg: !!process.env.GETIMG_API_KEY,
      together: !!process.env.TOGETHER_API_KEY,
      fal: !!process.env.FAL_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      replicate: !!process.env.REPLICATE_API_TOKEN
    });
    
    // Try multiple image generation APIs in order of preference
    const apis = [
      {
        name: 'GetImg.AI (Your Key)',
        condition: () => process.env.GETIMG_API_KEY,
        generate: () => this.generateGetImgAIImage(prompt)
      },
      {
        name: 'Together AI (FREE)',
        condition: () => process.env.TOGETHER_API_KEY,
        generate: () => this.generateTogetherAIImage(prompt)
      },
      {
        name: 'FAL.AI',
        condition: () => process.env.FAL_KEY,
        generate: () => this.generateFalAIImage(prompt)
      },
      {
        name: 'OpenAI DALL-E 3',
        condition: () => process.env.OPENAI_API_KEY,
        generate: () => this.generateDalleImage(prompt)
      },
      {
        name: 'Replicate',
        condition: () => process.env.REPLICATE_API_TOKEN,
        generate: () => this.generateReplicateImage(prompt)
      }
    ];

    for (const api of apis) {
      if (api.condition()) {
        try {
          console.log(`🎯 Trying ${api.name} for image generation...`);
          const imageUrl = await api.generate();
          console.log(`✅ ${api.name} image generated successfully!`);
          return imageUrl;
        } catch (error) {
          console.error(`❌ ${api.name} failed: ${error.message}`);
          continue; // Try next API
        }
      }
    }

    throw new Error('No image generation APIs configured. Please set GETIMG_API_KEY, TOGETHER_API_KEY, FAL_KEY, OPENAI_API_KEY, or REPLICATE_API_TOKEN environment variable.');
  }

  // GetImg.AI - FLUX.1 schnell
  async generateGetImgAIImage(prompt) {
    console.log('🎨 Using GetImg.AI for FLUX.1 schnell...');
    console.log('🔑 API Key status:', process.env.GETIMG_API_KEY ? 'SET' : 'NOT SET');
    
    try {
      const response = await axios.post('https://api.getimg.ai/v1/flux-schnell/text-to-image', {
        prompt: prompt,
        width: 1024,
        height: 1024,
        steps: 4,
        output_format: "jpeg",
        response_format: "url"
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.GETIMG_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 60000 // 60 second timeout
      });

      if (!response.data?.url) {
        throw new Error('Invalid response from GetImg.AI - no URL returned');
      }

      console.log(`💰 Cost: $${response.data.cost || 'Unknown'}`);
      console.log(`🌱 Seed: ${response.data.seed || 'Unknown'}`);
      return response.data.url;
      
    } catch (error) {
      console.error('❌ GetImg.AI Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 402) {
        throw new Error('GetImg.AI: No credits available. Please add credits to your account at https://dashboard.getimg.ai/');
      } else if (error.response?.status === 401) {
        throw new Error('GetImg.AI: Invalid API key. Please check your GETIMG_API_KEY environment variable.');
      } else {
        throw new Error(`GetImg.AI API error: ${error.message}`);
      }
    }
  }

  // Together AI - FREE Flux.1 schnell
  async generateTogetherAIImage(prompt) {
    console.log('🆓 Using Together AI (FREE) for Flux.1 schnell...');
    
    const response = await axios.post('https://api.together.xyz/v1/images/generations', {
      model: "black-forest-labs/FLUX.1-schnell-Free",
      prompt: prompt,
      width: 1024,
      height: 1024,
      steps: 4,
      n: 1
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 second timeout
    });

    if (!response.data?.data?.[0]?.url) {
      throw new Error('Invalid response from Together AI');
    }

    console.log('💰 Cost: FREE!');
    return response.data.data[0].url;
  }

  // FAL.AI Flux.1 schnell
  async generateFalAIImage(prompt) {
    console.log('💸 Using FAL.AI for Flux.1 schnell...');
    
    const response = await axios.post('https://fal.run/fal-ai/flux/schnell', {
      prompt: prompt,
      image_size: "square_hd", // 1024x1024
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: true
    }, {
      headers: {
        'Authorization': `Key ${process.env.FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (!response.data?.images?.[0]?.url) {
      throw new Error('Invalid response from FAL.AI');
    }

    console.log('💰 Cost: ~$0.00252');
    return response.data.images[0].url;
  }

  // OpenAI DALL-E 3
  async generateDalleImage(prompt) {
    console.log('🎨 Using OpenAI DALL-E 3...');
    
    const response = await this.openai.images.generate({
      model: this.imageModel, // 'dall-e-3'
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url"
    });

    if (!response.data?.[0]?.url) {
      throw new Error('Invalid response from OpenAI DALL-E');
    }

    console.log('💰 Cost: ~$0.04');
    return response.data[0].url;
  }

  // Replicate Flux
  async generateReplicateImage(prompt) {
    console.log('🔄 Using Replicate for Flux...');
    
    const response = await axios.post('https://api.replicate.com/v1/predictions', {
      version: "black-forest-labs/flux-schnell",
      input: {
        prompt: prompt,
        width: 1024,
        height: 1024,
        num_inference_steps: 4,
        num_outputs: 1
      }
    }, {
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (!response.data?.output?.[0]) {
      throw new Error('Invalid response from Replicate');
    }

    console.log('💰 Cost: ~$0.003');
    return response.data.output[0];
  }

  // AI generates its own professional photography prompt
  async generatePhotographyPrompt(recipeName, description = '') {
    try {
      const promptGenerationRequest = `As a world-class food photographer and prompt engineer, create an ultra-detailed DALL-E prompt for photographing "${recipeName}". ${description ? `Context: ${description}.` : ''}

Create a prompt that will produce a photograph indistinguishable from reality. Include:

🔸 CAMERA SPECIFICATIONS:
- Professional camera model (Canon R5, Sony A7R IV, etc.)
- Premium lens specifications (85mm f/1.4, 100mm macro, etc.)
- Aperture, ISO, shutter speed details

🔸 LIGHTING SETUP:
- PERFECT ILLUMINATION: Bright, even, professional studio lighting
- WELL-LIT BACKGROUND: Soft, bright background lighting eliminates shadows
- FOOD-FOCUSED LIGHTING: Key light positioned to make the plated food luminous and appealing
- MULTIPLE LIGHT SOURCES: Key light, fill light, and background light for complete coverage
- GOLDEN RATIO LIGHTING: Warm, inviting light temperature (3000K-3500K)
- NO DARK SHADOWS: Gentle fill lighting ensures every detail is beautifully visible

🔸 COMPOSITION & STYLING:
- PERFECT FRAMING: Dish fills 75-85% of frame, hero-centered composition
- STUNNING DISHWARE: Exquisite, museum-quality plates/bowls that elevate the food
- CAMERA ANGLE: Top-down (overhead) or 45-degree side angle for maximum visual impact
- BEAUTIFUL WELL-LIT BACKGROUND: Bright, luminous natural surfaces (light wood, bright marble, or warm stone)
- BRIGHT & INVITING: Well-illuminated backgrounds that make everything glow beautifully
- FOOD IS THE STAR: Every element designed to make the plated food irresistibly beautiful
- ARTISTIC PLATING: Michelin-star level food presentation with perfect color harmony
- VISUAL PERFECTION: Every grain, texture, and color optimized for maximum beauty
- PRISTINE CLEANLINESS: Spotless dishware and surfaces reflecting professional standards
- APPETIZING APPEAL: Food styled to trigger immediate hunger and desire

🔸 TECHNICAL QUALITY:
- CRYSTAL-CLEAR SHARPNESS: Every detail razor-sharp and perfectly in focus
- LUMINOUS COLOR PALETTE: Vibrant, saturated colors that make food look irresistible
- PERFECT EXPOSURE: Bright, well-exposed image with no dark areas or harsh shadows
- TEXTURE MASTERY: Every surface texture enhanced - from crispy edges to smooth sauces
- APPETIZING GLOW: Food appears to emit its own warm, inviting light
- PROFESSIONAL COLOR GRADING: Colors enhanced to maximum visual appeal

🔸 ARTISTIC ELEMENTS:
- MOUTHWATERING APPEAL: Food styled to be irresistibly beautiful and appetizing
- PERFECT COLOR HARMONY: Colors balanced for maximum visual pleasure and appetite appeal
- LUXURIOUS ATMOSPHERE: High-end restaurant ambiance with premium presentation
- VISUAL STORYTELLING: Every element tells the story of culinary perfection
- EMOTIONAL CONNECTION: Image evokes immediate desire and hunger for the dish

Generate a single, comprehensive prompt (max 400 words) that would create a photograph so realistic it could be published in a Michelin-starred restaurant's cookbook.

CRITICAL STYLING REQUIREMENTS:
- HERO FOCUS: The plated dish is the absolute star - everything serves to make it beautiful
- STUNNING DISHWARE: Museum-quality, elegant plates/bowls that complement the food perfectly
- PERFECT BRIGHT LIGHTING: Well-lit, luminous scene with no dark shadows anywhere
- BEAUTIFUL BACKGROUNDS: Bright, warm, natural surfaces that glow softly (light wood, bright marble, warm stone)
- APPETIZING PERFECTION: Food styled to be irresistibly beautiful and immediately hunger-inducing
- CAMERA ANGLE: Top-down or 45-degree angle that showcases the food's beauty maximally
- PRISTINE PRESENTATION: Every element polished to perfection
- COLOR MASTERY: Rich, vibrant colors that make the food look absolutely delicious
- PROFESSIONAL LIGHTING: Bright, even illumination that makes everything glow beautifully
- VISUAL FEAST: Create an image so beautiful it's impossible to look away from the food

Return ONLY the prompt, no explanation.`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a world-renowned food photographer and DALL-E prompt specialist. You create prompts that generate photorealistic, magazine-quality food photography that is indistinguishable from reality.'
          },
          {
            role: 'user',
            content: promptGenerationRequest
          }
        ],
        temperature: 0.9,  // High creativity for diverse prompts
        max_tokens: 500
      });

      const enhancedPrompt = completion.choices[0].message.content.trim();
      
      // Add final technical specifications for maximum realism
      const finalPrompt = `${enhancedPrompt}

TECHNICAL SPECIFICATIONS: Ultra-high resolution, professional food photography, shot with Canon EOS R5, 100mm macro lens, f/4 for perfect depth of field, ISO 100 for pristine quality, PREMIUM LIGHTING SETUP with multiple professional lights - bright key light, soft fill light, and background lighting for complete illumination, meticulously styled, Michelin-star restaurant quality, photorealistic, ultra-sharp details, vibrant color accuracy, commercial photography standard. LUMINOUS PERFECTION: Exquisite dishware, bright well-lit natural surface background, dish perfectly centered as the hero element, top-down or 45-degree angle, museum-quality plating that looks irresistibly delicious, every detail optimized for maximum beauty and appetite appeal.`;

      return finalPrompt;

    } catch (error) {
      console.error('❌ Photography prompt generation failed, using fallback:', error.message);
      
      // Fallback to professional prompt if AI fails
      return this.getFallbackPhotographyPrompt(recipeName, description);
    }
  }

  // Fallback ultra-detailed prompt if AI generation fails
  getFallbackPhotographyPrompt(recipeName, description) {
    return `Ultra-high resolution professional food photography of ${recipeName}. ${description ? description + '. ' : ''}Shot with Canon EOS R5, 100mm f/2.8L macro lens, aperture f/4 for perfect depth of field, ISO 100, 1/60s shutter speed. PREMIUM STUDIO LIGHTING SETUP: Multiple professional lights - large softbox key light, bright fill light, dedicated background lighting for complete illumination, warm color temperature 3200K. Food meticulously styled by world-class food stylist, artfully plated on EXQUISITE, MUSEUM-QUALITY dishware that elevates the food's beauty. CAMERA ANGLE: Top-down (overhead) or 45-degree side angle for maximum visual impact. HERO FRAMING: dish centered and fills 80% of frame as the absolute star. LUMINOUS BACKGROUND: Bright, well-lit natural surface (light wood, bright marble, or warm stone) that glows softly. PERFECT ILLUMINATION: Every detail brilliantly lit with no dark shadows anywhere. Ultra-sharp macro details showing every appetizing texture, glistening surfaces, natural steam, vibrant colors. Commercial food photography quality, Michelin-starred restaurant presentation, magazine cover worthy, photorealistic, indistinguishable from reality. APPETIZING PERFECTION: Colors enhanced for maximum visual appeal, perfect bright exposure, food appears irresistibly delicious. CRITICAL: Show only the finished plated dish on stunning dishware, bright well-lit scene, natural surface background, perfect camera angle, focused entirely on making the food look absolutely beautiful and mouth-watering.`;
  }

  // Return image data without uploading (upload handled by AdminRoutes)
  async downloadAndSaveImage(dalleUrl, recipeName, mealId = null) {
    try {
      console.log('📥 Image generation completed');
      console.log('🖼️ Image URL:', dalleUrl);
      console.log('📝 Recipe:', recipeName);
      console.log('🆔 Meal ID:', mealId);

      // Just return the image URL - Firebase upload will be handled by AdminRoutes
      return {
        url: dalleUrl,
        localPath: null,
        filename: this.sanitizeFilename(recipeName) + '.jpg',
        storage: 'temporary'
      };
    } catch (error) {
      console.error('❌ Image processing failed:', error.message);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  // Extract filename from Firebase Storage URL
  extractFilenameFromUrl(url) {
    try {
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1];
      return filename.split('?')[0]; // Remove query parameters
    } catch (error) {
      return 'firebase-image.jpg';
    }
  }

  // Utility methods
  sanitizeFilename(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50); // Limit length
  }

  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  // Improve existing recipe with AI suggestions
  async improveRecipe(existingRecipe) {
    try {
      const prompt = `Analyze and improve this recipe. Provide suggestions for:
1. Enhanced flavor combinations
2. Better cooking techniques  
3. Additional ingredients that would complement
4. Presentation improvements
5. Nutritional enhancements

Existing Recipe:
Name: ${existingRecipe.strMeal}
Category: ${existingRecipe.strCategory}
Area: ${existingRecipe.strArea}
Instructions: ${existingRecipe.strInstructions}
Ingredients: ${this.getIngredientsText(existingRecipe)}

Return JSON with:
- improvedName: Enhanced recipe name
- suggestions: Array of improvement suggestions
- enhancedInstructions: Improved cooking instructions
- additionalIngredients: Suggested new ingredients
- tips: Cooking tips and tricks`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a culinary expert focused on recipe improvement and optimization.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      return this.parseAIResponse(completion.choices[0].message.content);
    } catch (error) {
      console.error('❌ Recipe improvement error:', error.message);
      throw new Error(`Recipe improvement failed: ${error.message}`);
    }
  }

  // Generate seasonal recipe suggestions
  async generateSeasonalRecipes(season, count = 5) {
    try {
      const seasonalIngredients = {
        spring: 'asparagus, peas, artichokes, strawberries, rhubarb, spring onions',
        summer: 'tomatoes, corn, zucchini, berries, stone fruits, herbs',
        fall: 'pumpkin, squash, apples, pears, brussels sprouts, sweet potatoes',
        winter: 'root vegetables, citrus, pomegranates, cranberries, cabbage, leeks'
      };

      const ingredients = seasonalIngredients[season.toLowerCase()] || 'seasonal ingredients';

      const allowedIngredients = await this.getIngredientsList();

      const prompt = `Generate ${count} delicious ${season} recipes featuring seasonal ingredients like ${ingredients}. 

🚨 CRITICAL CONSTRAINT: ONLY use ingredients from this EXACT list (match names precisely): ${allowedIngredients.join(', ')}

For each recipe, return JSON format with:
- strMeal: Recipe name
- strCategory: Food category
- strArea: Cuisine origin
- instructions: Array of detailed cooking steps
- ingredientsDetailed: Array of ingredient objects with name, quantity, unit (MUST use allowed ingredients only)
- equipmentRequired: Array of equipment items
- strTags: Comma-separated tags
- seasonalHighlight: Why this recipe is perfect for ${season}

Return as JSON array.`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a seasonal cooking expert specializing in ${season} cuisine.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 3000
      });

      return this.parseAIResponse(completion.choices[0].message.content);
    } catch (error) {
      console.error('❌ Seasonal recipe generation error:', error.message);
      throw new Error(`Seasonal recipe generation failed: ${error.message}`);
    }
  }

  // Helper methods - COMPREHENSIVE RECIPE DATA GENERATION
  async buildRecipePrompt(params) {
    const restrictionsText = params.dietaryRestrictions.length > 0 
      ? ` The recipe must accommodate these dietary restrictions: ${params.dietaryRestrictions.join(', ')}.`
      : '';

    // 🚨 CRITICAL: ONLY USE INGREDIENTS FROM THIS EXACT LIST - MATCH NAMES PRECISELY
    const allowedIngredients = await this.getIngredientsList();

        const allowedEquipment = await this.getEquipmentList();

    return `Create an extremely detailed, comprehensive recipe with the following specifications:
- Cuisine: ${params.cuisine}
- Category: ${params.category}
- Main ingredient: ${params.mainIngredient || 'chef\'s choice'}
- Difficulty: ${params.difficulty}
- Cooking time: ${params.cookingTime}
- Servings: ${params.servings}
- Theme: ${params.theme || 'traditional'}${restrictionsText}

🚨 ABSOLUTE CRITICAL REQUIREMENTS - FAILURE TO FOLLOW = REJECTED:
1. 🚫 NEVER EVER use "N/A", "TBD", "Unknown", or any placeholder text
2. 🚫 ALL fields must have REAL, SPECIFIC values - no generic descriptions
3. 🍳 EQUIPMENT SELECTION: Choose 4-8 items from this comprehensive equipment list based on cooking methods and ingredients used:
   ${allowedEquipment.join(', ')}
4. 🚨 CRITICAL: ONLY use ingredients from this EXACT list - match names PRECISELY: ${allowedIngredients.join(', ')}
5. 🚨 INGREDIENT COMPLETENESS: EVERY ingredient mentioned in ANY instruction step MUST be listed in strIngredient1-20 with proper measurements. If instructions mention "eggs", "vanilla", "ice cream" etc., they MUST appear in the ingredient list!
6. 🥗 DIETARY ANALYSIS: Analyze ingredients and set dietary flags appropriately:
   - vegetarian: true if no meat, fish, or animal products (except dairy/eggs)
   - vegan: true if no animal products whatsoever (no meat, fish, dairy, eggs, honey)
   - pescatarian: true if contains fish but no other meat
   - keto: true if very low carb (under 10g carbs per serving)
   - lowCarb: true if moderate low carb (under 30g carbs per serving)
   - highProtein: true if over 25g protein per serving
   - glutenFree: true if no wheat, barley, rye, or gluten-containing ingredients
   - dairyFree: true if no milk, cheese, butter, cream, or dairy products
   - nutFree: true if no nuts or nut products
   - lowSodium: true if under 600mg sodium per serving
   - lowSugar: true if under 10g sugar per serving
   - mediterraneanDiet: true if uses olive oil, fish, vegetables, herbs typical of Mediterranean cuisine
7. ✅ Instructions must be COMPREHENSIVE cooking steps with 25-40 detailed actions (not descriptions)
8. ✅ All times must be specific numbers (15 min, 25 min, etc.)
9. ✅ All measurements must be precise (2 cups, 1 tbsp, etc.)
10. ✅ Generate complete ingredient slots 1-20
11. 🔧 EQUIPMENT INTELLIGENCE: Select equipment logically:
   - For chopping/prep: Chef's knife, Cutting board, Measuring cups/spoons
   - For stovetop cooking: Frying pan/Saucepan + Spatula + Tongs
   - For baking: Oven + Baking sheet/dish + Measuring tools
   - For mixing: Mixing bowls + Whisk/Spatula
   - For specific techniques: Wok for stir-fry, Dutch oven for braising, etc.

⚠️ IF YOU USE "N/A" ANYWHERE, THE ENTIRE RESPONSE IS INVALID ⚠️

Return ONLY valid JSON with this COMPLETE structure:

🚨 CRITICAL: strCategory MUST be EXACTLY one of these 6 values (case-sensitive):
   - Breakfast
   - Brunch
   - Lunch
   - Dinner
   - Snack
   - Dessert
   
   DO NOT use ANY other category names (no "Main Course", "Appetizer", "Side Dish", etc.)

{
  "strMeal": "Creative Recipe Name (never generic)",
  "strDrinkAlternate": "",
  "strCategory": "${params.category}",
  "strArea": "${params.cuisine}",
  "strInstructions": "Complete detailed cooking instructions",
  "strMealThumb": "PLACEHOLDER_FOR_IMAGE",
  "strTags": "comma,separated,relevant,tags",
  "strYoutube": "",
  "strSource": "AI Generated",
  "strImageSource": "",
  "strCreativeCommonsConfirmed": "",
  "dateModified": "${new Date().toISOString()}",
  
  "instructionsArray": [
    "Step 1: Begin by preparing the ingredients - wash and chop vegetables as needed for this specific recipe",
    "Step 2: Heat your cooking vessel over medium heat for 3-4 minutes until properly heated",
    "Step 3: Add oil and ingredients, cooking with specific temperatures and timing",
    "Step 4: Continue with 20+ more extremely detailed steps, each as a separate array item",
    "Step 5: Each step must be ultra-detailed with specific temperatures, exact times, visual cues, techniques, and professional tips",
    "Step 6: ONLY include steps that are ACTUALLY NEEDED for this recipe - no unnecessary steps",
    "...continue with remaining steps, ensuring each is a separate array item with Step X: prefix..."
  ],
  
  "ingredientsArray": [
    {
      "name": "specific ingredient name",
      "amount": "precise amount",
      "unit": "cups/tbsp/oz/etc",
      "notes": "preparation notes if needed"
    }
  ],
  
  "strIngredient1": "First ingredient name",
  "strMeasure1": "Precise measurement",
  "strIngredient2": "Second ingredient name", 
  "strMeasure2": "Precise measurement",
  "strIngredient3": "Third ingredient name",
  "strMeasure3": "Precise measurement",
  "strIngredient4": "Fourth ingredient name",
  "strMeasure4": "Precise measurement",
  "strIngredient5": "Fifth ingredient name",
  "strMeasure5": "Precise measurement",
  "strIngredient6": "Sixth ingredient name",
  "strMeasure6": "Precise measurement",
  "strIngredient7": "Seventh ingredient name",
  "strMeasure7": "Precise measurement",
  "strIngredient8": "Eighth ingredient name",
  "strMeasure8": "Precise measurement",
  "strIngredient9": "",
  "strMeasure9": "",
  "strIngredient10": "",
  "strMeasure10": "",
  "strIngredient11": "",
  "strMeasure11": "",
  "strIngredient12": "",
  "strMeasure12": "",
  "strIngredient13": "",
  "strMeasure13": "",
  "strIngredient14": "",
  "strMeasure14": "",
  "strIngredient15": "",
  "strMeasure15": "",
  "strIngredient16": "",
  "strMeasure16": "",
  "strIngredient17": "",
  "strMeasure17": "",
  "strIngredient18": "",
  "strMeasure18": "",
  "strIngredient19": "",
  "strMeasure19": "",
  "strIngredient20": "",
  "strMeasure20": "",
  
  "nutrition": {
    "calories": "350",
    "protein": "28g",
    "carbs": "45g",
    "fat": "12g",
    "fiber": "4g",
    "sugar": "6g",
    "sodium": "580mg"
  },
  
  "dietary": {
    "vegetarian": false,
    "vegan": false,
    "pescatarian": false,
    "keto": false,
    "lowCarb": false,
    "highProtein": false,
    "glutenFree": false,
    "dairyFree": false,
    "nutFree": false,
    "lowSodium": false,
    "lowSugar": false,
    "mediterraneanDiet": false
  },
  
  "cookingInfo": {
    "prepTime": "15 minutes",
    "cookTime": "25 minutes", 
    "totalTime": "40 minutes",
    "servings": ${params.servings},
    "difficulty": "${params.difficulty}",
    "equipment": ${JSON.stringify((await this.getEquipmentList()).slice(0, 3))},
    "yield": "Serves ${params.servings}"
  }
}

🚨 ABSOLUTE REQUIREMENTS - ZERO TOLERANCE FOR N/A:
- Fill ALL ingredient slots (1-20) - use empty string "" for unused slots, NEVER null or undefined
- Create 6-12 detailed COOKING STEPS (not descriptions) - "Heat oil in pan", "Add chicken and cook 5 minutes"
- Use ONLY the allowed equipment list provided above
- 🚫 BANNED WORDS: "N/A", "TBD", "Unknown", "Various"
- ✅ REQUIRED: Specific times (15 min, 25 min), specific amounts (2 cups, 1 tbsp)
- ✅ REQUIRED: Real nutritional values (350 calories, 28g protein)
- ✅ REQUIRED: Specific recipe names (Tuscan Herb Chicken Pasta, not "Pasta Dish")
- ✅ REQUIRED: Actual cooking instructions with temperatures (350°F, medium heat)
- ✅ REQUIRED: Precise measurements for ALL ingredients

🔥 VALIDATION CHECK: Scan your entire response and replace ANY "N/A" with real values before returning!`;
  }

  /**
   * Validate that recipe has all required fields calculated from actual recipe data
   * Throws error if critical fields are missing
   */
  validateRecipeCompleteness(recipeData, ingredientsDetailed, instructionsArray) {
    const errors = [];
    
    // Check nutrition - MUST be calculated from ingredients
    if (!recipeData.nutrition || !recipeData.nutrition.caloriesPerServing) {
      errors.push('MISSING: nutrition.caloriesPerServing - must be calculated from actual ingredients');
    } else if (recipeData.nutrition.caloriesPerServing === 350 && !recipeData.nutrition.protein) {
      // Check if it's the default fallback value
      errors.push('INVALID: nutrition appears to use fallback values (350 calories) - must calculate from actual ingredients');
    }
    
    // Check servings - MUST be calculated from ingredient quantities
    const servings = parseInt(recipeData.numberOfServings) || parseInt(recipeData.servings);
    if (!servings || servings <= 0) {
      errors.push('MISSING: numberOfServings - must be calculated from ingredient quantities');
    }
    
    // Check difficulty - MUST be calculated from recipe complexity
    if (!recipeData.difficulty || !['Easy', 'Medium', 'Hard'].includes(recipeData.difficulty)) {
      errors.push('MISSING: difficulty - must be calculated from recipe complexity (steps, techniques)');
    }
    
    // Check occasion - MUST be determined from recipe type/ingredients
    // Valid occasions: Weeknight, Weekend, Holiday, Date Night, Party, Breakfast, Brunch, etc.
    // NOTE: "Weeknight" is a VALID occasion - don't reject it just because it's common!
    const validOccasions = ['Weeknight', 'Weekend', 'Holiday', 'Date Night', 'Party', 'Breakfast', 'Brunch', 'Romantic Dinner', 'Entertaining', 'Special Occasion', 'Leisurely Cooking', 'Family Dinner'];
    const occasionValue = Array.isArray(recipeData.occasion) ? recipeData.occasion : (recipeData.occasion ? [recipeData.occasion] : []);
    
    if (!recipeData.occasion || occasionValue.length === 0) {
      errors.push('MISSING: occasion - must be determined from recipe type/ingredients');
    } else {
      // Check if all values are valid (allow "Weeknight" as it's a legitimate choice)
      const hasValidOccasion = occasionValue.some(occ => {
        const occLower = occ.toLowerCase();
        return validOccasions.includes(occ) || 
               occLower.includes('weeknight') || 
               occLower.includes('weekend') || 
               occLower.includes('holiday') || 
               occLower.includes('party') || 
               occLower.includes('date') ||
               occLower.includes('breakfast') ||
               occLower.includes('brunch');
      });
      if (!hasValidOccasion) {
        errors.push('INVALID: occasion - must be a valid occasion type (Weeknight, Weekend, Holiday, Date Night, Party, etc.)');
      }
    }
    
    // Check seasonality - MUST be determined from ingredients
    // NOTE: "All Season" is a VALID seasonality - don't reject it just because it's common!
    const validSeasonality = ['Spring', 'Summer', 'Fall', 'Winter', 'All Season'];
    const seasonalityValue = Array.isArray(recipeData.seasonality) ? recipeData.seasonality : (recipeData.seasonality ? [recipeData.seasonality] : []);
    
    if (!recipeData.seasonality || seasonalityValue.length === 0) {
      errors.push('MISSING: seasonality - must be determined from ingredients');
    } else {
      // Check if all values are valid (allow "All Season" as it's a legitimate choice for some recipes)
      const hasValidSeasonality = seasonalityValue.some(season => {
        const seasonLower = season.toLowerCase();
        return validSeasonality.includes(season) || 
               seasonLower.includes('spring') || 
               seasonLower.includes('summer') || 
               seasonLower.includes('fall') || 
               seasonLower.includes('winter') || 
               seasonLower.includes('all');
      });
      if (!hasValidSeasonality) {
        errors.push('INVALID: seasonality - must be a valid season (Spring, Summer, Fall, Winter, All Season)');
      }
    }
    
    // Check skills required - MUST be extracted from instructions
    if (!recipeData.skillsRequired || !Array.isArray(recipeData.skillsRequired) || recipeData.skillsRequired.length === 0) {
      errors.push('MISSING: skillsRequired - must be extracted from actual cooking techniques in instructions');
    } else if (recipeData.skillsRequired.length === 2 && 
               recipeData.skillsRequired.includes('Chopping') && 
               recipeData.skillsRequired.includes('Cooking')) {
      // Check if it's the default
      errors.push('INVALID: skillsRequired appears to use default values - must extract from actual instructions');
    }
    
    if (errors.length > 0) {
      throw new Error(`RECIPE GENERATION FAILED - Missing or invalid calculated fields:\n${errors.map(e => `  ❌ ${e}`).join('\n')}\n\nAI must calculate ALL values from the actual recipe/ingredients, not use defaults.`);
    }
  }

  /**
   * Calculate servings from ingredient quantities
   */
  calculateServingsFromIngredients(ingredientsDetailed) {
    if (!ingredientsDetailed || ingredientsDetailed.length === 0) {
      return null;
    }
    
    // Analyze ingredient quantities to estimate servings
    // This is a heuristic - AI should do better, but we can estimate
    let totalVolume = 0;
    let proteinSources = 0;
    let carbSources = 0;
    
    ingredientsDetailed.forEach(ing => {
      const qty = parseFloat(ing.quantity) || 0;
      const unit = (ing.unit || '').toLowerCase();
      
      // Estimate volume
      if (unit.includes('cup')) {
        totalVolume += qty * 240; // ml per cup
      } else if (unit.includes('tbsp')) {
        totalVolume += qty * 15; // ml per tbsp
      } else if (unit.includes('tsp')) {
        totalVolume += qty * 5; // ml per tsp
      } else if (unit.includes('lb') || unit.includes('pound')) {
        totalVolume += qty * 450; // rough ml equivalent
      } else if (unit.includes('oz')) {
        totalVolume += qty * 30; // rough ml equivalent
      }
      
      // Count protein sources
      const name = ing.name.toLowerCase();
      if (name.includes('chicken') || name.includes('beef') || name.includes('pork') || 
          name.includes('fish') || name.includes('egg') || name.includes('tofu')) {
        proteinSources += qty;
      }
      
      // Count carb sources
      if (name.includes('rice') || name.includes('pasta') || name.includes('bread') || 
          name.includes('potato') || name.includes('flour')) {
        carbSources += qty;
      }
    });
    
    // Estimate servings based on volume and protein sources
    // Rough heuristic: 300-400ml per serving for main dishes
    if (totalVolume > 0) {
      const estimated = Math.max(2, Math.min(8, Math.round(totalVolume / 350)));
      return estimated;
    }
    
    // Fallback based on protein sources
    if (proteinSources > 0) {
      return Math.max(2, Math.min(6, Math.round(proteinSources * 2)));
    }
    
    return null; // Can't calculate
  }

  /**
   * Calculate difficulty from recipe complexity
   */
  calculateDifficultyFromComplexity(instructionsArray, ingredientsDetailed, equipmentRequired) {
    if (!instructionsArray || instructionsArray.length === 0) {
      return null;
    }
    
    const stepCount = instructionsArray.length;
    const ingredientCount = ingredientsDetailed?.length || 0;
    const equipmentCount = equipmentRequired?.length || 0;
    
    // Count advanced techniques
    const instructionsText = instructionsArray.join(' ').toLowerCase();
    const advancedTechniques = [
      'sous vide', 'temper', 'emulsify', 'braise', 'confit', 'sous-vide',
      'molecular', 'spherification', 'foam', 'gel', 'ferment'
    ];
    const hasAdvancedTechniques = advancedTechniques.some(tech => instructionsText.includes(tech));
    
    // Count cooking methods
    const methods = ['bake', 'roast', 'grill', 'fry', 'sauté', 'steam', 'boil', 'simmer', 'braise'];
    const methodCount = methods.filter(method => instructionsText.includes(method)).length;
    
    let complexityScore = 0;
    
    // Step count (0-3 points)
    if (stepCount > 30) complexityScore += 3;
    else if (stepCount > 20) complexityScore += 2;
    else if (stepCount > 10) complexityScore += 1;
    
    // Ingredient count (0-2 points)
    if (ingredientCount > 12) complexityScore += 2;
    else if (ingredientCount > 8) complexityScore += 1;
    
    // Equipment count (0-1 points)
    if (equipmentCount > 6) complexityScore += 1;
    
    // Advanced techniques (0-2 points)
    if (hasAdvancedTechniques) complexityScore += 2;
    else if (methodCount > 4) complexityScore += 1;
    
    // Determine difficulty
    if (complexityScore >= 6) return 'Hard';
    if (complexityScore >= 3) return 'Medium';
    return 'Easy';
  }

  /**
   * Extract skills required from instructions
   */
  extractSkillsFromInstructions(instructionsArray) {
    if (!instructionsArray || instructionsArray.length === 0) {
      return [];
    }
    
    const instructionsText = instructionsArray.join(' ').toLowerCase();
    const skills = [];
    
    // Detect skills from instructions
    if (instructionsText.match(/\b(chop|dice|mince|slice|julienne|brunoise)\b/)) {
      skills.push('Chopping');
    }
    if (instructionsText.match(/\b(whisk|beat|whip|fold|stir)\b/)) {
      skills.push('Mixing');
    }
    if (instructionsText.match(/\b(bake|roast|broil)\b/)) {
      skills.push('Baking');
    }
    if (instructionsText.match(/\b(sauté|fry|pan-fry|sear)\b/)) {
      skills.push('Sautéing');
    }
    if (instructionsText.match(/\b(grill|barbecue|bbq)\b/)) {
      skills.push('Grilling');
    }
    if (instructionsText.match(/\b(steam|boil|simmer|braise)\b/)) {
      skills.push('Stovetop Cooking');
    }
    if (instructionsText.match(/\b(knead|roll|fold|laminate)\b/)) {
      skills.push('Pastry Work');
    }
    if (instructionsText.match(/\b(temper|emulsify|reduce|deglaze)\b/)) {
      skills.push('Advanced Techniques');
    }
    if (instructionsText.match(/\b(marinate|brine|cure)\b/)) {
      skills.push('Preparation');
    }
    
    // Always include basic cooking if we have instructions
    if (skills.length === 0) {
      skills.push('Basic Cooking');
    }
    
    return skills;
  }

  /**
   * Determine occasion from recipe type and ingredients
   */
  determineOccasion(recipeData, ingredientsDetailed) {
    const category = recipeData.strCategory?.toLowerCase() || '';
    const dishType = recipeData.dishType?.toLowerCase() || '';
    const name = recipeData.strMeal?.toLowerCase() || '';
    const ingredients = ingredientsDetailed?.map(i => i.name.toLowerCase()).join(' ') || '';
    
    const occasions = [];
    
    // Breakfast/Brunch
    if (category.includes('breakfast') || category.includes('brunch') || 
        name.includes('breakfast') || name.includes('brunch') ||
        ingredients.includes('bacon') && ingredients.includes('egg')) {
      occasions.push('Breakfast', 'Brunch');
    }
    
    // Special occasions
    if (name.includes('holiday') || name.includes('christmas') || name.includes('thanksgiving') ||
        ingredients.includes('turkey') || ingredients.includes('ham')) {
      occasions.push('Holiday', 'Special Occasion');
    }
    
    // Date night / romantic
    if (name.includes('romantic') || name.includes('date') || 
        ingredients.includes('wine') || ingredients.includes('champagne')) {
      occasions.push('Date Night', 'Romantic Dinner');
    }
    
    // Party / entertaining
    if (dishType.includes('appetizer') || dishType.includes('dip') || 
        name.includes('party') || name.includes('finger food')) {
      occasions.push('Party', 'Entertaining');
    }
    
    // Weeknight (default for most)
    if (occasions.length === 0) {
      occasions.push('Weeknight');
    }
    
    // Weekend / leisurely
    if (category.includes('dinner') && ingredients.includes('slow') || 
        dishType.includes('stew') || dishType.includes('roast')) {
      occasions.push('Weekend', 'Leisurely Cooking');
    }
    
    return occasions;
  }

  /**
   * Determine seasonality from ingredients
   */
  determineSeasonality(ingredientsDetailed) {
    if (!ingredientsDetailed || ingredientsDetailed.length === 0) {
      return ['All Season'];
    }
    
    const ingredients = ingredientsDetailed.map(i => i.name.toLowerCase()).join(' ');
    const seasons = [];
    
    // Spring ingredients
    if (ingredients.match(/\b(asparagus|peas|rhubarb|strawberry|artichoke|radish|spring onion)\b/)) {
      seasons.push('Spring');
    }
    
    // Summer ingredients
    if (ingredients.match(/\b(tomato|zucchini|corn|peach|berry|watermelon|cucumber|basil)\b/)) {
      seasons.push('Summer');
    }
    
    // Fall ingredients
    if (ingredients.match(/\b(pumpkin|squash|apple|cranberry|sweet potato|brussels sprout|kale)\b/)) {
      seasons.push('Fall');
    }
    
    // Winter ingredients
    if (ingredients.match(/\b(citrus|orange|grapefruit|root vegetable|winter squash|cabbage)\b/)) {
      seasons.push('Winter');
    }
    
    // If no seasonal ingredients detected, check for year-round
    if (seasons.length === 0) {
      // Check if it's mostly pantry/meat items
      const pantryItems = ingredients.match(/\b(rice|pasta|flour|chicken|beef|pork|onion|garlic|potato)\b/g);
      if (pantryItems && pantryItems.length > 3) {
        return ['All Season'];
      }
    }
    
    return seasons.length > 0 ? seasons : ['All Season'];
  }

  // COMPREHENSIVE recipe formatting - NO N/A VALUES EVER
  async quickFormatRecipe(recipeData, params) {
    console.log('🧹 CLEAN FORMAT: Using ONLY modern array-based fields (NO duplicates!)');
    
    // ✅ INSTRUCTIONS: ONLY array format
    let instructionsArray = recipeData.instructions || [];
    
    // If instructions is a string instead of array, split it
    if (typeof instructionsArray === 'string') {
      console.log('⚠️  Instructions came as string, splitting into array...');
      instructionsArray = this.parseInstructionsToArray(instructionsArray);
    }
    
    // Ensure it's an array
    if (!Array.isArray(instructionsArray) || instructionsArray.length === 0) {
      if (recipeData.strInstructions) {
        // Convert old string format to array if present
        instructionsArray = this.parseInstructionsToArray(recipeData.strInstructions);
      } else {
        instructionsArray = ['Prepare ingredients according to recipe', 'Cook as directed', 'Serve hot'];
      }
    }
    
    // Ensure each instruction is a separate string (not combined)
    instructionsArray = instructionsArray.map(inst => {
      if (typeof inst === 'string' && inst.includes('Step 1:') && inst.includes('Step 2:')) {
        // If a single string contains multiple steps, split it
        console.log('⚠️  Found combined steps in single string, splitting...');
        return inst.split(/Step \d+:/i).filter(s => s.trim()).map(s => s.trim());
      }
      return inst;
    }).flat().filter(inst => inst && inst.trim().length > 0);
    
    // Strip "Step X:" prefixes from instructions (AI generates with prefixes, we remove them)
    instructionsArray = instructionsArray.map(inst => {
      if (typeof inst === 'string') {
        // Remove "Step 1:", "Step 2:", "Step 10:", "Step 25:", etc. from the beginning of each instruction
        // \d+ matches one or more digits, so it works for single digit (Step 1:) and multi-digit (Step 10:, Step 25:, etc.)
        const cleaned = inst.replace(/^Step\s+\d+:\s*/i, '').trim();
        return cleaned;
      }
      return inst;
    }).filter(inst => inst && inst.trim().length > 0);
    
    // ✅ INGREDIENTS: ONLY detailed array format
    let ingredientsDetailed = Array.isArray(recipeData.ingredientsDetailed) ? recipeData.ingredientsDetailed : [];
    if (ingredientsDetailed.length === 0) {
      // Convert old strIngredient1-20 format to detailed array if present
      for (let i = 1; i <= 20; i++) {
        const ingredient = recipeData[`strIngredient${i}`];
        const measure = recipeData[`strMeasure${i}`];
        if (ingredient && ingredient.trim()) {
          const parts = (measure || '').split(' ');
          ingredientsDetailed.push({
            name: ingredient.trim(),
            quantity: parts[0] || '1',
            unit: parts.slice(1).join(' ') || 'unit',
            optional: false,
            required: true
          });
        }
      }
    }
    
    // ✅ EQUIPMENT: ONLY array format
    let equipmentRequired = Array.isArray(recipeData.equipmentRequired) ? recipeData.equipmentRequired : [];
    if (equipmentRequired.length === 0) {
      if (recipeData.strEquipment) {
        // Convert old string format to array if present
        equipmentRequired = recipeData.strEquipment.split(',').map(e => e.trim()).filter(e => e);
      } else {
        equipmentRequired = ['Appropriate cooking vessel (skillet/pan/oven/bowl based on recipe)', 'Chef\'s knife', 'Cutting Board', 'Measuring Cups'];
      }
    }

    const recipe = {
      // ✅ Core recipe data (keep these)
      strMeal: recipeData.strMeal || `Delicious ${params.cuisine || 'International'} ${params.category || 'Dish'}`,
      strDescription: recipeData.strDescription || `A delicious ${params.cuisine || 'international'} ${params.category || 'dish'} that's perfect for any occasion.`,
      strCategory: recipeData.strCategory || params.mealType || 'Dinner',
      strArea: recipeData.strArea || params.cuisine || 'International', 
      strMealThumb: recipeData.strMealThumb || '',
      additionalImages: Array.isArray(recipeData.additionalImages) ? recipeData.additionalImages : [],
      strTags: recipeData.strTags || `${params.cuisine || 'international'},${params.category || 'dish'},${params.difficulty || 'medium'}`.toLowerCase(),
      strYoutube: '',
      strSource: 'AI Generated',
      dateModified: new Date().toISOString(),
      
      // ✅ INSTRUCTIONS: ONLY array (NO strInstructions)
      instructions: instructionsArray,
      
      // ✅ INGREDIENTS: ONLY detailed array (NO strIngredient1-20)
      ingredientsDetailed: ingredientsDetailed,
      
      // ✅ EQUIPMENT: ONLY array (NO strEquipment)
      equipmentRequired: equipmentRequired,
      
      // ✅ TIME AND SERVING INFO
      // Use smart defaults ONLY as fallback if AI didn't provide values (should be rare)
      // The AI should always calculate times/servings based on the actual recipe
      ...(() => {
        const smartDefaults = this.getSmartDefaults(
          recipeData.strCategory || params.filters?.category || 'Dinner',
          recipeData.dishType || params.filters?.dishType || 'Main Courses',
          recipeData.difficulty || params.difficulty || params.randomDifficulty || 'Medium',
          params.servings || parseInt(recipeData.servings) || parseInt(recipeData.numberOfServings)
        );
        // Only use defaults if AI didn't provide a value (null, undefined, NaN, empty string)
        // Note: 0 is a valid value (e.g., no-cook recipes have 0 cookTime), so we check for null/undefined/NaN
        const prepTime = parseInt(recipeData.prepTime);
        const cookTime = parseInt(recipeData.cookTime);
        const totalTime = parseInt(recipeData.totalTime);
        const numberOfServings = parseInt(recipeData.numberOfServings) || parseInt(recipeData.servings) || params.servings;
        
        // Log when defaults are used
        const usedDefaults = [];
        const finalPrepTime = (!isNaN(prepTime) && prepTime !== null && prepTime !== undefined) ? prepTime : (usedDefaults.push('prepTime'), smartDefaults.prepTime);
        const finalCookTime = (!isNaN(cookTime) && cookTime !== null && cookTime !== undefined) ? cookTime : (usedDefaults.push('cookTime'), smartDefaults.cookTime);
        const finalTotalTime = (!isNaN(totalTime) && totalTime !== null && totalTime !== undefined) 
            ? totalTime 
            : ((!isNaN(prepTime) && !isNaN(cookTime) && prepTime !== null && cookTime !== null) 
              ? prepTime + cookTime 
              : (usedDefaults.push('totalTime'), smartDefaults.totalTime));
        const finalServings = (numberOfServings && numberOfServings > 0) ? numberOfServings : (usedDefaults.push('numberOfServings'), smartDefaults.numberOfServings);
        
        if (usedDefaults.length > 0) {
          console.log(`⚠️  FALLBACK USED: AI didn't provide ${usedDefaults.join(', ')}. Using smart defaults:`);
          if (usedDefaults.includes('prepTime')) console.log(`   📝 prepTime: ${finalPrepTime} min (default for ${recipeData.strCategory || 'Dinner'})`);
          if (usedDefaults.includes('cookTime')) console.log(`   🔥 cookTime: ${finalCookTime} min (default for ${recipeData.strCategory || 'Dinner'})`);
          if (usedDefaults.includes('totalTime')) console.log(`   ⏱️  totalTime: ${finalTotalTime} min (default for ${recipeData.strCategory || 'Dinner'})`);
          if (usedDefaults.includes('numberOfServings')) console.log(`   🍽️  numberOfServings: ${finalServings} (default for ${recipeData.strCategory || 'Dinner'})`);
        } else {
          console.log(`✅ AI provided all times/servings: prep=${finalPrepTime}min, cook=${finalCookTime}min, total=${finalTotalTime}min, servings=${finalServings}`);
        }
        
        return {
          prepTime: finalPrepTime,
          cookTime: finalCookTime,
          totalTime: finalTotalTime,
          numberOfServings: finalServings
        };
      })(),
      servingSize: recipeData.servingSize || '1 serving',
      
      // ✅ DIFFICULTY: Calculate from recipe complexity
      difficulty: recipeData.difficulty || this.calculateDifficultyFromComplexity(instructionsArray, ingredientsDetailed, equipmentRequired) || (() => {
        throw new Error('MISSING: difficulty - must be calculated from recipe complexity (steps, techniques, ingredients)');
      })(),
      
      yield: recipeData.yield || `${parseInt(recipeData.numberOfServings) || this.calculateServingsFromIngredients(ingredientsDetailed) || (() => {
        throw new Error('MISSING: numberOfServings - must be calculated from ingredient quantities');
      })()} servings`,
      
      // ✅ NUTRITION: MUST be calculated from actual ingredients - NO FALLBACKS
      nutrition: recipeData.nutrition || (() => {
        throw new Error('MISSING: nutrition - must be calculated from actual ingredients. AI must provide caloriesPerServing, protein, carbs, fat, etc. based on ingredient quantities.');
      })(),
      
      // ✅ DIETARY: Calculate from ingredients if not provided
      dietary: recipeData.dietary || (() => {
        // Use analyzeDietary if available (from MultiStepGenerator), otherwise calculate here
        if (this.multiStepGenerator && this.multiStepGenerator.analyzeDietary) {
          return this.multiStepGenerator.analyzeDietary(ingredientsDetailed.map(i => ({ ingredient: i.name, measure: `${i.quantity} ${i.unit}` })), params.filters || {});
        }
        // Basic calculation
        const ingredientNames = ingredientsDetailed.map(i => i.name.toLowerCase()).join(' ');
        const hasMeat = /beef|pork|chicken|turkey|lamb|duck|veal|venison/.test(ingredientNames);
        const hasSeafood = /fish|salmon|tuna|shrimp|crab|lobster|oyster|clam|mussel/.test(ingredientNames);
        const hasDairy = /milk|cheese|butter|cream|yogurt/.test(ingredientNames);
        const hasEggs = /egg/.test(ingredientNames);
        const hasGluten = /flour|bread|pasta|wheat|barley|rye/.test(ingredientNames);
        
        return {
          vegetarian: !hasMeat && !hasSeafood,
          vegan: !hasMeat && !hasSeafood && !hasDairy && !hasEggs,
          pescatarian: hasSeafood && !hasMeat,
          glutenFree: !hasGluten,
          dairyFree: !hasDairy,
          nutFree: !/almond|peanut|walnut|pecan|cashew|pistachio|hazelnut/.test(ingredientNames),
          keto: false, // Would need nutrition calc
          paleo: !hasGluten && !hasDairy && !ingredientsDetailed.some(i => i.name.toLowerCase().includes('bean')),
          halal: !ingredientsDetailed.some(i => i.name.toLowerCase().includes('pork')),
          noRedMeat: !/(beef|pork|lamb|veal)/.test(ingredientNames),
          noPork: !/pork/.test(ingredientNames),
          noShellfish: !/(shrimp|crab|lobster|oyster|clam|mussel)/.test(ingredientNames),
          omnivore: hasMeat || hasSeafood
        };
      })(),
      
      // ✅ CATEGORIZATION
      mealType: Array.isArray(recipeData.mealType) ? recipeData.mealType : [recipeData.mealType || params.category || params.randomCategory || 'Dinner'],
      dishType: recipeData.dishType || params.dishType || params.randomDishType || this.getRandomDishType(params),
      mainIngredient: recipeData.mainIngredient || params.mainIngredient || this.extractMainIngredient(recipeData, ingredientsDetailed) || 'Mixed ingredients',
      
      // ✅ OCCASION: Determine from recipe type/ingredients
      occasion: Array.isArray(recipeData.occasion) && recipeData.occasion.length > 0 && !recipeData.occasion.includes('Weeknight') 
        ? recipeData.occasion 
        : this.determineOccasion(recipeData, ingredientsDetailed),
      
      // ✅ SEASONALITY: Determine from ingredients
      seasonality: Array.isArray(recipeData.seasonality) && recipeData.seasonality.length > 0 && !recipeData.seasonality.includes('All Season')
        ? recipeData.seasonality
        : this.determineSeasonality(ingredientsDetailed),
      
      // ✅ SKILLS REQUIRED: Extract from instructions
      skillsRequired: Array.isArray(recipeData.skillsRequired) && recipeData.skillsRequired.length > 0 && 
                      !(recipeData.skillsRequired.length === 2 && recipeData.skillsRequired.includes('Chopping') && recipeData.skillsRequired.includes('Cooking'))
        ? recipeData.skillsRequired
        : this.extractSkillsFromInstructions(instructionsArray),
      
      // ✅ SEARCH & FILTER
      keywords: Array.isArray(recipeData.keywords) ? recipeData.keywords : [params.cuisine || 'international', params.category || 'dish'],
      alternateTitles: Array.isArray(recipeData.alternateTitles) ? recipeData.alternateTitles : [],
      commonMisspellings: Array.isArray(recipeData.commonMisspellings) ? recipeData.commonMisspellings : [],
      allergenFlags: Array.isArray(recipeData.allergenFlags) ? recipeData.allergenFlags : [],
      timeCategory: recipeData.timeCategory || 'Under 1 hour'
    };

    // ❌ NO MORE: strIngredient1-20, strMeasure1-20
    // ❌ NO MORE: strInstructions
    // ❌ NO MORE: strEquipment
    // ❌ NO MORE: imageUrls, images arrays
    
    // 🧹 NUCLEAR OPTION: Strip ALL duplicate fields if AI included them
    this.stripDuplicateFields(recipe);
    
    // 🧹 Clean up the ingredients array (remove duplicates and fix "to taste")
    recipe.ingredientsDetailed = this.cleanIngredientsArray(recipe.ingredientsDetailed);
    
    // ✅ VALIDATE: Ensure all critical fields are calculated from actual recipe data
    try {
      this.validateRecipeCompleteness(recipe, recipe.ingredientsDetailed, recipe.instructions);
      console.log('✅ Recipe validation passed - all fields calculated from actual recipe data');
    } catch (error) {
      console.error('❌ RECIPE VALIDATION FAILED:', error.message);
      throw error; // Fail the generation
    }
    
    // ✅ CRITICAL FIX #1: Calculate timeCategory based on ACTUAL totalTime (not AI's guess!)
    const totalTime = recipe.totalTime || recipe.prepTime + recipe.cookTime;
    if (totalTime <= 15) {
      recipe.timeCategory = 'Quick (15 mins or less)';
    } else if (totalTime <= 30) {
      recipe.timeCategory = 'Under 30 minutes';
    } else if (totalTime <= 60) {
      recipe.timeCategory = 'Under 1 hour';
    } else if (totalTime <= 120) {
      recipe.timeCategory = 'Under 2 hours';
    } else {
      recipe.timeCategory = '2+ hours';
    }
    console.log(`⏱️ Time category calculated: ${totalTime} mins → "${recipe.timeCategory}"`);
    
    // ✅ CRITICAL FIX #2: ENFORCE dishType from user selection (AI can't override!)
    if (params.dishType) {
      console.log(`🔒 Enforcing user-selected dishType: "${recipe.dishType}" → "${params.dishType}"`);
      recipe.dishType = params.dishType;
    }
    
    // ✅ CRITICAL FIX #3: ENFORCE category from user selection
    if (params.mealType) {
      console.log(`🔒 Enforcing user-selected category: "${recipe.strCategory}" → "${params.mealType}"`);
      recipe.strCategory = params.mealType;
    }
    
    console.log('✅ Clean recipe format created (array-based only)');
    return recipe;
  }

  /**
   * 🧹 STRIP ALL DUPLICATE FIELDS
   * Removes old format fields to ensure ONLY modern arrays
   */
  stripDuplicateFields(recipe) {
    console.log('🧹 Stripping duplicate fields from recipe...');
    
    // Remove strIngredient1-20 and strMeasure1-20
    for (let i = 1; i <= 20; i++) {
      delete recipe[`strIngredient${i}`];
      delete recipe[`strMeasure${i}`];
    }
    
    // Remove string versions of array fields
    delete recipe.strInstructions;
    delete recipe.strEquipment;
    delete recipe.imageUrls;
    delete recipe.images;
    
    console.log('✅ Duplicate fields stripped! Recipe is now 100% clean.');
  }

  /**
   * 🧹 CLEAN INGREDIENTS ARRAY
   * Removes duplicates, fixes "to taste", removes optional garnishes
   */
  cleanIngredientsArray(ingredients) {
    if (!ingredients || !Array.isArray(ingredients)) {
      return [];
    }

    console.log(`🧹 Cleaning ingredients array (${ingredients.length} items)...`);
    
    const seen = new Map(); // Track unique ingredient names (normalized)
    const cleaned = [];
    
    for (const ing of ingredients) {
      const name = ing.name.toLowerCase().trim();
      
      // 🧠 AGGRESSIVE NORMALIZATION: Catch all duplicates!
      const normalizedName = name
        // Remove adjectives (red, green, white, brown, fresh, dried)
        .replace(/^(red|green|white|brown|fresh|dried|yellow|purple|black)\s+/i, '')
        // Remove grain types (short-grain, long-grain)
        .replace(/^(short-grain |long-grain )/i, '')
        // Remove form modifiers at end (stick, ground, powder, etc.)
        .replace(/\s+(stick|sticks|ground|powder|powdered|fresh|dried|chopped|minced|sliced|diced|whole)$/i, '')
        // Remove plurals: "tomatoes" → "tomato", "eggs" → "egg"
        .replace(/ies$/i, 'y')  // berries → berry
        .replace(/oes$/i, 'o')  // tomatoes → tomato, potatoes → potato
        .replace(/ses$/i, 's')  // glasses → glass
        .replace(/s$/i, '');    // eggs → egg, onions → onion
      
      // Skip if we've already seen this ingredient (or a close variant)
      if (seen.has(normalizedName)) {
        console.log(`   ❌ DUPLICATE REMOVED: "${ing.name}" (normalized as "${normalizedName}", already have "${seen.get(normalizedName)}")`);
        continue;
      }
      
      // Convert vague measurements to exact measurements
      // Check both unit and quantity fields for vague terms
      const vaguePatterns = ['to taste', 'to garnish', 'to serve', 'as needed', 'for garnish', 'for serving'];
      const hasVagueMeasurement = vaguePatterns.some(pattern => {
        const unitMatch = ing.unit && (ing.unit === pattern || ing.unit.includes(pattern));
        const quantityMatch = ing.quantity && (ing.quantity === pattern || ing.quantity.includes(pattern));
        return unitMatch || quantityMatch;
      });
      
      if (hasVagueMeasurement) {
        // Convert "to taste" / "to garnish" / "to serve" to exact measurements
        const ingredientName = ing.name.toLowerCase();
        
        // Default measurements for common seasonings
        if (ingredientName.includes('salt')) {
          ing.quantity = '1/2';
          ing.unit = 'tsp';
          console.log(`   ✅ FIXED: "${ing.name}" - converted vague measurement to "1/2 tsp"`);
        } else if (ingredientName.includes('pepper') || ingredientName.includes('black pepper')) {
          ing.quantity = '1/4';
          ing.unit = 'tsp';
          console.log(`   ✅ FIXED: "${ing.name}" - converted vague measurement to "1/4 tsp"`);
        } else if (ingredientName.includes('cilantro') || ingredientName.includes('parsley') || 
                   ingredientName.includes('basil') || ingredientName.includes('herb') ||
                   ingredientName.includes('olive') || ingredientName.includes('garnish')) {
          ing.quantity = '2';
          ing.unit = 'tbsp';
          console.log(`   ✅ FIXED: "${ing.name}" - converted vague measurement to "2 tbsp"`);
        } else {
          // Generic fallback: use reasonable defaults
          ing.quantity = '1';
          ing.unit = 'tsp';
          console.log(`   ✅ FIXED: "${ing.name}" - converted vague measurement to "1 tsp"`);
        }
      }
      
      // Add to cleaned array
      seen.set(normalizedName, ing.name);
      cleaned.push(ing);
    }
    
    console.log(`✅ Ingredients cleaned: ${ingredients.length} → ${cleaned.length} (removed ${ingredients.length - cleaned.length} duplicates/optionals)`);
    return cleaned;
  }

  /**
   * Get default measurement for common ingredients
   */
  getDefaultMeasurement(ingredientName) {
    const name = ingredientName.toLowerCase();
    
    // Spices and seasonings
    if (name.includes('salt')) return { quantity: '1/2', unit: 'tsp' };
    if (name.includes('pepper')) return { quantity: '1/4', unit: 'tsp' };
    if (name.includes('cumin') || name.includes('paprika') || name.includes('oregano')) {
      return { quantity: '1', unit: 'tsp' };
    }
    
    // Nuts and garnishes
    if (name.includes('nuts') || name.includes('seeds')) return { quantity: '2', unit: 'tbsp' };
    
    // Default
    return { quantity: '1', unit: 'tbsp' };
  }

  // Extract main ingredient from recipe data
  extractMainIngredient(recipeData, ingredientsDetailed) {
    // Try new format first
    if (ingredientsDetailed && ingredientsDetailed.length > 0) {
      return ingredientsDetailed[0].name;
    }
    
    // Fallback to old format if present
    for (let i = 1; i <= 5; i++) {
      const ingredient = recipeData[`strIngredient${i}`];
      if (ingredient && ingredient.trim()) {
        return ingredient.trim();
      }
    }
    return null;
  }

  /**
   * Get random dish type based on category
   */
  getRandomDishType(params) {
    const category = params.category || params.randomCategory || params.filters?.category || 'Dinner';
    
    console.log(`🎲 Selecting random dish type for category: ${category}`);
    
    // Category-specific dish types for better matching
    const dishTypesByCategory = {
      'Breakfast': ['Skillet & One-Pan Meals', 'Sandwiches & Wraps', 'Baked Goods', 'Pastries'],
      'Brunch': ['Skillet & One-Pan Meals', 'Sandwiches & Wraps', 'Salads', 'Main Courses'],
      'Lunch': ['Sandwiches & Wraps', 'Salads', 'Soups', 'Burgers', 'Pizza & Flatbreads', 'Pasta & Noodles'],
      'Dinner': ['Main Courses', 'Pasta & Noodles', 'Rice Dishes', 'Stir-Fries', 'Curries', 'Stews & Casseroles', 'Grilling / BBQ', 'Tacos, Burritos & Quesadillas'],
      'Snack': ['Appetizers', 'Side Dishes', 'Cookies & Bars', 'Frozen Treats', 'Baked Goods'],
      'Dessert': ['Baked Goods', 'Pastries', 'Cookies & Bars', 'Pies & Cobblers', 'Frozen Treats']
    };
    
    const options = dishTypesByCategory[category] || [
      'Appetizers', 'Side Dishes', 'Main Courses', 'Soups', 'Salads',
      'Sandwiches & Wraps', 'Burgers', 'Pizza & Flatbreads', 'Pasta & Noodles',
      'Rice Dishes', 'Tacos, Burritos & Quesadillas', 'Stir-Fries', 'Curries',
      'Stews & Casseroles', 'Skillet & One-Pan Meals', 'Baked Goods', 'Pastries',
      'Cookies & Bars', 'Pies & Cobblers', 'Frozen Treats'
    ];
    
    const selected = options[Math.floor(Math.random() * options.length)];
    console.log(`   ✅ Selected dish type: ${selected}`);
    return selected;
  }

  // Parse instructions into array
  parseInstructionsToArray(instructions) {
    if (!instructions) return ['Prepare ingredients according to recipe', 'Cook as directed', 'Serve hot'];
    
    // Split by step numbers or periods
    const steps = instructions.split(/Step \d+:|\.(?=\s*Step|\s*$)/)
      .map(step => step.trim())
      .filter(step => step.length > 0)
      .map((step, index) => `Step ${index + 1}: ${step.replace(/^Step \d+:\s*/, '')}`);
    
    return steps.length > 0 ? steps : ['Prepare ingredients according to recipe', 'Cook as directed', 'Serve hot'];
  }

  // Get default value for any field
  getFieldDefault(fieldName, params) {
    const defaults = {
      prepTime: '<realistic minutes> minutes',
      cookTime: '<realistic minutes> minutes',
      totalTime: '<prepTime + cookTime> minutes',
      yield: `Serves ${params.servings || 4}`,
      mealType: params.category || 'Main Dish',
      dishType: params.category || 'Main Dish',
      mainIngredient: params.mainIngredient || 'Mixed ingredients',
      occasion: 'Any time',
      timeCategory: 'Under 1 hour',
      calories: '350',
      protein: '25g',
      carbs: '40g',
      fat: '12g'
    };
    
    return defaults[fieldName] || 'Available';
  }

  formatRecipeForDatabase(recipeData) {
    // Handle the new simplified format
    const formatted = {
      // Core TheMealDB format - directly from AI response
      strMeal: recipeData.strMeal || 'Unnamed Recipe',
      strDrinkAlternate: recipeData.strDrinkAlternate || '',
      strCategory: recipeData.strCategory || 'Miscellaneous',
      strArea: recipeData.strArea || 'Unknown',
      strInstructions: recipeData.strInstructions || (recipeData.instructionsArray ? recipeData.instructionsArray.join('\n\n') : ''),
      strMealThumb: recipeData.strMealThumb || '',
      strTags: recipeData.strTags || '',
      strYoutube: recipeData.strYoutube || '',
      strSource: recipeData.strSource || 'AI Generated',
      strImageSource: recipeData.strImageSource || '',
      strCreativeCommonsConfirmed: recipeData.strCreativeCommonsConfirmed || '',
      dateModified: recipeData.dateModified || new Date().toISOString(),

      // Enhanced arrays for better data access
      instructionsArray: recipeData.instructionsArray || [],
      ingredientsArray: recipeData.ingredientsArray || [],

      // Nutritional information
      nutrition: recipeData.nutrition || {},
      
      // Cooking information
      cookingInfo: recipeData.cookingInfo || {}
    };

    // Add all 20 ingredient slots from AI response
    for (let i = 1; i <= 20; i++) {
      formatted[`strIngredient${i}`] = recipeData[`strIngredient${i}`] || '';
      formatted[`strMeasure${i}`] = recipeData[`strMeasure${i}`] || '';
    }

    // 🚨 CRITICAL: Remove ALL N/A values and replace with realistic data
    const cleanedFormatted = this.eliminateNAValues(formatted);

    return cleanedFormatted;
  }

  // 🚨 CRITICAL: Eliminate ALL N/A values from recipe data
  eliminateNAValues(recipeData) {
    const cleaned = { ...recipeData };
    
    // Replace N/A values with realistic defaults
    const naReplacements = {
      'N/A': '',
      'n/a': '',
      'NA': '',
      'na': '',
      'TBD': '',
      'tbd': '',
      'Unknown': '',
      'unknown': '',
      'Various': '',
      'various': '',
      'As needed': '1 tsp',
      'To taste': '1/2 tsp'
    };
    
    // Specific field replacements
    const fieldDefaults = {
      prepTime: '<realistic minutes> minutes',
      cookTime: '<realistic minutes> minutes',
      totalTime: '<prepTime + cookTime> minutes',
      yield: `Serves ${cleaned.cookingInfo?.servings || 4}`,
      mealType: 'dinner',
      dishType: 'main dish',
      mainIngredient: cleaned.strCategory?.toLowerCase() || 'mixed',
      occasion: 'weeknight dinner',
      timeCategory: 'under 1 hour'
    };
    
    // Clean all string values
    Object.keys(cleaned).forEach(key => {
      if (typeof cleaned[key] === 'string') {
        let value = cleaned[key];
        
        // Replace N/A variations
        Object.keys(naReplacements).forEach(na => {
          if (value === na || value.includes(na)) {
            value = naReplacements[na];
          }
        });
        
        // Apply field-specific defaults
        if (fieldDefaults[key] && (!value || value === '')) {
          value = fieldDefaults[key];
        }
        
        cleaned[key] = value;
      }
    });
    
    // Clean nested objects
    if (cleaned.cookingInfo) {
      Object.keys(cleaned.cookingInfo).forEach(key => {
        if (typeof cleaned.cookingInfo[key] === 'string') {
          let value = cleaned.cookingInfo[key];
          Object.keys(naReplacements).forEach(na => {
            if (value === na || value.includes(na)) {
              value = fieldDefaults[key] || naReplacements[na];
            }
          });
          cleaned.cookingInfo[key] = value;
        }
      });
    }

    if (cleaned.nutrition) {
      Object.keys(cleaned.nutrition).forEach(key => {
        if (typeof cleaned.nutrition[key] === 'string' && (cleaned.nutrition[key] === 'N/A' || cleaned.nutrition[key] === '')) {
          const nutritionDefaults = {
            calories: '350',
            protein: '25g',
            carbs: '40g',
            fat: '12g',
            fiber: '4g',
            sugar: '8g',
            sodium: '580mg'
          };
          cleaned.nutrition[key] = nutritionDefaults[key] || '0g';
        }
      });
    }

    return cleaned;
  }

  getIngredientsText(recipe) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipe[`strIngredient${i}`];
      const measure = recipe[`strMeasure${i}`];
      if (ingredient && ingredient.trim()) {
        ingredients.push(`${measure || ''} ${ingredient}`.trim());
      }
    }
    return ingredients.join(', ');
  }

  // Get context of existing recipes to avoid duplicates
  async getExistingRecipesContext() {
    try {
      const RecipeManager = require('./RecipeManager');
      const DatabaseManager = require('./DatabaseManager');
      
      const db = new DatabaseManager();
      await db.initialize();
      const recipeManager = new RecipeManager(db);
      
      // Get recent recipes (last 20) to use as context
      const recentRecipes = await this.getRecentRecipes(recipeManager, 20);
      
      if (recentRecipes.length === 0) {
        return '';
      }
      
      const recipeNames = recentRecipes.map(recipe => 
        `"${recipe.strMeal}" (${recipe.strArea} ${recipe.strCategory})`
      ).join(', ');
      
      return `EXISTING RECIPES IN DATABASE (avoid duplicates):
${recipeNames}

`;
    } catch (error) {
      console.warn('Could not retrieve existing recipes:', error.message);
      return '';
    }
  }
  
  async getRecentRecipes(recipeManager, limit = 20) {
    try {
      // Try to get recent recipes
      if (recipeManager.getLatest) {
        const result = await recipeManager.getLatest(limit);
        return result.meals || [];
      } else {
        // Fallback - get some random recipes
        const results = [];
        for (let i = 0; i < Math.min(limit, 10); i++) {
          try {
            const result = await recipeManager.getRandom();
            if (result.meals && result.meals[0]) {
              results.push(result.meals[0]);
            }
          } catch (e) {
            break;
          }
        }
        return results;
      }
    } catch (error) {
      console.warn('Could not get recent recipes:', error.message);
      return [];
    }
  }

  // Generate a mock recipe for testing when OpenAI API key is not available
  generateMockRecipe(params = {}) {
    console.log('🎭 Generating mock recipe with params:', JSON.stringify(params, null, 2));
    
    const {
      cuisine = 'Italian',
      category = 'Main Dish',
      difficulty = 'Medium',
      servings = 4,
      recipeName = 'Test Recipe'
    } = params;

    const instructionsArray = [
      "Heat olive oil in a large pan over medium heat",
      "Add garlic and onions, cook until fragrant (2-3 minutes)",
      "Add main ingredients and cook until tender",
      "Season with salt, pepper, and herbs",
      "Simmer for 15-20 minutes until flavors combine",
      "Serve hot and enjoy!"
    ];

    const mockRecipe = {
      strMeal: recipeName || `Delicious ${cuisine} ${category}`,
      strCategory: category,
      strArea: cuisine,
      strInstructions: instructionsArray.join('\n\n'),
      instructionsArray: instructionsArray,
      strMealThumb: "/images/placeholder-recipe.jpg",
      strTags: `${cuisine},${category},${difficulty}`.toLowerCase(),
      strYoutube: "",
      strSource: "AI Generated Recipe",
      strEquipment: "Large pan, Wooden spoon, Cutting board, Chef's knife",
      prepTime: "15 minutes",
      cookTime: "25 minutes",
      totalTime: "40 minutes",
      yield: `${servings} servings`,
      difficulty: difficulty,
      mealType: category,
      calories: "420",
      protein: "28g",
      carbs: "35g",
      fat: "18g",
      fiber: "4g",
      sugar: "8g",
      sodium: "680mg",
      // Generate 20 ingredient slots
      strIngredient1: "Olive oil",
      strMeasure1: "2 tbsp",
      strIngredient2: "Garlic cloves",
      strMeasure2: "3 cloves",
      strIngredient3: "Yellow onion",
      strMeasure3: "1 large",
      strIngredient4: "Salt",
      strMeasure4: "1 tsp",
      strIngredient5: "Black pepper",
      strMeasure5: "1/2 tsp",
      strIngredient6: "Fresh herbs",
      strMeasure6: "2 tbsp",
    };

    // Fill remaining ingredient slots with empty strings
    for (let i = 7; i <= 20; i++) {
      mockRecipe[`strIngredient${i}`] = '';
      mockRecipe[`strMeasure${i}`] = '';
    }

    console.log('✅ Mock recipe generated successfully');
    return mockRecipe;
  }
}

module.exports = OpenAIManager;