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
    
    for (let i = 1; i <= 20; i++) {
      const ingredient = data[`strIngredient${i}`];
      const measure = data[`strMeasure${i}`];
      
      if (ingredient && ingredient.trim()) {
        this.ingredients.push(ingredient.trim());
        this.measures.push(measure ? measure.trim() : '');
      }
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
    return this.strMeal && 
           this.strCategory && 
           this.strArea && 
           this.strInstructions &&
           this.ingredients.length > 0;
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