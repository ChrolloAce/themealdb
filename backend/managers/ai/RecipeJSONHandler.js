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
    const dishType = originalContent.match(/"dishType":\s*"([^"]+)"/)?.[1] || 'Main Courses';

    // Smart defaults based on category
    const getSmartDefaults = (cat, dish) => {
      const defaults = {
        'Breakfast': { prep: 10, cook: 15, total: 25, servings: 2 },
        'Brunch': { prep: 15, cook: 20, total: 35, servings: 4 },
        'Lunch': { prep: 15, cook: 20, total: 35, servings: 4 },
        'Dinner': { prep: 20, cook: 30, total: 50, servings: 4 },
        'Snack': { prep: 5, cook: 10, total: 15, servings: 2 },
        'Dessert': { prep: 20, cook: 25, total: 45, servings: 6 }
      };
      return defaults[cat] || defaults['Dinner'];
    };

    // Smart equipment based on dish type
    const getSmartEquipment = (dish) => {
      if (dish && (dish.includes('Baked') || dish.includes('Pastries') || dish.includes('Cookies'))) {
        return ['Oven', 'Baking sheet', 'Mixing bowl', 'Chef\'s knife', 'Cutting board', 'Measuring cups/spoons'];
      } else if (dish && (dish.includes('Slow Cooker') || dish.includes('Stew') || dish.includes('Casserole'))) {
        return ['Dutch oven or Slow cooker', 'Chef\'s knife', 'Cutting board', 'Measuring cups/spoons'];
      } else if (dish && (dish.includes('Salad') || dish.includes('Raw'))) {
        return ['Mixing bowl', 'Chef\'s knife', 'Cutting board', 'Measuring cups/spoons'];
      } else if (dish && dish.includes('Grilling')) {
        return ['Grill', 'Tongs', 'Chef\'s knife', 'Cutting board', 'Measuring cups/spoons'];
      } else {
        return ['Large skillet or saucepan', 'Chef\'s knife', 'Cutting board', 'Measuring cups/spoons'];
      }
    };

    const smartDefaults = getSmartDefaults(category, dishType);
    const smartEquipment = getSmartEquipment(dishType);

    return {
      strMeal: recipeName,
      strCategory: category,
      strArea: area,
      strDescription: "🚨 FALLBACK RECIPE - AI JSON parsing failed. This indicates a problem with the AI response format.",
      strInstructions: "Prepare ingredients. Cook according to recipe. Serve hot.",
      instructions: ["Prepare ingredients", "Cook according to recipe", "Serve hot"],
      strMealThumb: "",
      strTags: "FALLBACK,JSON_PARSING_FAILED",
      strEquipment: smartEquipment.join(', '),
      equipment: smartEquipment,
      prepTime: smartDefaults.prep,
      cookTime: smartDefaults.cook,
      totalTime: smartDefaults.total,
      numberOfServings: smartDefaults.servings,
      servingSize: "1 serving",
      difficulty: "Medium",
      yield: `${smartDefaults.servings} servings`,
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
      equipmentRequired: smartEquipment,
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

