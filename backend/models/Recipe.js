class Recipe {
  constructor(data = {}) {
    this.idMeal = data.idMeal || null;
    this.strMeal = data.strMeal || '';
    this.strDrinkAlternate = data.strDrinkAlternate || null;
    this.strCategory = data.strCategory || '';
    this.strArea = data.strArea || '';
    this.strInstructions = data.strInstructions || '';
    this.strMealThumb = data.strMealThumb || '';
    this.strTags = data.strTags || '';
    this.strYoutube = data.strYoutube || '';
    this.strSource = data.strSource || '';
    this.strImageSource = data.strImageSource || null;
    this.strCreativeCommonsConfirmed = data.strCreativeCommonsConfirmed || null;
    this.strEquipment = data.strEquipment || '';
    this.dateModified = data.dateModified || new Date().toISOString();
    
    // Initialize ingredients (up to 20)
    this.ingredients = [];
    this.measures = [];
    
    // Handle both direct ingredient fields and ingredientsArray format
    if (data.ingredientsArray && Array.isArray(data.ingredientsArray)) {
      // Handle new format with ingredientsArray
      data.ingredientsArray.forEach(item => {
        if (item.name && item.name.trim()) {
          this.ingredients.push(item.name.trim());
          const measure = item.amount && item.unit ? 
            `${item.amount} ${item.unit}`.trim() : 
            (item.amount || '').trim();
          this.measures.push(measure);
        }
      });
    }
    
    // Also check traditional strIngredient1, strIngredient2 format
    for (let i = 1; i <= 20; i++) {
      const ingredient = data[`strIngredient${i}`];
      const measure = data[`strMeasure${i}`];
      
      if (ingredient && ingredient.trim()) {
        // Avoid duplicates if we already processed ingredientsArray
        if (!this.ingredients.includes(ingredient.trim())) {
          this.ingredients.push(ingredient.trim());
          this.measures.push(measure ? measure.trim() : '');
        }
      }
    }
    
    // Set individual ingredient fields for database compatibility
    for (let i = 1; i <= 20; i++) {
      this[`strIngredient${i}`] = data[`strIngredient${i}`] || '';
      this[`strMeasure${i}`] = data[`strMeasure${i}`] || '';
    }
  }

  // Convert to database format
  toDbFormat() {
    const dbData = {
      idMeal: this.idMeal,
      strMeal: this.strMeal,
      strDrinkAlternate: this.strDrinkAlternate,
      strCategory: this.strCategory,
      strArea: this.strArea,
      strInstructions: this.strInstructions,
      strMealThumb: this.strMealThumb,
      strTags: this.strTags,
      strYoutube: this.strYoutube,
      strSource: this.strSource,
      strImageSource: this.strImageSource,
      strCreativeCommonsConfirmed: this.strCreativeCommonsConfirmed,
      strEquipment: this.strEquipment,
      dateModified: this.dateModified
    };

    // Add ingredients and measures
    for (let i = 0; i < 20; i++) {
      dbData[`strIngredient${i + 1}`] = this.ingredients[i] || '';
      dbData[`strMeasure${i + 1}`] = this.measures[i] || '';
    }

    return dbData;
  }

  // Convert to API response format
  toApiFormat() {
    const apiData = {
      idMeal: this.idMeal,
      strMeal: this.strMeal,
      strCategory: this.strCategory,
      strArea: this.strArea,
      strInstructions: this.strInstructions,
      strMealThumb: this.strMealThumb,
      strTags: this.strTags,
      strYoutube: this.strYoutube,
      strSource: this.strSource,
      dateModified: this.dateModified
    };

    // Add non-empty ingredients and measures
    for (let i = 0; i < this.ingredients.length && i < 20; i++) {
      if (this.ingredients[i]) {
        apiData[`strIngredient${i + 1}`] = this.ingredients[i];
        apiData[`strMeasure${i + 1}`] = this.measures[i] || '';
      }
    }

    return apiData;
  }

  // Validation
  isValid() {
    // Basic required fields
    if (!this.strMeal || !this.strCategory || !this.strArea || !this.strInstructions) {
      console.log('❌ Recipe validation failed - missing required fields:', {
        strMeal: !!this.strMeal,
        strCategory: !!this.strCategory,
        strArea: !!this.strArea,
        strInstructions: !!this.strInstructions
      });
      return false;
    }
    
    // Check if we have at least one ingredient
    const hasIngredients = this.ingredients.length > 0;
    if (!hasIngredients) {
      console.log('❌ Recipe validation failed - no ingredients found');
      console.log('Ingredients array:', this.ingredients);
      console.log('Raw data check - first few ingredient fields:');
      for (let i = 1; i <= 5; i++) {
        console.log(`strIngredient${i}:`, this[`strIngredient${i}`] || 'not set');
      }
    }
    
    return hasIngredients;
  }

  // Get ingredient list as array
  getIngredientsList() {
    return this.ingredients.filter(ingredient => ingredient && ingredient.trim());
  }

  // Get tags as array
  getTagsList() {
    return this.strTags ? 
           this.strTags.split(',').map(tag => tag.trim()).filter(tag => tag) : 
           [];
  }
}

module.exports = Recipe;