class Recipe {
  constructor(data = {}) {
    // Core Recipe Data
    this.idMeal = data.idMeal || null;
    this.strMeal = data.strMeal || '';
    this.strDescription = data.strDescription || '';
    this.strDrinkAlternate = data.strDrinkAlternate || null;
    this.strCategory = data.strCategory || '';
    this.strArea = data.strArea || '';
    
    // Instructions - handle both array and string formats
    if (Array.isArray(data.instructions)) {
      this.instructions = data.instructions;
      this.strInstructions = data.instructions.join(' ');
    } else if (data.strInstructions) {
      // Parse string instructions into array if they contain "Step X:"
      const stepRegex = /Step\s+\d+:\s*/gi;
      if (stepRegex.test(data.strInstructions)) {
        this.instructions = data.strInstructions
          .split(/Step\s+\d+:\s*/i)
          .filter(step => step.trim())
          .map(step => step.trim());
      } else {
        this.instructions = [data.strInstructions];
      }
      this.strInstructions = data.strInstructions;
    } else {
      this.instructions = [];
      this.strInstructions = '';
    }
    
    this.strMealThumb = data.strMealThumb || '';
    this.strTags = data.strTags || '';
    this.strYoutube = data.strYoutube || '';
    this.strSource = data.strSource || '';
    this.strImageSource = data.strImageSource || null;
    this.strCreativeCommonsConfirmed = data.strCreativeCommonsConfirmed || null;
    this.strEquipment = data.strEquipment || '';
    this.dateModified = data.dateModified || new Date().toISOString();

    // Time Information
    this.prepTime = data.prepTime || 0;
    this.cookTime = data.cookTime || 0;
    this.totalTime = data.totalTime || this.prepTime + this.cookTime;
    this.servingSize = data.servingSize || '';
    this.numberOfServings = data.numberOfServings || 4;
    this.difficulty = data.difficulty || 'Medium';
    this.yield = data.yield || '';

    // Nutritional Information
    this.nutrition = {
      caloriesPerServing: data.nutrition?.caloriesPerServing || 0,
      protein: data.nutrition?.protein || 0,
      carbs: data.nutrition?.carbs || 0,
      fat: data.nutrition?.fat || 0,
      fiber: data.nutrition?.fiber || 0,
      sugar: data.nutrition?.sugar || 0,
      sodium: data.nutrition?.sodium || 0,
      cholesterol: data.nutrition?.cholesterol || 0,
      saturatedFat: data.nutrition?.saturatedFat || 0,
      vitaminA: data.nutrition?.vitaminA || 0,
      vitaminC: data.nutrition?.vitaminC || 0,
      iron: data.nutrition?.iron || 0,
      calcium: data.nutrition?.calcium || 0
    };

    // Dietary and Categorization
    this.dietary = {
      vegetarian: data.dietary?.vegetarian || false,
      vegan: data.dietary?.vegan || false,
      glutenFree: data.dietary?.glutenFree || false,
      dairyFree: data.dietary?.dairyFree || false,
      keto: data.dietary?.keto || false,
      paleo: data.dietary?.paleo || false
    };

    this.mealType = data.mealType || [];
    this.dishType = data.dishType || '';
    this.mainIngredient = data.mainIngredient || '';
    this.occasion = data.occasion || [];
    this.seasonality = data.seasonality || [];
    this.equipmentRequired = data.equipmentRequired || [];
    this.skillsRequired = data.skillsRequired || [];

    // Search & Filter Support
    this.keywords = data.keywords || [];
    this.alternateTitles = data.alternateTitles || [];
    this.commonMisspellings = data.commonMisspellings || [];
    this.allergenFlags = data.allergenFlags || [];
    this.timeCategory = data.timeCategory || '';
    
    // Database compatibility flag
    this.supportsNewFields = data.supportsNewFields !== false; // Default to true unless explicitly false

    // ✅ CLEAN IMAGE HANDLING (modern format only)
    this.additionalImages = [];
    this.images = []; // Initialize to prevent .map() errors
    this.imageCount = 0;
    
    // Handle different image formats and convert to additionalImages array
    if (Array.isArray(data.additionalImages)) {
      // Preferred format: additionalImages array (URLs only)
      this.additionalImages = data.additionalImages.filter(url => url && url.trim());
    } else if (Array.isArray(data.imageUrls)) {
      // Legacy format: imageUrls array
      this.additionalImages = data.imageUrls.filter(url => url && url.trim());
    } else if (Array.isArray(data.images)) {
      // Legacy format: images with metadata
      this.additionalImages = data.images
        .filter(img => img && (img.url || img))
        .map(img => img.url || img);
    }
    
    this.imageCount = this.additionalImages.length;
    
    // ✅ Simple image handling - NO complex metadata arrays
    
    // Initialize ingredients with enhanced structure
    this.ingredients = [];
    this.measures = [];
    this.ingredientsDetailed = []; // New detailed format
    
    // Handle enhanced ingredients format
    if (data.ingredientsDetailed && Array.isArray(data.ingredientsDetailed)) {
      this.ingredientsDetailed = data.ingredientsDetailed.map(item => ({
        name: item.name || '',
        quantity: item.quantity || '',
        unit: item.unit || '',
        optional: item.optional || false,
        required: item.required !== false // defaults to true unless explicitly false
      }));
      
      // Also populate simple arrays for backward compatibility
      this.ingredientsDetailed.forEach(item => {
        if (item.name && item.name.trim()) {
          this.ingredients.push(item.name.trim());
          const measure = item.quantity && item.unit ? 
            `${item.quantity} ${item.unit}`.trim() : 
            (item.quantity || '').trim();
          this.measures.push(measure);
        }
      });
    }
    // Handle traditional ingredientsArray format
    else if (data.ingredientsArray && Array.isArray(data.ingredientsArray)) {
      data.ingredientsArray.forEach(item => {
        if (item.name && item.name.trim()) {
          this.ingredients.push(item.name.trim());
          const measure = item.amount && item.unit ? 
            `${item.amount} ${item.unit}`.trim() : 
            (item.amount || '').trim();
          this.measures.push(measure);
          
          // Create detailed format from simple format
          this.ingredientsDetailed.push({
            name: item.name.trim(),
            quantity: item.amount || '',
            unit: item.unit || '',
            optional: false,
            required: true
          });
        }
      });
    }
    
    // Handle traditional strIngredient1, strIngredient2 format
    for (let i = 1; i <= 20; i++) {
      const ingredient = data[`strIngredient${i}`];
      const measure = data[`strMeasure${i}`];
      
      if (ingredient && ingredient.trim()) {
        // Avoid duplicates if we already processed other formats
        if (!this.ingredients.includes(ingredient.trim())) {
          this.ingredients.push(ingredient.trim());
          this.measures.push(measure ? measure.trim() : '');
          
          // Parse measure to extract quantity and unit
          const measureParts = measure ? measure.trim().split(' ') : [];
          const quantity = measureParts[0] || '';
          const unit = measureParts.slice(1).join(' ') || '';
          
          this.ingredientsDetailed.push({
            name: ingredient.trim(),
            quantity: quantity,
            unit: unit,
            optional: false,
            required: true
          });
        }
      }
    }
    
    // Set individual ingredient fields for database compatibility
    for (let i = 1; i <= 20; i++) {
      this[`strIngredient${i}`] = data[`strIngredient${i}`] || '';
      this[`strMeasure${i}`] = data[`strMeasure${i}`] || '';
    }
  }

