/**
 * MultiStepRecipeGenerator - Generates recipes in multiple AI calls for better accuracy
 * 
 * Process:
 * 1. Select equipment from Equipment.txt
 * 2. Select ingredients from available ingredients
 * 3. Generate detailed instructions using selected items
 * 4. Generate nutrition information
 * 5. Validate and assemble complete recipe
 */

const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

class MultiStepRecipeGenerator {
  constructor(openaiManager) {
    this.openaiManager = openaiManager;
    this.openai = openaiManager.openai;
    this.model = openaiManager.model || 'gpt-4';
  }

  /**
   * Generate recipe in 4 distinct steps
   */
  async generateRecipe(params) {
    console.log('\n🎯 ═══════════════════════════════════════════');
    console.log('🎯 MULTI-STEP RECIPE GENERATION');
    console.log('═══════════════════════════════════════════');
    console.log('📋 Filters:', JSON.stringify(params.filters || {}, null, 2));
    console.log('═══════════════════════════════════════════\n');

    try {
      // STEP 1: Select Equipment
      console.log('📍 STEP 1/4: Selecting Equipment');
      console.log('─'.repeat(45));
      const equipment = await this.selectEquipment(params);
      console.log(`✅ Selected ${equipment.length} pieces of equipment\n`);

      // STEP 2: Select Ingredients
      console.log('📍 STEP 2/4: Selecting Ingredients');
      console.log('─'.repeat(45));
      const ingredients = await this.selectIngredients(params, equipment);
      console.log(`✅ Selected ${ingredients.length} ingredients\n`);

      // STEP 3: Generate Instructions
      console.log('📍 STEP 3/4: Generating Detailed Instructions');
      console.log('─'.repeat(45));
      const instructions = await this.generateInstructions(params, equipment, ingredients);
      console.log(`✅ Generated ${instructions.length} instruction steps\n`);

      // STEP 4: Calculate Nutrition
      console.log('📍 STEP 4/4: Calculating Nutrition Information');
      console.log('─'.repeat(45));
      const nutrition = await this.calculateNutrition(params, ingredients);
      console.log(`✅ Nutrition data calculated\n`);

      // Assemble complete recipe
      const completeRecipe = this.assembleRecipe(params, equipment, ingredients, instructions, nutrition);

      console.log('═══════════════════════════════════════════');
      console.log('✅ MULTI-STEP GENERATION COMPLETE');
      console.log(`📋 Recipe: "${completeRecipe.strMeal}"`);
      console.log(`🍳 Equipment: ${equipment.length} items`);
      console.log(`🥗 Ingredients: ${ingredients.length} items`);
      console.log(`📝 Instructions: ${instructions.length} steps`);
      console.log(`💪 Calories: ${nutrition.caloriesPerServing}/serving`);
      console.log('═══════════════════════════════════════════\n');

      return completeRecipe;

    } catch (error) {
      console.error('❌ Multi-step generation failed:', error);
      throw error;
    }
  }

  /**
   * STEP 1: Select appropriate equipment from Equipment.txt
   */
  async selectEquipment(params) {
    const equipmentList = await this.openaiManager.getEquipmentList();
    const filters = params.filters || {};

    const prompt = `You are selecting kitchen equipment for a recipe.

RECIPE REQUIREMENTS:
- Category: ${filters.category || 'Any'}
- Cuisine: ${filters.cuisine || filters.area || 'Any'}
- Dish Type: ${filters.dishType || 'Any'}
- Dietary: ${filters.dietary || 'Any'}

AVAILABLE EQUIPMENT:
${equipmentList.join(', ')}

Select 6-12 pieces of equipment needed to make this recipe. Choose based on:
1. Category (Breakfast needs different tools than Dessert)
2. Cuisine (Asian needs wok, Italian needs pasta pot, etc.)
3. Cooking methods (baking, frying, grilling, etc.)

Return ONLY a JSON array of equipment names, EXACTLY as they appear in the list:
["Equipment 1", "Equipment 2", "Equipment 3", ...]

NO explanations, NO markdown, ONLY the JSON array.`;

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a professional chef selecting kitchen equipment. Return ONLY valid JSON arrays.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const response = completion.choices[0].message.content.trim();
    console.log('🤖 AI Response:', response);

    // Parse equipment list
    const cleaned = response.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
    const equipmentArray = JSON.parse(cleaned);

    console.log('🍳 Selected Equipment:');
    equipmentArray.forEach((eq, idx) => {
      console.log(`   ${idx + 1}. ${eq}`);
    });

    return equipmentArray;
  }

