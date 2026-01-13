/**
 * RecipePromptBuilder - Builds AI prompts for recipe generation
 * Single Responsibility: Construct prompts for OpenAI API
 */

const fs = require('fs').promises;
const path = require('path');

class RecipePromptBuilder {
  constructor() {
    this.equipmentList = null;
    this.ingredientsList = null;
  }

  /**
   * Get equipment list from Equipment.txt
   */
  async getEquipmentList() {
    if (this.equipmentList) {
      return this.equipmentList;
    }

    try {
      const equipmentPath = path.join(__dirname, '../../../Equipment.txt');
      const content = await fs.readFile(equipmentPath, 'utf-8');
      this.equipmentList = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      
      console.log(`📋 Loaded ${this.equipmentList.length} equipment items`);
      return this.equipmentList;
    } catch (error) {
      console.error('Error reading equipment list:', error);
      return [];
    }
  }

  /**
   * Get ingredients list from folder
   */
  async getIngredientsList() {
    if (this.ingredientsList) {
      return this.ingredientsList;
    }

    try {
      const ingredientsPath = path.join(__dirname, '../../../in/ingredients');
      const files = await fs.readdir(ingredientsPath);
      
      this.ingredientsList = files
        .filter(file => file.endsWith('.png'))
        .map(file => file.replace('.png', ''))
        .sort();
      
      console.log(`🥗 Loaded ${this.ingredientsList.length} ingredients`);
      return this.ingredientsList;
    } catch (error) {
      console.error('Error reading ingredients list:', error);
      return [];
    }
  }

  /**
   * Build filter-based prompt
   */
  buildFilterPrompt(filters) {
    const parts = [];

    if (filters.category) parts.push(`Category: ${filters.category}`);
    if (filters.cuisine || filters.area) parts.push(`Cuisine: ${filters.cuisine || filters.area}`);
    if (filters.dishType) parts.push(`Dish Type: ${filters.dishType}`);
    if (filters.dietary) parts.push(`Dietary: ${filters.dietary}`);
    if (filters.mealType) parts.push(`Meal Type: ${filters.mealType}`);
    if (filters.mainIngredient) parts.push(`Main Ingredient: ${filters.mainIngredient}`);
    if (filters.difficulty) parts.push(`Difficulty: ${filters.difficulty}`);
    if (filters.cookingTime) parts.push(`Cooking Time: ${filters.cookingTime}`);

    const prompt = `Create a recipe with these specifications:
${parts.join('\n')}

The recipe MUST match ALL specified criteria where possible. Be creative within these constraints.`;

    return prompt;
  }

  /**
   * Build photography prompt for image generation
   */
  async generatePhotographyPrompt(recipeName, description = '') {
    const prompt = `Professional food photography of ${recipeName}${description ? ', ' + description : ''}, restaurant quality, well-lit, appetizing, high-resolution, centered on white plate, garnished beautifully, shallow depth of field, natural lighting`;
    return prompt;
  }

  /**
   * Get fallback photography prompt
   */
  getFallbackPhotographyPrompt(recipeName, description) {
    return `High quality food photo of ${recipeName}, professional presentation`;
  }

  /**
   * Build comprehensive recipe prompt
   */
  async buildRecipePrompt(params) {
    const restrictionsText = params.dietaryRestrictions?.length > 0
      ? ` The recipe must accommodate these dietary restrictions: ${params.dietaryRestrictions.join(', ')}.`
      : '';

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
4. 🚨 CRITICAL: ONLY use ingredients from this EXACT list - match names PRECISELY: ${allowedIngredients.slice(0, 200).join(', ')}... (and more available)
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
7. ✅ Instructions must be COMPREHENSIVE cooking steps with 10-40 detailed actions (match complexity: simple 10-15, moderate 15-25, complex 25-40) (not descriptions)
8. ✅ All times must be specific numbers (15 min, 25 min, etc.)

🚨🚨🚨 MEGA CRITICAL - INGREDIENT SYNC RULES 🚨🚨🚨
THIS IS THE MOST IMPORTANT RULE - FAILURE = REJECTED RECIPE:

9. 🔴 BEFORE YOU WRITE INSTRUCTIONS: List ALL ingredients you will use in strIngredient1-20
10. 🔴 WHILE WRITING INSTRUCTIONS: Only mention ingredients already in your list
11. 🔴 AFTER WRITING INSTRUCTIONS: Review EVERY step - if you mention ANY ingredient, it MUST be in strIngredient1-20
12. 🔴 EXAMPLES OF FATAL ERRORS:
   ❌ Instructions: "add 1/2 tsp cumin powder" but strIngredient1-20 has NO cumin
   ❌ Instructions: "sprinkle chili powder" but strIngredient1-20 has NO chili powder
   ❌ Instructions: "season with salt" but strIngredient1-20 has NO salt
   ❌ Instructions: "crack eggs into bowl" but strIngredient1-20 has NO eggs

13. 🚫 Measurement rules:
   🚨 CRITICAL: ALWAYS use EXACT measurements for ALL ingredients, including salt, pepper, and seasonings
   ✅ CORRECT: {"name": "Salt", "quantity": "1/2", "unit": "tsp"}
   ✅ CORRECT: {"name": "Black pepper", "quantity": "1/4", "unit": "tsp"}
   ✅ CORRECT: {"name": "Cumin", "quantity": "1", "unit": "tsp"}
   ✅ CORRECT: {"name": "Fresh cilantro", "quantity": "2", "unit": "tbsp"} (for garnish, use exact amount like 2 tbsp)
   ❌ WRONG: {"name": "Salt", "quantity": "", "unit": "to taste"} (MUST use exact measurement like "1/2 tsp")
   ❌ WRONG: {"name": "Pepper", "quantity": "", "unit": "to taste"} (MUST use exact measurement like "1/4 tsp")
   ❌ WRONG: {"name": "Fresh cilantro", "quantity": "", "unit": "to garnish"} (MUST use exact measurement like "2 tbsp")
   📝 For seasonings: Use realistic amounts (e.g., salt: 1/4 to 1 tsp, pepper: 1/4 to 1/2 tsp, herbs: 1-2 tbsp)

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

14. 🔧 EQUIPMENT INTELLIGENCE: Select equipment logically:
   - For chopping/prep: Chef's knife, Cutting board, Measuring cups/spoons
   - For stovetop cooking: Frying pan/Saucepan + Spatula + Tongs
   - For baking: Oven + Baking sheet/dish + Measuring tools
   - For mixing: Mixing bowls + Whisk/Spatula
   - For specific techniques: Wok for stir-fry, Dutch oven for braising, etc.

⚠️ IF YOU USE "N/A" ANYWHERE, THE ENTIRE RESPONSE IS INVALID ⚠️`;
  }
}

module.exports = RecipePromptBuilder;