  // Convert to database format (CLEAN - MODERN ARRAYS ONLY!)
  toDbFormat() {
    const dbData = {
      // ✅ Core data
      idMeal: this.idMeal,
      strMeal: this.strMeal,
      strDescription: this.strDescription,
      strDrinkAlternate: this.strDrinkAlternate,
      strCategory: this.strCategory,
      strArea: this.strArea,
      strMealThumb: this.strMealThumb,
      additionalImages: this.additionalImages || [],
      strTags: this.strTags,
      strYoutube: this.strYoutube,
      strSource: this.strSource,
      strImageSource: this.strImageSource,
      strCreativeCommonsConfirmed: this.strCreativeCommonsConfirmed,
      dateModified: this.dateModified,

      // ✅ MODERN ARRAY FORMATS ONLY (NO DUPLICATES!)
      instructions: this.instructions,           // ✅ ONLY array
      ingredientsDetailed: this.ingredientsDetailed,  // ✅ ONLY detailed array
      equipmentRequired: this.equipmentRequired, // ✅ ONLY array

      // ✅ Time information
      prepTime: this.prepTime,
      cookTime: this.cookTime,
      totalTime: this.totalTime,
      servingSize: this.servingSize,
      numberOfServings: this.numberOfServings,
      difficulty: this.difficulty,
      yield: this.yield,

      // ✅ Nutritional information
      nutrition: this.nutrition,

      // ✅ Dietary and categorization
      dietary: this.dietary,
      mealType: this.mealType,
      dishType: this.dishType,
      mainIngredient: this.mainIngredient,
      occasion: this.occasion,
      seasonality: this.seasonality,
      skillsRequired: this.skillsRequired,

      // ✅ Search & filter support
      keywords: this.keywords,
      alternateTitles: this.alternateTitles,
      commonMisspellings: this.commonMisspellings,
      allergenFlags: this.allergenFlags,
      timeCategory: this.timeCategory,
      imageCount: this.imageCount,

      // Store comprehensive data in strTags
      strTags: this.generateCompatibleTags()
    };

    // ❌ NO MORE: strIngredient1-20, strMeasure1-20
    // ❌ NO MORE: strInstructions
    // ❌ NO MORE: strEquipment
    // ❌ NO MORE: images array (use additionalImages)
    // ❌ NO MORE: imageUrls

    return dbData;
  }

