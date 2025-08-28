#!/usr/bin/env node

// Quick debug script to test recipe generation locally
const OpenAIManager = require('./backend/managers/OpenAIManager');

// Set environment variables for testing
process.env.GETIMG_API_KEY = 'key-1mJfmM0BOGNWPGimkjcPxJbiF9YJesDdg8CQCLiyDvQCmBuxS8Clp2O5qywLn1eN6SUJ8iwdCnVZ0qbbTa4AdPaMsvPT1VMw';
process.env.OPENAI_API_KEY = 'test'; // You need to add your real key here

async function testRecipeGeneration() {
    console.log('🧪 Testing recipe generation...');
    
    const openaiManager = new OpenAIManager();
    
    const params = {
        cuisine: 'Asian',
        category: 'Main Dish',
        mainIngredient: 'chicken',
        difficulty: 'medium',
        cookingTime: '30 minutes',
        servings: 4,
        generateImage: true
    };
    
    try {
        console.log('📝 Generating recipe with params:', params);
        const recipe = await openaiManager.generateRecipe(params);
        
        console.log('✅ Recipe generated successfully!');
        console.log('📋 Recipe name:', recipe.strMeal);
        console.log('🏷️ Category:', recipe.strCategory);
        console.log('🌍 Cuisine:', recipe.strArea);
        console.log('⏱️ Prep time:', recipe.prepTime);
        console.log('🔥 Cook time:', recipe.cookTime);
        console.log('⏰ Total time:', recipe.totalTime);
        console.log('🍽️ Servings:', recipe.servings);
        console.log('🥘 Yield:', recipe.yield);
        console.log('🥘 Main ingredient:', recipe.mainIngredient);
        console.log('🎯 Occasion:', recipe.occasion);
        
        // Test image generation
        if (params.generateImage) {
            console.log('\\n🎨 Testing image generation...');
            try {
                const imageData = await openaiManager.generateRecipeImage(recipe.strMeal, `${recipe.strCategory} dish`);
                console.log('✅ Image generated:', imageData.url);
                console.log('💰 Cost:', imageData.cost);
                console.log('🤖 Model:', imageData.model);
            } catch (imageError) {
                console.error('❌ Image generation failed:', imageError.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Recipe generation failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testRecipeGeneration();
