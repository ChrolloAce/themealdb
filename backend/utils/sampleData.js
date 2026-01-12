const sampleRecipes = [
  {
    strMeal: "Spicy Arrabiata Penne",
    strCategory: "Lunch", 
    strArea: "Italian",
    strInstructions: "Bring a large pot of water to a boil. Add kosher salt to the boiling water, then add the pasta. Cook according to the package instructions, about 10 to 12 minutes. Reserve a cup of the pasta water and drain the pasta. Add the pasta back to the pot and add a splash of the reserved pasta water. Next, add the red chile flakes, salt, and a few turns of pepper and stir. Add the oil, basil, and garlic and stir. Finally, add the tomatoes and mix well. Remove from heat and serve with grated Parmigiano-Reggiano cheese.",
    strMealThumb: "/images/meals/arrabiata.jpg",
    strTags: "Pasta,Spicy,Vegetarian",
    strYoutube: "https://www.youtube.com/watch?v=1IszT_guI08",
    strIngredient1: "penne rigate", strMeasure1: "1 pound",
    strIngredient2: "olive oil", strMeasure2: "1/4 cup", 
    strIngredient3: "garlic", strMeasure3: "3 cloves",
    strIngredient4: "chopped tomatoes", strMeasure4: "1 tin",
    strIngredient5: "red chile flakes", strMeasure5: "1/2 teaspoon",
    strIngredient6: "italian seasoning", strMeasure6: "1/2 teaspoon",
    strIngredient7: "basil", strMeasure7: "6 leaves",
    strIngredient8: "Parmigiano-Reggiano", strMeasure8: "sprinkling",
    strEquipment: "Large pot, Colander, Large skillet, Wooden spoon, Cheese grater, Serving bowls"
  },
  {
    strMeal: "Classic Beef Tacos",
    strCategory: "Dinner",
    strArea: "Mexican", 
    strInstructions: "Heat oil in a large skillet over medium-high heat. Add ground beef and cook, breaking it up with a spoon, until browned and cooked through, about 8 minutes. Add onion and cook until softened, about 3 minutes. Add garlic, chili powder, cumin, and paprika and cook until fragrant, about 1 minute. Season with salt and pepper. Warm tortillas according to package directions. Fill each tortilla with beef mixture and desired toppings.",
    strMealThumb: "/images/meals/beef-tacos.jpg",
    strTags: "Beef,Mexican,Tacos",
    strYoutube: "",
    strIngredient1: "ground beef", strMeasure1: "1 lb",
    strIngredient2: "yellow onion", strMeasure2: "1 medium",
    strIngredient3: "garlic", strMeasure3: "2 cloves",
    strIngredient4: "chili powder", strMeasure4: "1 tsp",
    strIngredient5: "ground cumin", strMeasure5: "1/2 tsp",
    strIngredient6: "paprika", strMeasure6: "1/2 tsp",
    strIngredient7: "corn tortillas", strMeasure7: "8",
    strIngredient8: "cheddar cheese", strMeasure8: "1 cup shredded",
    strEquipment: "Large skillet, Wooden spoon, Knife, Cutting board, Measuring cups, Serving plates"
  },
  {
    strMeal: "Chicken Teriyaki Bowl",
    strCategory: "Dinner",
    strArea: "Japanese",
    strInstructions: "Cut chicken into bite-sized pieces and season with salt and pepper. Heat oil in a large skillet over medium-high heat. Add chicken and cook until golden brown and cooked through, about 6-8 minutes. In a small bowl, whisk together soy sauce, brown sugar, rice vinegar, garlic, and ginger. Pour sauce over chicken and simmer until thickened, about 2-3 minutes. Serve over steamed rice with vegetables.",
    strMealThumb: "/images/meals/teriyaki-chicken.jpg", 
    strTags: "Chicken,Japanese,Healthy",
    strYoutube: "",
    strIngredient1: "chicken breast", strMeasure1: "2 lbs",
    strIngredient2: "soy sauce", strMeasure2: "1/4 cup",
    strIngredient3: "brown sugar", strMeasure3: "2 tbsp",
    strIngredient4: "rice vinegar", strMeasure4: "1 tbsp",
    strIngredient5: "garlic", strMeasure5: "2 cloves",
    strIngredient6: "fresh ginger", strMeasure6: "1 tsp",
    strIngredient7: "jasmine rice", strMeasure7: "2 cups",
    strEquipment: "Large skillet, Rice cooker or pot, Knife, Cutting board, Small mixing bowl, Whisk, Serving bowls",
    strIngredient8: "broccoli", strMeasure8: "1 head"
  },
  {
    strMeal: "Mediterranean Salmon",
    strCategory: "Dinner", 
    strArea: "Greek",
    strInstructions: "Preheat oven to 400°F (200°C). Line a baking sheet with parchment paper. Place salmon fillets on the prepared baking sheet. In a small bowl, combine olive oil, lemon juice, garlic, oregano, salt, and pepper. Brush the mixture over the salmon fillets. Top with cherry tomatoes, olives, and feta cheese. Bake for 12-15 minutes, or until salmon flakes easily with a fork.",
    strMealThumb: "/images/meals/mediterranean-salmon.jpg",
    strTags: "Seafood,Healthy,Mediterranean", 
    strYoutube: "",
    strIngredient1: "salmon fillets", strMeasure1: "4 pieces",
    strIngredient2: "olive oil", strMeasure2: "2 tbsp",
    strIngredient3: "lemon juice", strMeasure3: "2 tbsp", 
    strIngredient4: "garlic", strMeasure4: "2 cloves",
    strIngredient5: "dried oregano", strMeasure5: "1 tsp",
    strIngredient6: "cherry tomatoes", strMeasure6: "1 cup",
    strIngredient7: "kalamata olives", strMeasure7: "1/4 cup",
    strIngredient8: "feta cheese", strMeasure8: "1/2 cup crumbled",
    strEquipment: "Baking sheet, Parchment paper, Small mixing bowl, Pastry brush, Knife, Cutting board"
  },
  {
    strMeal: "Chocolate Chip Cookies",
    strCategory: "Dessert",
    strArea: "American", 
    strInstructions: "Preheat oven to 375°F (190°C). In a large bowl, cream together butter and sugars until light and fluffy. Beat in eggs one at a time, then stir in vanilla. In a separate bowl, combine flour, baking soda, and salt. Gradually blend the flour mixture into the creamed mixture. Stir in chocolate chips. Drop rounded tablespoons of dough onto ungreased cookie sheets. Bake for 9 to 11 minutes or until golden brown.",
    strMealThumb: "/images/meals/chocolate-cookies.jpg",
    strTags: "Dessert,Sweet,Cookies",
    strYoutube: "", 
    strIngredient1: "butter", strMeasure1: "1 cup",
    strIngredient2: "white sugar", strMeasure2: "3/4 cup",
    strIngredient3: "brown sugar", strMeasure3: "3/4 cup packed",
    strIngredient4: "eggs", strMeasure4: "2 large",
    strIngredient5: "vanilla extract", strMeasure5: "2 tsp",
    strIngredient6: "all-purpose flour", strMeasure6: "2 1/4 cups",
    strIngredient7: "baking soda", strMeasure7: "1 tsp",
    strIngredient8: "chocolate chips", strMeasure8: "2 cups",
    strEquipment: "Large mixing bowl, Electric mixer, Measuring cups, Cookie sheets, Cookie scoop or spoon, Wire cooling racks"
  }
];