  // Convert to API response format
  toApiFormat() {
    const apiData = {
      // Core recipe data
      idMeal: this.idMeal,
      strMeal: this.strMeal,
      strDescription: this.strDescription,
      strCategory: this.strCategory,
      strArea: this.strArea,
      strInstructions: this.strInstructions,
      instructions: this.instructions, // Array format
      strMealThumb: this.strMealThumb,
      strTags: this.strTags,
      strYoutube: this.strYoutube,
      strSource: this.strSource,
      dateModified: this.dateModified,

      // Time information
      prepTime: this.prepTime,
      cookTime: this.cookTime,
      totalTime: this.totalTime,
      servingSize: this.servingSize,
      numberOfServings: this.numberOfServings,
      difficulty: this.difficulty,
      yield: this.yield,

      // Nutritional information
      nutrition: this.nutrition,

      // Dietary and categorization
      dietary: this.dietary,
      mealType: this.mealType,
      dishType: this.dishType,
      mainIngredient: this.mainIngredient,
      occasion: this.occasion,
      seasonality: this.seasonality,
      
      // Equipment (both formats for compatibility)
      strEquipment: this.strEquipment || (this.equipmentRequired && Array.isArray(this.equipmentRequired) ? this.equipmentRequired.join(', ') : ''),
      equipmentRequired: this.equipmentRequired,
      skillsRequired: this.skillsRequired,

      // Search & filter support
      keywords: this.keywords,
      alternateTitles: this.alternateTitles,
      commonMisspellings: this.commonMisspellings,
      allergenFlags: this.allergenFlags,
      timeCategory: this.timeCategory,

      // Enhanced ingredients
      ingredientsDetailed: this.ingredientsDetailed,

      // Multiple Images Support - Unlimited Array
      images: this.images || [],
      imageCount: this.imageCount || 0,
      additionalImages: this.additionalImages || [],
      imageUrls: this.additionalImages || [], // Legacy compatibility
      primaryImage: this.strMealThumb || '',
      imageGallery: (this.additionalImages || []).map((url, index) => ({
        url: url,
        alt: `${this.strMeal} image ${index + 1}`,
        isPrimary: index === 0,
        order: index
      }))
    };

    // Add traditional ingredients format for backward compatibility
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
    if (!this.strMeal || !this.strCategory || !this.strArea || (!this.strInstructions && !this.instructions.length)) {
      console.log('❌ Recipe validation failed - missing required fields:', {
        strMeal: !!this.strMeal,
        strCategory: !!this.strCategory,
        strArea: !!this.strArea,
        strInstructions: !!this.strInstructions,
        instructionsArray: this.instructions.length > 0
      });
      return false;
    }
    
    // Check if we have at least one ingredient
    const hasIngredients = this.ingredients.length > 0 || this.ingredientsDetailed.length > 0;
    if (!hasIngredients) {
      console.log('❌ Recipe validation failed - no ingredients found');
      console.log('Ingredients array:', this.ingredients);
      console.log('Detailed ingredients:', this.ingredientsDetailed);
    }

    // Validate time information
    if (this.prepTime < 0 || this.cookTime < 0) {
      console.log('❌ Recipe validation failed - invalid time values');
      return false;
    }

    // Validate serving information
    if (this.numberOfServings <= 0) {
      console.log('❌ Recipe validation failed - invalid number of servings');
      return false;
    }
    
    return hasIngredients;
  }

