const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class OpenAIManager {
  constructor() {
    // Only initialize OpenAI if API key is provided
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      this.model = process.env.OPENAI_MODEL || 'gpt-4';
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
- Times: realistic prep/cook/total minutes (never 0)
- servingSize: specify portion like "1 cup", "2 slices"
- yield: specify output like "4 servings", "12 cookies"
- nutrition: realistic numbers based on ingredients
- dietary: appropriate true/false based on ingredients (vegetarian, vegan, pescatarian, glutenFree, dairyFree, keto, paleo, halal, noRedMeat, noPork, noShellfish, omnivore)
- dishType: specify like "Appetizer", "Soup", "Salad", "Main Course", "Side Dish", "Dessert", "Beverage", "Snack"
- Arrays: all must have at least 1-2 items
- Instructions: MUST be array format ["Step 1: detailed instruction", "Step 2: detailed instruction", etc.] with 7-10 educational steps
- 🚨 ONLY use ingredients from this EXACT list (match names precisely): abalone, acai berry, ackee, acorn squash, active dry yeast, adzuki beans, agar agar, agave nectar, aioli, aleppo pepper, alfalfa sprouts, alfredo sauce, all-purpose flour, allspice, almond butter, almond extract, almond flour, almond milk, almond paste, almonds, anchovies, Anchovy Paste, andouille sausage, anise seeds, annatto, apple, apple butter, applesauce, apricot, apricot jam, arborio rice, Arrowroot powder, artichoke, asafoetida, asiago cheese, Asian Pear, asparagus, avocado, bacon, Baguette, baking powder, baking soda, balsamic vinegar, banana, banana blossom, barbecue sauce, barley, barley flour, basil, basil seeds, Basmati Rice, Bay Leaf, beef, Beef Bourguignon, beef brisket, beef broth, Beef Ribs, beef stock, beef tenderloin, beets, Belacan (shrimp paste), bell pepper, bell peppers, besan (chickpea flour), black beans, black cardamom, black fungus (cloud ear), Black Garlic, Black Pepper, Black Peppercorns, black salt (kala namak), Black Tea, black truffle, Black-Eyed Peas, Blood Sausage, blue cheese, blue cheese dressing, blueberry, bok choy, Bonito Flakes, bourbon, Brandy, Bread, bread flour, Breadcrumbs, Breakfast Sausage, Brie, Broccoli, Broccolini, Brown Mustard Seeds, brown rice, brown sugar, brownie mix, brussels sprouts, buckwheat, buckwheat flour, bulgur, burdock root, butter, butter lettuce, buttermilk, buttermilk powder, butternut squash, cabbage, Cacao Nibs, Cactus Pear (Prickly Pear), Cajun Seasoning, Calamari (Squid), camembert, candied ginger, candied orange peel, candlenut, cane vinegar, canned salmon, canned tomatoes, canned tuna, cannellini beans, Caper Berries, Capers, Caramel Sauce, caraway seeds, carne asada, carolina reaper, carrot, cashew butter, cashew milk, cashews, cassava, catfish, cauliflower, cayenne pepper, celery, celery root (celeriac), champagne vinegar, chana dal, chanterelle mushrooms, char siu sauce, cheddar cheese, cheese, cheese curds, cherry, cherry tomato, chervil, chickpeas, chili oil, chili paste, chili powder, chili sauce, Chinese five-spice, chipotle chili powder, chives, chocolate chips, chocolate hazelnut spread, chocolate syrup, cider, cilantro, cinnamon, cinnamon stick, clam juice, clams, clarified butter, clotted cream, cloves, cocoa powder, coconut, coconut aminos, coconut cream, coconut milk, coconut oil, coconut sugar, coconut vinegar, cod, coffee, cognac, collard greens, condensed milk, coriander seeds, corn, corn flakes, corn oil, corn syrup, corn tortillas, corned beef, cornmeal, cotija cheese, cottage cheese, crab, crab meat, cranberries, cream cheese, cream of coconut, cream of tartar, crème fraîche, cremebrule, cremini mushrooms, cucumber, cumin seeds, curly parsley, currants, curry leaves, curry paste, curry powder, daikon radish, dashi, dates, demi-glace, diced tomatoes, dijon mustard, dill, dill seeds, dried apricots, dried cranberries, dried figs, dried hibiscus, dried shrimp, dried thyme, dry mustard powder, duck, duck eggs, duck fat, duck sauce, dulce de leche, edam cheese, edamame, egg noodles, egg whites, egg yolks, eggplant, eggs, egusi seeds, elderberry, empanadas, enoki mushrooms, espresso powder, evaporated milk, extra virgin olive oil, fava beans, fennel bulb, fennel seeds, fenugreek leaves, fenugreek seeds, fermented black beans, filé powder, fish maw, fish sauce, five-spice powder, flaxseeds, flour tortillas, fontina cheese, forbidden rice (black rice), freekeh, freeze-dried fruit, french dressing, fried onions, frosting, fruit cocktail (canned), garam masala, garlic, garlic chives, garlic powder, garlic scapes, gelatin, gin, ginger, ginger paste, ginger powder, gingersnaps (crushed), glucose syrup, glutinous rice (sticky rice), goat, goat cheese, gochugaru (Korean chili flakes), gochujang, salmon, salt, spaghetti, Spaghetti Carbonara, spinach, sugar, sushi, tiramisu

Return ONLY this comprehensive JSON format with NO extra text:
{
  "strMeal": "Creative Recipe Name",
  "strCategory": "Main category (Beef, Chicken, Seafood, Vegetarian, etc)",
  "strArea": "Cuisine type (Italian, Mexican, Asian, etc)",
  "strInstructions": "Step 1: Begin by gathering all ingredients and equipment. Preheat your oven to the required temperature if needed. Step 2: Prepare all vegetables by washing, peeling, and cutting them into the specified sizes. Step 3: Heat your pan over medium-high heat with oil until shimmering. Step 4: Add ingredients in the proper order, explaining cooking techniques and timing. Step 5: Continue with very detailed steps explaining exactly what to look for (golden brown, fragrant, tender, etc). Step 6: Include specific temperatures, cooking times, and visual/sensory cues. Step 7: Explain plating and garnishing in detail. Each step should be thorough and educational.",
  "strMealThumb": "",
  "strTags": "tag1,tag2,tag3",
  "strEquipment": "Large skillet (12-inch), Mixing bowl (medium), Measuring cups, Chef's knife (8-inch), Cutting board, Wooden spoon, Meat thermometer, Colander, Whisk, Tongs",
  "strPrepTime": "15 minutes",
  "strCookTime": "30 minutes",
  "strTotalTime": "45 minutes",
  "strServings": "4",
  "strIngredient1": "First ingredient", "strMeasure1": "Amount",
  "strIngredient2": "Second ingredient", "strMeasure2": "Amount",
  "strIngredient3": "Third ingredient", "strMeasure3": "Amount",
  "strIngredient4": "Fourth ingredient", "strMeasure4": "Amount",
  "strIngredient5": "Fifth ingredient", "strMeasure5": "Amount",
  "strIngredient6": "Sixth ingredient", "strMeasure6": "Amount",
  "strIngredient7": "", "strMeasure7": "",
  "strIngredient8": "", "strMeasure8": ""
}`;
      } else {
        // Random mode - generate creative diverse recipe
        console.log('🎲 Using RANDOM mode with variety');
        
        const cuisines = ['Italian', 'Mexican', 'Asian', 'Mediterranean', 'Indian', 'French', 'American', 'Japanese', 'Thai', 'Greek'];
        const categories = ['Beef', 'Chicken', 'Seafood', 'Vegetarian', 'Vegan', 'Pasta', 'Dessert', 'Breakfast'];
        const themes = ['healthy', 'comfort food', 'spicy', 'fresh', 'hearty', 'light', 'creative fusion', 'traditional', 'modern twist'];
        
        const randomCuisine = cuisines[Math.floor(Math.random() * cuisines.length)];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];
        
        comprehensivePrompt = `${existingContext}

Generate a creative ${randomTheme} ${randomCuisine} ${randomCategory} recipe that would be unique and interesting.
${existingContext ? 'IMPORTANT: Create something completely different from the existing recipes listed above to ensure variety and innovation in our collection.' : ''}

Make it innovative and delicious. Use unexpected flavor combinations or techniques.

🚨 CRITICAL: ALL fields must have realistic values (no zeros, empty strings, or N/A):
- strDescription: 2-3 appetizing sentences
- Times: realistic prep/cook/total minutes (never 0)  
- servingSize: specify portion like "1 cup", "2 slices"
- yield: specify output like "4 servings", "12 cookies"
- nutrition: realistic numbers based on ingredients
- dietary: appropriate true/false based on ingredients (vegetarian, vegan, pescatarian, glutenFree, dairyFree, keto, paleo, halal, noRedMeat, noPork, noShellfish, omnivore)
- dishType: specify like "Appetizer", "Soup", "Salad", "Main Course", "Side Dish", "Dessert", "Beverage", "Snack"
- Arrays: all must have at least 1-2 items
- Instructions: MUST be array format ["Step 1: detailed instruction", "Step 2: detailed instruction", etc.] with 7-10 educational steps

Return ONLY this JSON format with NO extra text:
{
  "strMeal": "Creative Recipe Name",
  "strDescription": "Brief appetizing description of the dish (2-3 sentences)",
  "strCategory": "${randomCategory}",
  "strArea": "${randomCuisine}",
  "instructions": [
    "Begin by gathering all ingredients and equipment. Preheat your oven to the required temperature if needed.",
    "Prepare all vegetables by washing, peeling, and cutting them into the specified sizes.",
    "Heat your pan over medium-high heat with oil until shimmering.",
    "Add ingredients in the proper order, explaining cooking techniques and timing.",
    "Continue with very detailed steps explaining exactly what to look for (golden brown, fragrant, tender, etc).",
    "Include specific temperatures, cooking times, and visual/sensory cues.",
    "Explain plating and garnishing in detail."
  ],
  "strMealThumb": "",
  "strTags": "${randomTheme},${randomCuisine.toLowerCase()},${randomCategory.toLowerCase()}",
  "strEquipment": "Large skillet (12-inch), Mixing bowl (medium), Measuring cups, Chef's knife (8-inch), Cutting board, Wooden spoon, Meat thermometer, Colander, Whisk, Tongs",
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
  "mealType": ["Dinner", "Lunch"],
  "dishType": "Main Course",
  "mainIngredient": "chicken",
  "occasion": ["Weeknight", "Family Dinner", "Date Night"],
  "seasonality": ["Fall", "Winter"],
  "equipmentRequired": ["Large skillet (12-inch)", "Chef's knife (8-inch)", "Cutting board", "Measuring cups", "Mixing bowl (large)", "Wooden spoon", "Tongs"],
  "skillsRequired": ["Chopping", "Sautéing", "Seasoning", "Pan-frying", "Timing"],
  "keywords": ["comfort food", "hearty", "flavorful", "easy weeknight", "family-friendly", "one-pan"],
  "allergenFlags": ["dairy", "gluten", "eggs"],
  "timeCategory": "30-60 mins",
  "ingredientsDetailed": [
    {"name": "First ingredient", "quantity": "2", "unit": "tbsp", "optional": false, "required": true},
    {"name": "Second ingredient", "quantity": "1", "unit": "lb", "optional": false, "required": true},
    {"name": "Third ingredient", "quantity": "4", "unit": "cloves", "optional": false, "required": true},
    {"name": "Fourth ingredient", "quantity": "1", "unit": "tsp", "optional": false, "required": true},
    {"name": "Fifth ingredient", "quantity": "1/2", "unit": "tsp", "optional": false, "required": true},
    {"name": "Sixth ingredient", "quantity": "1", "unit": "can", "optional": false, "required": true}
  ],
  "strIngredient1": "First ingredient", "strMeasure1": "2 tbsp",
  "strIngredient2": "Second ingredient", "strMeasure2": "1 lb",
  "strIngredient3": "Third ingredient", "strMeasure3": "4 cloves",
  "strIngredient4": "Fourth ingredient", "strMeasure4": "1 tsp",
  "strIngredient5": "Fifth ingredient", "strMeasure5": "1/2 tsp",
  "strIngredient6": "Sixth ingredient", "strMeasure6": "1 can"
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
      console.log('🔍 OpenAI response structure:', JSON.stringify(completion, null, 2));
      
      // Validate OpenAI response structure
      if (!completion || !completion.choices || !completion.choices[0]) {
        throw new Error('Invalid OpenAI response: No choices returned');
      }
      
      if (!completion.choices[0].message || !completion.choices[0].message.content) {
        throw new Error('Invalid OpenAI response: No message content');
      }
      
      const recipeData = this.parseAIResponse(completion.choices[0].message.content);
      
      // Simple formatting - fill missing slots immediately
      const formattedRecipe = this.quickFormatRecipe(recipeData, params);
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

  // Robust JSON parsing with error handling and cleanup
  parseAIResponse(content) {
    try {
      // Clean up the response - remove markdown formatting and extra text
      let cleanContent = content.trim();
      
      // Remove markdown code blocks if present
      cleanContent = cleanContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
      
      // Find JSON object/array boundaries
      const startBrace = cleanContent.indexOf('{');
      const startBracket = cleanContent.indexOf('[');
      const endBrace = cleanContent.lastIndexOf('}');
      const endBracket = cleanContent.lastIndexOf(']');
      
      let jsonContent;
      
      // Determine if it's an object or array and extract accordingly
      if (startBrace !== -1 && (startBracket === -1 || startBrace < startBracket)) {
        // It's an object
        if (endBrace === -1) {
          // Try to fix incomplete JSON by finding the last complete field
          const incompleteContent = cleanContent.substring(startBrace);
          jsonContent = this.fixIncompleteJSON(incompleteContent);
        } else {
        jsonContent = cleanContent.substring(startBrace, endBrace + 1);
        }
      } else if (startBracket !== -1) {
        // It's an array
        if (endBracket === -1) {
          throw new Error('Invalid JSON: No closing bracket found');
        }
        jsonContent = cleanContent.substring(startBracket, endBracket + 1);
      } else {
        throw new Error('No valid JSON object or array found in response');
      }
      
      // Parse the cleaned JSON
      const parsed = JSON.parse(jsonContent);
      console.log('✅ Successfully parsed AI response');
      return parsed;
      
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError.message);
      console.error('🔍 Raw content length:', content.length);
      console.error('🔍 Content preview:', content.substring(0, 200) + '...');
      
      // Try one more time with even more aggressive cleaning
      try {
        const fallbackContent = content
          .replace(/^[^{[\n]*/, '') // Remove everything before first { or [
          .replace(/[^}\]]*$/, '') // Remove everything after last } or ]
          .trim();
          
        const fallbackParsed = JSON.parse(fallbackContent);
        console.log('✅ Fallback parsing succeeded');
        return fallbackParsed;
      } catch (fallbackError) {
        console.error('❌ Fallback parsing also failed:', fallbackError.message);
        console.error('🔍 Raw AI response that failed parsing:');
        console.error('📄 Content length:', content.length);
        console.error('📄 First 500 chars:', content.substring(0, 500));
        console.error('📄 Last 500 chars:', content.substring(Math.max(0, content.length - 500)));
        
        // Final attempt: create a minimal valid recipe JSON
        console.log('🚨 FALLBACK TRIGGERED: Creating generic recipe due to JSON parsing failure');
        console.log('🚨 This means the AI generated malformed JSON - check logs above');
        
        return this.createFallbackRecipe(content);
      }
    }
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
      strInstructions: "Step 1: Prepare ingredients. Step 2: Cook according to recipe. Step 3: Serve hot.",
      strMealThumb: "",
      strTags: "FALLBACK,JSON_PARSING_FAILED",
      strEquipment: "🚨 FALLBACK: Basic kitchen tools",
      strPrepTime: "15 minutes",
      strCookTime: "30 minutes",
      strTotalTime: "45 minutes",
      strServings: "4",
      strIngredient1: "🚨 FALLBACK: Main ingredient", strMeasure1: "1 lb",
      strIngredient2: "🚨 FALLBACK: Seasoning", strMeasure2: "To taste",
      strIngredient3: "", strMeasure3: "",
      strIngredient4: "", strMeasure4: "",
      strIngredient5: "", strMeasure5: "",
      strIngredient6: "", strMeasure6: "",
      strIngredient7: "", strMeasure7: "",
      strIngredient8: "", strMeasure8: ""
    };
  }

  // OPTIMIZED single-step recipe generation
  async generateOptimizedRecipe(params = {}) {
    const { mode, filters } = params;
    
    let optimizedPrompt;
    if (mode === 'filtered' && filters) {
      // Filtered generation
      const filterPrompt = this.buildFilterPrompt(filters);
      optimizedPrompt = `${filterPrompt}

Generate a recipe that matches these criteria with comprehensive data. Return ONLY this JSON:`;
    } else {
      // Random recipe
      const cuisines = ['Italian', 'Mexican', 'Asian', 'Mediterranean', 'Indian', 'French'];
      const categories = ['Beef', 'Chicken', 'Seafood', 'Vegetarian', 'Pasta', 'Dessert'];
      const randomCuisine = cuisines[Math.floor(Math.random() * cuisines.length)];
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      
      optimizedPrompt = `Create a creative ${randomCuisine} ${randomCategory} recipe with comprehensive data. Return ONLY this JSON:`;
    }

    optimizedPrompt += `
{
  "strMeal": "Recipe Name",
  "strCategory": "Category",
  "strArea": "Cuisine",
  "strDescription": "2-3 sentence description",
  "instructions": ["Step 1: instruction", "Step 2: instruction", "Step 3: instruction"],
  "strIngredient1": "ingredient", "strMeasure1": "amount",
  "strIngredient2": "ingredient", "strMeasure2": "amount",
  "strIngredient3": "ingredient", "strMeasure3": "amount",
  "strIngredient4": "ingredient", "strMeasure4": "amount",
  "strIngredient5": "ingredient", "strMeasure5": "amount",
  "strIngredient6": "ingredient", "strMeasure6": "amount",
  "prepTime": 15,
  "cookTime": 25,
  "totalTime": 40,
  "numberOfServings": 4,
  "servingSize": "1 serving",
  "difficulty": "Medium",
  "yield": "4 servings",
  "strEquipment": "cooking tools",
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
  "mealType": ["Dinner"],
  "dishType": "Main Course",
  "mainIngredient": "main ingredient",
  "occasion": ["Weeknight"],
  "seasonality": ["All Season"],
  "equipmentRequired": ["tools"],
  "skillsRequired": ["techniques"],
  "keywords": ["terms"],
  "allergenFlags": ["allergens"],
  "timeCategory": "30-60 mins"
}

Fill with realistic values based on the recipe. NO zeros or empty strings.`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a chef and nutritionist. Create complete recipes with realistic data. Return only valid JSON.'
        },
        {
          role: 'user',
          content: optimizedPrompt
        }
      ],
      temperature: 0.8,
      max_tokens: 2000 // Balanced for speed and completeness
    });

    const recipeData = this.parseAIResponse(completion.choices[0].message.content);
    return this.quickFormatRecipe(recipeData, params);
  }

  // STEP 1: Generate basic recipe with simple prompt
  async generateBasicRecipe(params = {}) {
    const { customPrompt, mode } = params;
    
    let basicPrompt;
    if (mode === 'custom' && customPrompt) {
      basicPrompt = `Create a ${customPrompt} recipe. Return ONLY this JSON format:
{
  "strMeal": "Recipe Name",
  "strCategory": "Category (Beef, Chicken, Seafood, Vegetarian, etc)",
  "strArea": "Cuisine (Italian, Mexican, Asian, etc)",
  "strDescription": "Brief appetizing description (2-3 sentences)",
  "instructions": ["Step 1: detailed instruction", "Step 2: detailed instruction", "Step 3: detailed instruction"],
  "strIngredient1": "First ingredient", "strMeasure1": "Amount",
  "strIngredient2": "Second ingredient", "strMeasure2": "Amount",
  "strIngredient3": "Third ingredient", "strMeasure3": "Amount",
  "strIngredient4": "Fourth ingredient", "strMeasure4": "Amount",
  "strIngredient5": "Fifth ingredient", "strMeasure5": "Amount",
  "strIngredient6": "Sixth ingredient", "strMeasure6": "Amount"
}`;
    } else {
      // Random recipe
      const cuisines = ['Italian', 'Mexican', 'Asian', 'Mediterranean', 'Indian', 'French', 'American'];
      const categories = ['Beef', 'Chicken', 'Seafood', 'Vegetarian', 'Pasta', 'Dessert'];
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
  "instructions": ["Step 1: detailed instruction", "Step 2: detailed instruction", "Step 3: detailed instruction"],
  "strIngredient1": "First ingredient", "strMeasure1": "Amount",
  "strIngredient2": "Second ingredient", "strMeasure2": "Amount",
  "strIngredient3": "Third ingredient", "strMeasure3": "Amount",
  "strIngredient4": "Fourth ingredient", "strMeasure4": "Amount",
  "strIngredient5": "Fifth ingredient", "strMeasure5": "Amount",
  "strIngredient6": "Sixth ingredient", "strMeasure6": "Amount"
}`;
    }

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a chef. Create realistic recipes with real ingredients and detailed instructions. Return only valid JSON.'
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
  "strIngredient1": "${basicRecipe.strIngredient1}", "strMeasure1": "${basicRecipe.strMeasure1}",
  "strIngredient2": "${basicRecipe.strIngredient2}", "strMeasure2": "${basicRecipe.strMeasure2}",
  "strIngredient3": "${basicRecipe.strIngredient3}", "strMeasure3": "${basicRecipe.strMeasure3}",
  "strIngredient4": "${basicRecipe.strIngredient4}", "strMeasure4": "${basicRecipe.strMeasure4}",
  "strIngredient5": "${basicRecipe.strIngredient5}", "strMeasure5": "${basicRecipe.strMeasure5}",
  "strIngredient6": "${basicRecipe.strIngredient6}", "strMeasure6": "${basicRecipe.strMeasure6}",
  "prepTime": 15,
  "cookTime": 25,
  "totalTime": 40,
  "numberOfServings": 4,
  "servingSize": "1 serving",
  "difficulty": "Medium",
  "yield": "4 servings",
  "strEquipment": "Large skillet (12-inch), Chef's knife (8-inch), Mixing bowl, Measuring spoons",
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
  "equipmentRequired": ["Large skillet (12-inch)", "Chef's knife (8-inch)", "Mixing bowl", "Measuring spoons"],
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
      prepTime: 15,
      cookTime: 25,
      totalTime: 40,
      numberOfServings: 4,
      servingSize: "1 serving",
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
      equipmentRequired: ["Skillet", "Knife", "Cutting board"],
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

      const allowedIngredients = [
        "abalone", "acai berry", "ackee", "acorn squash", "active dry yeast", "adzuki beans", "agar agar", "agave nectar", "aioli", "aleppo pepper",
        "alfalfa sprouts", "alfredo sauce", "all-purpose flour", "allspice", "almond butter", "almond extract", "almond flour", "almond milk", "almond paste", "almonds",
        "anchovies", "Anchovy Paste", "andouille sausage", "anise seeds", "annatto", "apple", "apple butter", "applesauce", "apricot", "apricot jam",
        "arborio rice", "Arrowroot powder", "artichoke", "asafoetida", "asiago cheese", "Asian Pear", "asparagus", "avocado", "bacon", "Baguette",
        "baking powder", "baking soda", "balsamic vinegar", "banana", "banana blossom", "barbecue sauce", "barley", "barley flour", "basil", "basil seeds",
        "Basmati Rice", "Bay Leaf", "beef", "Beef Bourguignon", "beef brisket", "beef broth", "Beef Ribs", "beef stock", "beef tenderloin", "beets",
        "Belacan (shrimp paste)", "bell pepper", "bell peppers", "besan (chickpea flour)", "black beans", "black cardamom", "black fungus (cloud ear)", "Black Garlic", "Black Pepper", "Black Peppercorns",
        "black salt (kala namak)", "Black Tea", "black truffle", "Black-Eyed Peas", "Blood Sausage", "blue cheese", "blue cheese dressing", "blueberry", "bok choy", "Bonito Flakes",
        "bourbon", "Brandy", "Bread", "bread flour", "Breadcrumbs", "Breakfast Sausage", "Brie", "Broccoli", "Broccolini", "Brown Mustard Seeds",
        "brown rice", "brown sugar", "brownie mix", "brussels sprouts", "buckwheat", "buckwheat flour", "bulgur", "burdock root", "butter", "butter lettuce",
        "buttermilk", "buttermilk powder", "butternut squash", "cabbage", "Cacao Nibs", "Cactus Pear (Prickly Pear)", "Cajun Seasoning", "Calamari (Squid)", "camembert", "candied ginger",
        "candied orange peel", "candlenut", "cane vinegar", "canned salmon", "canned tomatoes", "canned tuna", "cannellini beans", "Caper Berries", "Capers", "Caramel Sauce",
        "caraway seeds", "carne asada", "carolina reaper", "carrot", "cashew butter", "cashew milk", "cashews", "cassava", "catfish", "cauliflower",
        "cayenne pepper", "celery", "celery root (celeriac)", "champagne vinegar", "chana dal", "chanterelle mushrooms", "char siu sauce", "cheddar cheese", "cheese", "cheese curds",
        "cherry", "cherry tomato", "chervil", "chickpeas", "chili oil", "chili paste", "chili powder", "chili sauce", "Chinese five-spice", "chipotle chili powder",
        "chives", "chocolate chips", "chocolate hazelnut spread", "chocolate syrup", "cider", "cilantro", "cinnamon", "cinnamon stick", "clam juice", "clams",
        "clarified butter", "clotted cream", "cloves", "cocoa powder", "coconut", "coconut aminos", "coconut cream", "coconut milk", "coconut oil", "coconut sugar",
        "coconut vinegar", "cod", "coffee", "cognac", "collard greens", "condensed milk", "coriander seeds", "corn", "corn flakes", "corn oil",
        "corn syrup", "corn tortillas", "corned beef", "cornmeal", "cotija cheese", "cottage cheese", "crab", "crab meat", "cranberries", "cream cheese",
        "cream of coconut", "cream of tartar", "crème fraîche", "cremebrule", "cremini mushrooms", "cucumber", "cumin seeds", "curly parsley", "currants", "curry leaves",
        "curry paste", "curry powder", "daikon radish", "dashi", "dates", "demi-glace", "diced tomatoes", "dijon mustard", "dill", "dill seeds",
        "dried apricots", "dried cranberries", "dried figs", "dried hibiscus", "dried shrimp", "dried thyme", "dry mustard powder", "duck", "duck eggs", "duck fat",
        "duck sauce", "dulce de leche", "edam cheese", "edamame", "egg noodles", "egg whites", "egg yolks", "eggplant", "eggs", "egusi seeds",
        "elderberry", "empanadas", "enoki mushrooms", "espresso powder", "evaporated milk", "extra virgin olive oil", "fava beans", "fennel bulb", "fennel seeds", "fenugreek leaves",
        "fenugreek seeds", "fermented black beans", "filé powder", "fish maw", "fish sauce", "five-spice powder", "flaxseeds", "flour tortillas", "fontina cheese", "forbidden rice (black rice)",
        "freekeh", "freeze-dried fruit", "french dressing", "fried onions", "frosting", "fruit cocktail (canned)", "garam masala", "garlic", "garlic chives", "garlic powder",
        "garlic scapes", "gelatin", "gin", "ginger", "ginger paste", "ginger powder", "gingersnaps (crushed)", "glucose syrup", "glutinous rice (sticky rice)", "goat",
        "goat cheese", "gochugaru (Korean chili flakes)", "gochujang", "salmon", "salt", "spaghetti", "Spaghetti Carbonara", "spinach", "sugar", "sushi", "tiramisu"
      ];

      const prompt = `Generate ${count} delicious ${season} recipes featuring seasonal ingredients like ${ingredients}. 

🚨 CRITICAL CONSTRAINT: ONLY use ingredients from this EXACT list (match names precisely): ${allowedIngredients.join(', ')}

For each recipe, return JSON format with:
- strMeal: Recipe name
- strCategory: Food category
- strArea: Cuisine origin
- strInstructions: Detailed cooking instructions
- ingredients: Object with strIngredient1-20 and strMeasure1-20 (MUST use allowed ingredients only)
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
  buildRecipePrompt(params) {
    const restrictionsText = params.dietaryRestrictions.length > 0 
      ? ` The recipe must accommodate these dietary restrictions: ${params.dietaryRestrictions.join(', ')}.`
      : '';

    // 🚨 CRITICAL: ONLY USE INGREDIENTS FROM THIS EXACT LIST - MATCH NAMES PRECISELY
    const allowedIngredients = [
      "abalone", "acai berry", "ackee", "acorn squash", "active dry yeast", "adzuki beans", "agar agar", "agave nectar", "aioli", "aleppo pepper",
      "alfalfa sprouts", "alfredo sauce", "all-purpose flour", "allspice", "almond butter", "almond extract", "almond flour", "almond milk", "almond paste", "almonds",
      "anchovies", "Anchovy Paste", "andouille sausage", "anise seeds", "annatto", "apple", "apple butter", "applesauce", "apricot", "apricot jam",
      "arborio rice", "Arrowroot powder", "artichoke", "asafoetida", "asiago cheese", "Asian Pear", "asparagus", "avocado", "bacon", "Baguette",
      "baking powder", "baking soda", "balsamic vinegar", "banana", "banana blossom", "barbecue sauce", "barley", "barley flour", "basil", "basil seeds",
      "Basmati Rice", "Bay Leaf", "beef", "Beef Bourguignon", "beef brisket", "beef broth", "Beef Ribs", "beef stock", "beef tenderloin", "beets",
      "Belacan (shrimp paste)", "bell pepper", "bell peppers", "besan (chickpea flour)", "black beans", "black cardamom", "black fungus (cloud ear)", "Black Garlic", "Black Pepper", "Black Peppercorns",
      "black salt (kala namak)", "Black Tea", "black truffle", "Black-Eyed Peas", "Blood Sausage", "blue cheese", "blue cheese dressing", "blueberry", "bok choy", "Bonito Flakes",
      "bourbon", "Brandy", "Bread", "bread flour", "Breadcrumbs", "Breakfast Sausage", "Brie", "Broccoli", "Broccolini", "Brown Mustard Seeds",
      "brown rice", "brown sugar", "brownie mix", "brussels sprouts", "buckwheat", "buckwheat flour", "bulgur", "burdock root", "butter", "butter lettuce",
      "buttermilk", "buttermilk powder", "butternut squash", "cabbage", "Cacao Nibs", "Cactus Pear (Prickly Pear)", "Cajun Seasoning", "Calamari (Squid)", "camembert", "candied ginger",
      "candied orange peel", "candlenut", "cane vinegar", "canned salmon", "canned tomatoes", "canned tuna", "cannellini beans", "Caper Berries", "Capers", "Caramel Sauce",
      "caraway seeds", "carne asada", "carolina reaper", "carrot", "cashew butter", "cashew milk", "cashews", "cassava", "catfish", "cauliflower",
      "cayenne pepper", "celery", "celery root (celeriac)", "champagne vinegar", "chana dal", "chanterelle mushrooms", "char siu sauce", "cheddar cheese", "cheese", "cheese curds",
      "cherry", "cherry tomato", "chervil", "chickpeas", "chili oil", "chili paste", "chili powder", "chili sauce", "Chinese five-spice", "chipotle chili powder",
      "chives", "chocolate chips", "chocolate hazelnut spread", "chocolate syrup", "cider", "cilantro", "cinnamon", "cinnamon stick", "clam juice", "clams",
      "clarified butter", "clotted cream", "cloves", "cocoa powder", "coconut", "coconut aminos", "coconut cream", "coconut milk", "coconut oil", "coconut sugar",
      "coconut vinegar", "cod", "coffee", "cognac", "collard greens", "condensed milk", "coriander seeds", "corn", "corn flakes", "corn oil",
      "corn syrup", "corn tortillas", "corned beef", "cornmeal", "cotija cheese", "cottage cheese", "crab", "crab meat", "cranberries", "cream cheese",
      "cream of coconut", "cream of tartar", "crème fraîche", "cremebrule", "cremini mushrooms", "cucumber", "cumin seeds", "curly parsley", "currants", "curry leaves",
      "curry paste", "curry powder", "daikon radish", "dashi", "dates", "demi-glace", "diced tomatoes", "dijon mustard", "dill", "dill seeds",
      "dried apricots", "dried cranberries", "dried figs", "dried hibiscus", "dried shrimp", "dried thyme", "dry mustard powder", "duck", "duck eggs", "duck fat",
      "duck sauce", "dulce de leche", "edam cheese", "edamame", "egg noodles", "egg whites", "egg yolks", "eggplant", "eggs", "egusi seeds",
      "elderberry", "empanadas", "enoki mushrooms", "espresso powder", "evaporated milk", "extra virgin olive oil", "fava beans", "fennel bulb", "fennel seeds", "fenugreek leaves",
      "fenugreek seeds", "fermented black beans", "filé powder", "fish maw", "fish sauce", "five-spice powder", "flaxseeds", "flour tortillas", "fontina cheese", "forbidden rice (black rice)",
      "freekeh", "freeze-dried fruit", "french dressing", "fried onions", "frosting", "fruit cocktail (canned)", "garam masala", "garlic", "garlic chives", "garlic powder",
      "garlic scapes", "gelatin", "gin", "ginger", "ginger paste", "ginger powder", "gingersnaps (crushed)", "glucose syrup", "glutinous rice (sticky rice)", "goat",
      "goat cheese", "gochugaru (Korean chili flakes)", "gochujang", "salmon", "salt", "spaghetti", "Spaghetti Carbonara", "spinach", "sugar", "sushi", "tiramisu"
    ];

    const allowedEquipment = [
      "Air fryer", "Broiler pan", "Dutch oven", "Grill", "Grill pan", "Microwave", "Oven", 
      "Pressure cooker", "Rice cooker", "Saucepan", "Baking sheet", "Frying pan", "Slow cooker", 
      "Small pot", "Medium pot", "Large pot", "Stovetop", "Wok", "Bench scraper", "Chef's knife", 
      "Citrus juicer", "Citrus zester", "Cutting board", "Dough scraper", "Egg separator", 
      "Fish spatula", "Food tweezers", "Garlic press", "Jar opener", "Kitchen scissors", "Ladle", 
      "Mandoline slicer", "Meat tenderizer", "Spray bottle", "Paring knife", "Pastry blender", 
      "Pastry brush", "Pasta spoon", "Peeler", "Pizza cutter", "Rolling pin", "Spatula (rubber)", 
      "Spatula (metal)", "Tongs", "Vegetable peeler", "Whisk", "Zester", "Glass measuring cup", 
      "Kitchen scale", "Large mixing bowl", "Medium mixing bowl", "Small mixing bowl", 
      "Measuring cups", "Measuring spoons", "Mortar and pestle", "Piping bag", "Plate", "Bowl", 
      "Salad bowl", "Serving bowl", "Tamper (for blender)", "Timer", "Toothpicks", 
      "Tweezers (plating)", "Fork", "Spoon", "Knife (table)", "Serving spoon", "Slotted spoon", 
      "Baking dish", "Baking ramekin", "Cake pan", "Cooling rack", "Cookie cutters", "Loaf pan", 
      "Muffin tin", "Parchment paper", "Pie dish", "Silicone baking mat", "Springform pan", 
      "Stand mixer", "Whipped cream siphon", "Can opener", "Colander", "Funnel", "Salad spinner", 
      "Sieve", "Skewers", "Strainer", "Storage container", "Bottle opener", "Corkscrew", 
      "Ice cube mold", "Ice cream scoop", "Cocktail shaker", "Aluminum foil", "Apron", 
      "Dish towel", "Oven mitts", "Paper towels", "Plastic wrap", "Trivet", "Chopsticks", 
      "Food processor", "Hand mixer", "Sous vide wand"
    ];

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
3. 🚫 ONLY use equipment from this list: ${allowedEquipment.join(', ')}
4. 🚨 CRITICAL: ONLY use ingredients from this EXACT list - match names PRECISELY: ${allowedIngredients.join(', ')}
5. ✅ Instructions must be ACTUAL cooking steps (not descriptions)
6. ✅ All times must be specific numbers (15 min, 25 min, etc.)
7. ✅ All measurements must be precise (2 cups, 1 tbsp, etc.)
8. ✅ Generate complete ingredient slots 1-20

⚠️ IF YOU USE "N/A" ANYWHERE, THE ENTIRE RESPONSE IS INVALID ⚠️

Return ONLY valid JSON with this COMPLETE structure:

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
    "Step 1: Detailed first instruction with specific techniques",
    "Step 2: Detailed second instruction with temperatures/times",
    "Step 3: Continue with specific steps..."
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
  
  "cookingInfo": {
    "prepTime": "15 minutes",
    "cookTime": "25 minutes", 
    "totalTime": "40 minutes",
    "servings": ${params.servings},
    "difficulty": "${params.difficulty}",
    "equipment": ["Large pot", "Chef's knife", "Cutting board"],
    "yield": "Serves ${params.servings}"
  }
}

🚨 ABSOLUTE REQUIREMENTS - ZERO TOLERANCE FOR N/A:
- Fill ALL ingredient slots (1-20) - use empty string "" for unused slots, NEVER null or undefined
- Create 6-12 detailed COOKING STEPS (not descriptions) - "Heat oil in pan", "Add chicken and cook 5 minutes"
- Use ONLY the allowed equipment list provided above
- 🚫 BANNED WORDS: "N/A", "TBD", "Unknown", "Various", "As needed", "To taste"
- ✅ REQUIRED: Specific times (15 min, 25 min), specific amounts (2 cups, 1 tbsp)
- ✅ REQUIRED: Real nutritional values (350 calories, 28g protein)
- ✅ REQUIRED: Specific recipe names (Tuscan Herb Chicken Pasta, not "Pasta Dish")
- ✅ REQUIRED: Actual cooking instructions with temperatures (350°F, medium heat)
- ✅ REQUIRED: Precise measurements for ALL ingredients

🔥 VALIDATION CHECK: Scan your entire response and replace ANY "N/A" with real values before returning!`;
  }

  // COMPREHENSIVE recipe formatting - NO N/A VALUES EVER
  quickFormatRecipe(recipeData, params) {
    // Handle instructions array - create strInstructions from array if needed
    let instructionsArray = recipeData.instructions || [];
    let strInstructions = recipeData.strInstructions || '';
    
    if (instructionsArray.length > 0 && !strInstructions) {
      strInstructions = instructionsArray.map((step, index) => `Step ${index + 1}: ${step}`).join(' ');
    } else if (strInstructions && instructionsArray.length === 0) {
      instructionsArray = this.parseInstructionsToArray(strInstructions);
    } else if (!strInstructions && instructionsArray.length === 0) {
      instructionsArray = ['Prepare ingredients according to recipe', 'Cook as directed', 'Serve hot'];
      strInstructions = instructionsArray.map((step, index) => `Step ${index + 1}: ${step}`).join(' ');
    }

    const recipe = {
      // Core recipe data
      strMeal: recipeData.strMeal || `Delicious ${params.cuisine || 'International'} ${params.category || 'Dish'}`,
      strDescription: recipeData.strDescription || `A delicious ${params.cuisine || 'international'} ${params.category || 'dish'} that's perfect for any occasion.`,
      strCategory: recipeData.strCategory || params.category || 'Main Dish',
      strArea: recipeData.strArea || params.cuisine || 'International', 
      strInstructions: strInstructions,
      instructions: instructionsArray,
      strMealThumb: recipeData.strMealThumb || '',
      strTags: recipeData.strTags || `${params.cuisine || 'international'},${params.category || 'dish'},${params.difficulty || 'medium'}`.toLowerCase(),
      strYoutube: '',
      strSource: 'AI Generated',
      dateModified: new Date().toISOString(),
      
      // TIME AND SERVING INFO - NEVER N/A
      prepTime: parseInt(recipeData.prepTime) || 15,
      cookTime: parseInt(recipeData.cookTime) || 25,
      totalTime: parseInt(recipeData.totalTime) || parseInt(recipeData.prepTime) + parseInt(recipeData.cookTime) || 40,
      numberOfServings: parseInt(recipeData.numberOfServings) || parseInt(recipeData.servings) || params.servings || 4,
      servingSize: recipeData.servingSize || '1 cup',
      difficulty: recipeData.difficulty || params.difficulty || 'Medium',
      yield: recipeData.yield || `${parseInt(recipeData.numberOfServings) || params.servings || 4} servings`,
      
      // COMPREHENSIVE NUTRITIONAL INFO
      nutrition: recipeData.nutrition || {
        caloriesPerServing: 350,
        protein: 25,
        carbs: 35,
        fat: 12,
        fiber: 6,
        sugar: 8,
        sodium: 680,
        cholesterol: 45,
        saturatedFat: 4,
        vitaminA: 15,
        vitaminC: 25,
        iron: 12,
        calcium: 8
      },
      
      // DIETARY AND CATEGORIZATION
      dietary: recipeData.dietary || {
        vegetarian: false,
        vegan: false,
        glutenFree: false,
        dairyFree: false,
        keto: false,
        paleo: false
      },
      
      mealType: Array.isArray(recipeData.mealType) ? recipeData.mealType : [recipeData.mealType || params.category || 'Dinner'],
      dishType: recipeData.dishType || params.category || 'Main Course',
      mainIngredient: recipeData.mainIngredient || params.mainIngredient || this.extractMainIngredient(recipeData) || 'Mixed ingredients',
      occasion: Array.isArray(recipeData.occasion) ? recipeData.occasion : [recipeData.occasion || 'Weeknight'],
      seasonality: Array.isArray(recipeData.seasonality) ? recipeData.seasonality : [recipeData.seasonality || 'All Season'],
      equipmentRequired: Array.isArray(recipeData.equipmentRequired) ? recipeData.equipmentRequired : ['Skillet', 'Knife', 'Cutting Board', 'Measuring Cups'],
      skillsRequired: Array.isArray(recipeData.skillsRequired) ? recipeData.skillsRequired : ['Chopping', 'Cooking'],
      
      // SEARCH & FILTER SUPPORT
      keywords: Array.isArray(recipeData.keywords) ? recipeData.keywords : [params.cuisine || 'international', params.category || 'dish'],
      alternateTitles: Array.isArray(recipeData.alternateTitles) ? recipeData.alternateTitles : [],
      commonMisspellings: Array.isArray(recipeData.commonMisspellings) ? recipeData.commonMisspellings : [],
      allergenFlags: Array.isArray(recipeData.allergenFlags) ? recipeData.allergenFlags : [],
      timeCategory: recipeData.timeCategory || 'Under 1 hour',
      
      // ENHANCED INGREDIENTS
      ingredientsDetailed: Array.isArray(recipeData.ingredientsDetailed) ? recipeData.ingredientsDetailed : [],
      
      // EQUIPMENT - NEVER EMPTY
      equipment: recipeData.strEquipment ? recipeData.strEquipment.split(',').map(e => e.trim()) : 
                recipeData.equipment || ['Large pot', 'Wooden spoon', 'Chef\'s knife', 'Cutting board', 'Measuring cups'],
      strEquipment: recipeData.strEquipment || 'Large skillet (12-inch), Mixing bowl (medium), Measuring cups, Chef\'s knife (8-inch), Cutting board, Wooden spoon, Tongs'
    };

    // Fill ALL 20 ingredient slots - NEVER LEAVE EMPTY
    for (let i = 1; i <= 20; i++) {
      recipe[`strIngredient${i}`] = recipeData[`strIngredient${i}`] || '';
      recipe[`strMeasure${i}`] = recipeData[`strMeasure${i}`] || '';
    }

    // ENSURE NO N/A VALUES ANYWHERE
    Object.keys(recipe).forEach(key => {
      if (typeof recipe[key] === 'string' && (recipe[key] === 'N/A' || recipe[key] === 'n/a' || recipe[key] === 'TBD')) {
        recipe[key] = this.getFieldDefault(key, params);
      }
    });

    return recipe;
  }

  // Extract main ingredient from recipe data
  extractMainIngredient(recipeData) {
    for (let i = 1; i <= 5; i++) {
      const ingredient = recipeData[`strIngredient${i}`];
      if (ingredient && ingredient.trim()) {
        return ingredient.trim();
      }
    }
    return null;
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
      prepTime: '15 minutes',
      cookTime: '25 minutes',
      totalTime: '40 minutes',
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
      prepTime: '15 minutes',
      cookTime: '25 minutes',
      totalTime: '40 minutes',
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