class DataSeeder {
  constructor(recipeManager) {
    this.recipeManager = recipeManager;
  }

  async seedSampleRecipes() {
    try {
      console.log('═══════════════════════════════════════════');
      console.log('🌱 STARTING SAMPLE RECIPE SEEDING');
      console.log(`📦 Will seed ${sampleRecipes.length} recipes`);
      console.log('═══════════════════════════════════════════');
      
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < sampleRecipes.length; i++) {
        const recipeData = sampleRecipes[i];
        console.log(`\n[${i + 1}/${sampleRecipes.length}] Creating: "${recipeData.strMeal}"`);
        console.log(`   Category: ${recipeData.strCategory}, Area: ${recipeData.strArea}`);
        
        try {
          const result = await this.recipeManager.create(recipeData);
          successCount++;
          console.log(`   ✅ SUCCESS - Created with ID: ${result.meals[0].idMeal}`);
        } catch (error) {
          failCount++;
          console.warn(`   ❌ FAILED: ${error.message}`);
        }
      }
      
      console.log('\n═══════════════════════════════════════════');
      console.log('🎉 SAMPLE RECIPE SEEDING COMPLETED');
      console.log(`✅ Success: ${successCount}/${sampleRecipes.length}`);
      console.log(`❌ Failed: ${failCount}/${sampleRecipes.length}`);
      console.log('═══════════════════════════════════════════\n');
    } catch (error) {
      console.error('❌ Sample recipe seeding failed:', error);
      throw error;
    }
  }

  async seedIfEmpty() {
    try {
      console.log('\n🔍 Checking if database needs seeding...');
      
      // Check if database is empty
      const existingRecipes = await this.recipeManager.db.getAllRecipes 
        ? await this.recipeManager.db.getAllRecipes(1)
        : [];
      
      const recipeCount = existingRecipes ? existingRecipes.length : 0;
      console.log(`📊 Current recipe count in database: ${recipeCount}`);
      
      if (recipeCount > 0) {
        console.log(`✋ Database already has recipes, skipping automatic seed`);
        console.log(`💡 To manually seed more recipes, use POST /admin/seed-recipes\n`);
        return;
      }
      
      // Seed sample recipes if database is empty
      console.log('⚠️ Database is EMPTY!');
      console.log('🌱 Initiating automatic seed for variety...\n');
      await this.seedSampleRecipes();
    } catch (error) {
      console.log('⚠️ Could not check recipe count:', error.message);
      console.log('🔄 Attempting to seed anyway...\n');
      try {
        await this.seedSampleRecipes();
      } catch (seedError) {
        console.error('❌ Failed to seed recipes:', seedError.message);
      }
    }
  }
}

module.exports = { sampleRecipes, DataSeeder };