  // Get ingredient list as array
  getIngredientsList() {
    return this.ingredients.filter(ingredient => ingredient && ingredient.trim());
  }

  // Get detailed ingredients list
  getIngredientsDetailed() {
    return this.ingredientsDetailed.filter(ingredient => ingredient.name && ingredient.name.trim());
  }

  // Get tags as array
  getTagsList() {
    return this.strTags ? 
           this.strTags.split(',').map(tag => tag.trim()).filter(tag => tag) : 
           [];
  }

  // Get instructions as array
  getInstructionsArray() {
    return this.instructions.filter(instruction => instruction && instruction.trim());
  }

  // Calculate total time if not provided
  calculateTotalTime() {
    if (this.totalTime && this.totalTime > 0) {
      return this.totalTime;
    }
    return this.prepTime + this.cookTime;
  }

  // Determine time category based on total time
  determineTimeCategory() {
    const total = this.calculateTotalTime();
    if (total <= 15) return 'Quick (15 mins or less)';
    if (total <= 30) return 'Under 30 minutes';
    if (total <= 60) return 'Under 1 hour';
    if (total <= 120) return 'Under 2 hours';
    return '2+ hours';
  }

  // Get allergen information from ingredients
  detectAllergens() {
    const commonAllergens = {
      'nuts': ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'peanut'],
      'dairy': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream'],
      'eggs': ['egg', 'eggs'],
      'soy': ['soy sauce', 'tofu', 'tempeh', 'miso'],
      'gluten': ['flour', 'wheat', 'bread', 'pasta', 'barley', 'rye'],
      'shellfish': ['shrimp', 'crab', 'lobster', 'scallop', 'oyster', 'mussel'],
      'fish': ['salmon', 'tuna', 'cod', 'halibut', 'trout', 'bass']
    };

    const detected = [];
    const ingredientNames = this.ingredients.map(ing => ing.toLowerCase());

    for (const [allergen, keywords] of Object.entries(commonAllergens)) {
      if (keywords.some(keyword => 
        ingredientNames.some(ingredient => ingredient.includes(keyword))
      )) {
        detected.push(allergen);
      }
    }