  /**
   * STEP 2: Select ingredients based on equipment and constraints
   */
  async selectIngredients(params, equipment) {
    const ingredientsList = await this.openaiManager.getIngredientsList();
    const filters = params.filters || {};

    const prompt = `You are selecting ingredients for a recipe.

RECIPE REQUIREMENTS:
- Category: ${filters.category || 'Any'}
- Cuisine: ${filters.cuisine || filters.area || 'Any'}
- Dish Type: ${filters.dishType || 'Any'}
- Dietary: ${filters.dietary || 'Any'}

AVAILABLE EQUIPMENT:
${equipment.join(', ')}

AVAILABLE INGREDIENTS (ONLY use ingredients from this list):
${ingredientsList.slice(0, 200).join(', ')}... (and more)

Select 6-15 ingredients that:
1. Match the cuisine and category
2. Can be prepared with the available equipment
3. Respect dietary restrictions: ${filters.dietary || 'None'}
4. Create a cohesive, delicious dish

Return JSON with ingredients and measurements:
[
  {"ingredient": "ingredient name from list", "measure": "exact amount (1 cup, 2 tbsp, etc.)"},
  {"ingredient": "ingredient name from list", "measure": "exact amount"},
  ...
]

🚨 CRITICAL: 
- Use EXACT ingredient names from the available list
- Include precise measurements
- 6-15 ingredients only
- NO explanations, ONLY JSON`;

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a professional chef selecting recipe ingredients. Return ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 800
    });

    const response = completion.choices[0].message.content.trim();
    console.log('🤖 AI Response length:', response.length);

    // Parse ingredients list
    const cleaned = response.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
    const ingredientsArray = JSON.parse(cleaned);

    console.log('🥗 Selected Ingredients:');
    ingredientsArray.forEach((ing, idx) => {
      console.log(`   ${idx + 1}. ${ing.measure} ${ing.ingredient}`);
    });

    return ingredientsArray;
  }

  /**
   * STEP 3: Generate detailed instructions using selected equipment and ingredients
   */
  async generateInstructions(params, equipment, ingredients) {
    const filters = params.filters || {};
    
    const ingredientList = ingredients.map(ing => `${ing.measure} ${ing.ingredient}`).join('\n- ');

    const prompt = `Create ULTRA-DETAILED cooking instructions for a recipe.

RECIPE CONCEPT:
- Name: Create a creative name
- Category: ${filters.category || 'Dinner'}
- Cuisine: ${filters.cuisine || filters.area || 'International'}

INGREDIENTS (USE THESE EXACTLY):
- ${ingredientList}

EQUIPMENT AVAILABLE (USE THESE):
${equipment.map((eq, idx) => `${idx + 1}. ${eq}`).join('\n')}

Generate 25-40 EXTREMELY DETAILED instruction steps. Each step must:
- Reference specific equipment from the list above
- Use the exact ingredients listed
- Include temperatures, times, and techniques
- Describe visual cues, sounds, aromas
- Explain WHY each step matters
- Include professional chef tips

🚨 CRITICAL FORMAT REQUIREMENTS:
- Instructions MUST be an ARRAY with 25-40 separate items
- Each array item is ONE complete step (do NOT combine multiple steps into one string)
- Include "Step 1:", "Step 2:", etc. in each instruction text for clarity
- Example: ["Step 1: Begin by washing vegetables", "Step 2: Heat skillet over medium heat", "Step 3: Add oil to pan"] NOT ["Begin... Heat... Add..."] (all in one string)

Return JSON:
{
  "recipeName": "Creative recipe name",
  "description": "2-3 appetizing sentences",
  "instructions": [
    "Step 1: Begin by preparing the ingredients - wash and chop vegetables as needed",
    "Step 2: Heat a large skillet over medium heat for 3-4 minutes until hot",
    "Step 3: Add oil to the heated skillet and swirl to coat evenly",
    "Step 4: Continue with 25-40 more ultra-detailed steps, each as a separate array item",
    "Step 5: Each instruction should be a complete, detailed step with 'Step X:' prefix",
    "...continue with remaining steps, numbering each as Step 6, Step 7, etc..."
  ],
  "prepTime": number (realistic minutes),
  "cookTime": number (realistic minutes),
  "totalTime": number (realistic minutes)
}

🚨 CRITICAL RULES FOR INSTRUCTIONS:
1. ONLY include steps that are ACTUALLY NEEDED for this specific recipe
2. If recipe uses OVEN/BAKING: Include preheating step early (Step 1-3)
3. If recipe is STOVETOP ONLY: Do NOT include oven preheating - start with actual prep/cooking steps
4. If recipe is RAW/NO-COOK: Start with prep steps, no heating steps
5. Every ingredient and piece of equipment MUST be used in the instructions
6. Do NOT add unnecessary steps just to fill space - every step must serve a purpose!`;

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a professional chef writing detailed cooking instructions. Return ONLY valid JSON with NO trailing commas.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.9,
      max_tokens: 4000
    });

    const response = completion.choices[0].message.content.trim();
    
    // Parse with JSONRepair
    const JSONRepair = require('../utils/JSONRepair');
    const parseResult = JSONRepair.parseWithRepair(response);
    
    if (!parseResult.success) {
      throw new Error('Failed to parse instructions JSON');
    }

    const data = parseResult.data;
    console.log(`📝 Recipe Name: "${data.recipeName}"`);
    console.log(`📝 Generated ${data.instructions.length} instruction steps`);
    console.log(`⏱️ Prep: ${data.prepTime}min, Cook: ${data.cookTime}min, Total: ${data.totalTime}min`);

    return data;
  }

  /**
   * STEP 4: Calculate accurate nutrition based on ingredients
   */
  async calculateNutrition(params, ingredients) {
    const ingredientList = ingredients.map(ing => `${ing.measure} ${ing.ingredient}`).join('\n- ');
    const servings = params.numberOfServings || params.filters?.servings || 4;

    const prompt = `Calculate accurate nutrition information for this recipe.

INGREDIENTS:
- ${ingredientList}

SERVINGS: ${servings}

Calculate realistic nutrition values PER SERVING based on the ingredients and their amounts.

Return JSON:
{
  "caloriesPerServing": number (realistic calories),
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "fiber": number (grams),
  "sugar": number (grams),
  "sodium": number (milligrams),
  "cholesterol": number (milligrams),
  "saturatedFat": number (grams),
  "vitaminA": number (% daily value),
  "vitaminC": number (% daily value),
  "iron": number (% daily value),
  "calcium": number (% daily value)
}

🚨 CRITICAL:
- All values must be realistic numbers (NEVER 0)
- Calculate based on actual ingredient quantities
- Consider cooking methods (frying adds fat, etc.)
- NO explanations, ONLY JSON`;

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a nutritionist calculating accurate recipe nutrition. Return ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3, // Lower temperature for more accurate calculations
      max_tokens: 500
    });

    const response = completion.choices[0].message.content.trim();
    
    // Parse nutrition data
    const cleaned = response.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
    const nutrition = JSON.parse(cleaned);

    console.log('💪 Nutrition (per serving):');
    console.log(`   Calories: ${nutrition.caloriesPerServing} kcal`);
    console.log(`   Protein: ${nutrition.protein}g`);
    console.log(`   Carbs: ${nutrition.carbs}g`);
    console.log(`   Fat: ${nutrition.fat}g`);

    return nutrition;
  }

  /**
   * Assemble all parts into complete recipe object
   */
  assembleRecipe(params, equipment, ingredients, instructionsData, nutrition) {
    const filters = params.filters || {};
    
    // Build ingredient slots (up to 20)
    const ingredientSlots = {};
    for (let i = 0; i < Math.min(ingredients.length, 20); i++) {
      ingredientSlots[`strIngredient${i + 1}`] = ingredients[i].ingredient;
      ingredientSlots[`strMeasure${i + 1}`] = ingredients[i].measure;
    }
    
    // Fill empty slots
    for (let i = ingredients.length + 1; i <= 20; i++) {
      ingredientSlots[`strIngredient${i}`] = '';
      ingredientSlots[`strMeasure${i}`] = '';
    }

    // Determine dietary flags from ingredients
    const dietary = this.analyzeDietary(ingredients, filters);

    // Build complete recipe object
    const recipe = {
      strMeal: instructionsData.recipeName,
      strCategory: filters.category || 'Dinner',
      strArea: filters.cuisine || filters.area || 'International',
      strDescription: instructionsData.description,
      
      // Instructions (both formats)
      instructions: instructionsData.instructions,
      strInstructions: instructionsData.instructions.join(' '),
      
      // Equipment
      equipmentRequired: equipment,
      strEquipment: equipment.join(', '),
      
      // Ingredients
      ...ingredientSlots,
      
      // Times
      prepTime: instructionsData.prepTime,
      cookTime: instructionsData.cookTime,
      totalTime: instructionsData.totalTime,
      
      // Servings
      numberOfServings: params.numberOfServings || 4,
      servingSize: '1 serving',
      yield: `${params.numberOfServings || 4} servings`,
      
      // Nutrition
      nutrition,
      
      // Dietary flags
      dietary,
      
      // Metadata
      difficulty: params.difficulty || 'Medium',
      dishType: filters.dishType || 'Main Course',
      mainIngredient: ingredients[0]?.ingredient || '',
      
      // Tags
      strTags: this.generateTags(filters, dietary),
      keywords: this.generateKeywords(filters, ingredients),
      
      // Source
      strSource: 'AI Generated (Multi-Step)',
      strYoutube: '',
      strMealThumb: '',
      dateModified: new Date().toISOString()
    };

    return recipe;
  }

  /**
   * Analyze dietary properties from ingredients
   */
  analyzeDietary(ingredients, filters) {
    const ingredientNames = ingredients.map(ing => ing.ingredient.toLowerCase()).join(' ');
    
    // Detect meat/animal products
    const hasMeat = /beef|pork|chicken|turkey|lamb|duck|veal|venison/.test(ingredientNames);
    const hasSeafood = /fish|salmon|tuna|shrimp|crab|lobster|oyster|clam|mussel/.test(ingredientNames);
    const hasDairy = /milk|cheese|butter|cream|yogurt/.test(ingredientNames);
    const hasEggs = /egg/.test(ingredientNames);
    const hasGluten = /flour|bread|pasta|wheat|barley|rye/.test(ingredientNames);
    const hasNuts = /almond|peanut|walnut|pecan|cashew|pistachio|hazelnut/.test(ingredientNames);

    return {
      vegetarian: !hasMeat && !hasSeafood,
      vegan: !hasMeat && !hasSeafood && !hasDairy && !hasEggs,
      pescatarian: hasSeafood && !hasMeat,
      glutenFree: !hasGluten,
      dairyFree: !hasDairy,
      nutFree: !hasNuts,
      keto: false, // Would need nutrition calc
      paleo: !hasGluten && !hasDairy && !ingredients.some(i => i.ingredient.toLowerCase().includes('bean')),
      halal: !ingredients.some(i => i.ingredient.toLowerCase().includes('pork')),
      noRedMeat: !/(beef|pork|lamb|veal)/.test(ingredientNames),
      noPork: !/pork/.test(ingredientNames),
      noShellfish: !/(shrimp|crab|lobster|oyster|clam|mussel)/.test(ingredientNames),
      omnivore: hasMeat || hasSeafood
    };
  }

  /**
   * Generate tags from filters and dietary info
   */
  generateTags(filters, dietary) {
    const tags = [];
    
    if (filters.dishType) tags.push(filters.dishType);
    if (filters.category) tags.push(filters.category);
    if (dietary.vegetarian) tags.push('vegetarian');
    if (dietary.vegan) tags.push('vegan');
    if (dietary.glutenFree) tags.push('glutenFree');
    if (dietary.dairyFree) tags.push('dairyFree');
    
    return tags.join(',');
  }

  /**
   * Generate keywords for SEO
   */
  generateKeywords(filters, ingredients) {
    const keywords = [];
    
    if (filters.cuisine) keywords.push(filters.cuisine.toLowerCase());
    if (filters.category) keywords.push(filters.category.toLowerCase());
    if (filters.dishType) keywords.push(filters.dishType.toLowerCase());
    
    // Add main ingredients as keywords
    ingredients.slice(0, 3).forEach(ing => {
      keywords.push(ing.ingredient.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    });
    
    return keywords;
  }
}

module.exports = MultiStepRecipeGenerator;

