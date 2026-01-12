/**
 * RecipeJSONHandler - Handles JSON parsing, repair, and validation for AI responses
 * Single Responsibility: Parse and fix AI-generated JSON
 */

const JSONRepair = require('../../utils/JSONRepair');

class RecipeJSONHandler {
  /**
   * Parse AI response with automatic repair
   */
  parseAIResponse(content) {
    // Use the JSONRepair class
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

  /**
   * Create a fallback recipe when JSON parsing completely fails
   */
  createFallbackRecipe(originalContent) {
    const recipeName = originalContent.match(/"strMeal":\s*"([^"]+)"/)?.[1] || 'Generated Recipe';
    const category = originalContent.match(/"strCategory":\s*"([^"]+)"/)?.[1] || 'Dinner';
    const area = originalContent.match(/"strArea":\s*"([^"]+)"/)?.[1] || 'International';

    return {
      strMeal: recipeName,
      strCategory: category,
      strArea: area,
      strDescription: "🚨 FALLBACK RECIPE - AI JSON parsing failed. This indicates a problem with the AI response format.",
      strInstructions: "Step 1: Prepare ingredients. Step 2: Cook according to recipe. Step 3: Serve hot.",
      instructions: ["Step 1: Prepare ingredients", "Step 2: Cook according to recipe", "Step 3: Serve hot"],
      strMealThumb: "",
      strTags: "FALLBACK,JSON_PARSING_FAILED",
      strEquipment: "🚨 FALLBACK: Basic kitchen tools",
      equipment: ["🚨 FALLBACK: Basic kitchen tools"],
      prepTime: 15,
      cookTime: 25,
      totalTime: 40,
      numberOfServings: 4,
      servingSize: "1 serving",
      difficulty: "Medium",
      yield: "4 servings",
      nutrition: {
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
      dietary: {
        vegetarian: false,
        vegan: false,
        glutenFree: false,
        dairyFree: false,
        keto: false,
        paleo: false
      },
      mealType: [category],
      dishType: "Main Course",
      mainIngredient: "🚨 FALLBACK: Main ingredient",
      occasion: ["Weeknight"],
      seasonality: ["All Season"],
      equipmentRequired: ["Skillet", "Knife", "Cutting Board", "Measuring Cups"],
      skillsRequired: ["Chopping", "Cooking"],
      keywords: ["international", "dish"],
      allergenFlags: [],
      timeCategory: "Under 1 hour",
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

  /**
   * Eliminate N/A values from recipe data
   */
  eliminateNAValues(recipeData) {
    const cleaned = { ...recipeData };

    for (const key in cleaned) {
      if (typeof cleaned[key] === 'string') {
        const value = cleaned[key].trim();
        if (value === 'N/A' || value === 'n/a' || value === 'TBD' || value === 'Unknown') {
          cleaned[key] = '';
        }
      }
    }

    // Clean ingredient slots specifically
    for (let i = 1; i <= 20; i++) {
      const ingKey = `strIngredient${i}`;
      const measKey = `strMeasure${i}`;

      if (cleaned[ingKey] && (cleaned[ingKey] === 'N/A' || cleaned[ingKey] === '')) {
        cleaned[ingKey] = '';
        cleaned[measKey] = '';
      }
    }

    return cleaned;
  }
}

module.exports = RecipeJSONHandler;