    return detected;
  }
  
  // Generate backward-compatible tags that include comprehensive data
  generateCompatibleTags() {
    const tags = [];
    
    // Add original tags
    if (this.strTags) {
      tags.push(...this.strTags.split(',').map(tag => tag.trim()).filter(tag => tag));
    }
    
    // Add dietary info as tags
    if (this.dietary) {
      Object.entries(this.dietary).forEach(([key, value]) => {
        if (value) tags.push(key);
      });
    }
    
    // Add meal types
    if (Array.isArray(this.mealType)) {
      tags.push(...this.mealType);
    }
    
    // Add difficulty
    if (this.difficulty) {
      tags.push(this.difficulty.toLowerCase());
    }
    
    // Add time category
    if (this.timeCategory) {
      tags.push(this.timeCategory.toLowerCase().replace(/\s+/g, '-'));
    }
    
    // Add allergen flags
    if (Array.isArray(this.allergenFlags)) {
      tags.push(...this.allergenFlags.map(allergen => `contains-${allergen}`));
    }
    
    // Remove duplicates and return
    return [...new Set(tags)].join(',');
  }

  // Multiple Images Management Methods
  
  // Add a new image to the recipe
  addImage(imageUrl, options = {}) {
    const newImage = {
      url: imageUrl,
      alt: options.alt || `${this.strMeal} image ${this.images.length + 1}`,
      isPrimary: options.isPrimary || this.images.length === 0,
      order: options.order !== undefined ? options.order : this.images.length,
      metadata: options.metadata || {}
    };
    
    // If this is set as primary, unmark others
    if (newImage.isPrimary) {
      this.images.forEach(img => img.isPrimary = false);
      this.strMealThumb = imageUrl;
    }
    
    this.images.push(newImage);
    this.images.sort((a, b) => a.order - b.order);
    this.imageCount = this.images.length;
    
    return this.images.length - 1; // Return index of added image
  }
  
  // Remove an image by URL or index
  removeImage(identifier) {
    let index = -1;
    
    if (typeof identifier === 'number') {
      index = identifier;
    } else if (typeof identifier === 'string') {
      index = this.images.findIndex(img => img.url === identifier);
    }
    
    if (index >= 0 && index < this.images.length) {
      const removedImage = this.images.splice(index, 1)[0];
      
      // If we removed the primary image, make the first remaining image primary
      if (removedImage.isPrimary && this.images.length > 0) {
        this.images[0].isPrimary = true;
        this.strMealThumb = this.images[0].url;
      } else if (this.images.length === 0) {
        this.strMealThumb = '';
      }
      
      this.imageCount = this.images.length;
      return removedImage;
    }
    
    return null;
  }
  
  // Set an image as primary by URL or index
  setPrimaryImage(identifier) {
    let targetImage = null;
    
    if (typeof identifier === 'number') {
      targetImage = this.images[identifier];
    } else if (typeof identifier === 'string') {
      targetImage = this.images.find(img => img.url === identifier);
    }
    
    if (targetImage) {
      // Unmark all as primary
      this.images.forEach(img => img.isPrimary = false);
      
      // Mark target as primary
      targetImage.isPrimary = true;
      targetImage.order = 0;
      this.strMealThumb = targetImage.url;
      
      // Reorder images
      this.images.sort((a, b) => a.order - b.order);
      
      return true;
    }
    
    return false;
  }
  
  // Get all image URLs as simple array
  getImageUrls() {
    return this.images.map(img => img.url);
  }
  
  // Get primary image
  getPrimaryImage() {
    return this.images.find(img => img.isPrimary) || this.images[0] || null;
  }
  
  // Get non-primary images
  getAdditionalImages() {
    return this.images.filter(img => !img.isPrimary);
  }
  
  // Reorder images
  reorderImages(newOrder) {
    if (Array.isArray(newOrder) && newOrder.length === this.images.length) {
      newOrder.forEach((url, index) => {
        const image = this.images.find(img => img.url === url);
        if (image) {
          image.order = index;
        }
      });
      
      this.images.sort((a, b) => a.order - b.order);
      return true;
    }
    
    return false;
  }
  
  // Bulk add images from URL array
  addMultipleImages(imageUrls, options = {}) {
    const addedIndices = [];
    
    imageUrls.forEach((url, index) => {
      const imageOptions = {
        alt: options.alt || `${this.strMeal} image ${this.images.length + index + 1}`,
        isPrimary: options.makePrimary ? index === 0 : false,
        order: this.images.length + index,
        metadata: options.metadata || {}
      };
      
      const addedIndex = this.addImage(url, imageOptions);
      addedIndices.push(addedIndex);
    });
    
    return addedIndices;
  }
}

module.exports = Recipe;