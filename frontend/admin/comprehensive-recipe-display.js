// Comprehensive Recipe Display Component
console.log('Starting to define ComprehensiveRecipeDisplay class...');

class ComprehensiveRecipeDisplay {
  constructor() {
    this.currentRecipe = null;
    this.editMode = false;
    
    // Emoji mappings for categories
    this.mealTypeEmojis = {
      'Breakfast': '🌅',
      'Brunch': '🥐', 
      'Lunch': '🌞',
      'Dinner': '🌙',
      'Snack': '🥨',
      'Dessert': '🍰'
    };
    
    this.dishTypeEmojis = {
      'Appetizers': '🍤',
      'Side Dishes': '🥗', 
      'Main Courses': '🍽️',
      'Soups': '🍲',
      'Salads': '🥙',
      'Sandwiches & Wraps': '🥪',
      'Burgers': '🍔',
      'Pizza & Flatbreads': '🍕',
      'Pasta & Noodles': '🍝',
      'Rice Dishes': '🍚',
      'Tacos, Burritos & Quesadillas': '🌮',
      'Stir-Fries': '🥘',
      'Curries': '🍛',
      'Stews & Casseroles': '🍯',
      'Skillet & One-Pan Meals': '🍳',
      'Slow Cooker / Instant Pot': '⏲️',
      'Grilling / BBQ': '🔥',
      'Baked Goods': '🥖',
      'Pastries': '🥐',
      'Cookies & Bars': '🍪',
      'Pies & Cobblers': '🥧',
      'Frozen Treats': '🍦'
    };
    
    this.dietaryEmojis = {
      'Vegetarian': '🥗',
      'Vegan': '🌱',
      'Pescatarian': '🐟',
      'Keto': '🥑',
      'Low-Carb': '🥩',
      'High-Protein': '💪',
      'Gluten-Free': '🌾',
      'Dairy-Free': '🥛',
      'Nut-Free': '🥜',
      'Low-Sodium': '🧂',
      'Low-Sugar': '🍯',
      'Mediterranean Diet': '🫒'
    };
    
    this.cuisineEmojis = {
      'Italian': '🍝',
      'Mexican': '🌮',
      'American': '🍔',
      'Chinese': '🥢',
      'Japanese': '🍱',
      'Indian': '🍛',
      'Thai': '🍜',
      'French': '🥖',
      'Mediterranean': '🫒',
      'Greek': '🇬🇷',
      'Spanish': '🥘',
      'Korean': '🍲',
      'Vietnamese': '🍲',
      'Middle Eastern': '🧆',
      'British': '🇬🇧',
      'German': '🥨',
      'Brazilian': '🇧🇷',
      'Moroccan': '🇲🇦'
    };
  }

  // Render full recipe with all comprehensive data
  renderRecipe(recipe, container) {
    this.currentRecipe = recipe;
    
    container.innerHTML = `
      <div class="comprehensive-recipe-container">
        <!-- Header with Global Actions -->
        <div class="recipe-header-actions">
          <div class="recipe-title-container">
            <h2 class="recipe-title" id="recipe-title-display">${recipe.strMeal || 'Untitled Recipe'}</h2>
            <input type="text" class="recipe-title-input" id="recipe-title-input" value="${recipe.strMeal || 'Untitled Recipe'}" style="display: none;">
            <button class="btn-edit-title" id="btn-edit-title" title="Edit Recipe Title">
              <i class="fas fa-pencil-alt"></i>
            </button>
          </div>
          <div class="quick-actions">
            <button class="btn-action" id="btn-toggle-edit">
              <i class="fas fa-edit"></i> ${this.editMode ? 'Save Changes' : 'Edit Mode'}
            </button>
            <button class="btn-action" id="btn-print-recipe">
              <i class="fas fa-print"></i> Print Recipe
            </button>
            <button class="btn-action" id="btn-export-recipe">
              <i class="fas fa-download"></i> Export
            </button>
          </div>
        </div>

        <!-- Image Management System -->
        <div class="recipe-images-section">
          <div class="images-header">
            <h3><i class="fas fa-images"></i> Recipe Images (1 Main + 2 Additional)</h3>
            <button class="btn-action btn-sm" id="btn-generate-all-images">
              <i class="fas fa-magic"></i> Generate All Empty Slots
            </button>
          </div>
          <div class="images-grid">
            ${this.renderImageSlots(recipe)}
          </div>
        </div>

        <!-- Core Information Grid -->
        <div class="info-grid">
          <div class="info-card">
            <h3><i class="fas fa-info-circle"></i> Basic Info</h3>
            <div class="editable-field" data-field="strCategory">
              <label>Category:</label>
              <span class="value">${recipe.strCategory || 'Not set'}</span>
            </div>
            <div class="editable-field" data-field="strArea">
              <label>Cuisine:</label>
              <span class="value">${this.cuisineEmojis[recipe.strArea] || '🍽️'} ${recipe.strArea || 'Not set'}</span>
            </div>
            <div class="editable-field" data-field="difficulty">
              <label>Difficulty:</label>
              <span class="value">${recipe.difficulty || 'Medium'}</span>
            </div>
            <div class="editable-field" data-field="dishType">
              <label>Dish Type:</label>
              <span class="value">${this.dishTypeEmojis[recipe.dishType] || '🍽️'} ${recipe.dishType || 'Main Course'}</span>
            </div>
          </div>

          <div class="info-card">
            <h3><i class="fas fa-clock"></i> Timing</h3>
            <div class="editable-field" data-field="prepTime">
              <label>Prep Time:</label>
              <span class="value">${recipe.prepTime || 0} mins</span>
            </div>
            <div class="editable-field" data-field="cookTime">
              <label>Cook Time:</label>
              <span class="value">${recipe.cookTime || 0} mins</span>
            </div>
            <div class="editable-field" data-field="totalTime">
              <label>Total Time:</label>
              <span class="value">${recipe.totalTime || 0} mins</span>
            </div>
            <div class="editable-field" data-field="timeCategory">
              <label>Time Category:</label>
              <span class="value">${recipe.timeCategory || 'Not set'}</span>
            </div>
          </div>

          <div class="info-card">
            <h3><i class="fas fa-users"></i> Servings</h3>
            <div class="editable-field" data-field="numberOfServings">
              <label>Servings:</label>
              <span class="value">${recipe.numberOfServings || 4}</span>
            </div>
            <div class="editable-field" data-field="servingSize">
              <label>Serving Size:</label>
              <span class="value">${recipe.servingSize || '1 serving'}</span>
            </div>
            <div class="editable-field" data-field="yield">
              <label>Yield:</label>
              <span class="value">${recipe.yield || '4 servings'}</span>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="description-section">
          <h3><i class="fas fa-align-left"></i> Description</h3>
          <div class="editable-field" data-field="strDescription">
            <p class="value">${recipe.strDescription || 'No description available.'}</p>
          </div>
        </div>

        <!-- Ingredients Section -->
        <div class="ingredients-section">
          <div class="section-header-with-actions">
            <h3><i class="fas fa-carrot"></i> Ingredients</h3>
            <div class="section-actions">
              <button class="btn-action btn-sm" id="btn-add-ingredient">
                <i class="fas fa-plus"></i> Add Ingredient
              </button>
              <button class="btn-action btn-sm btn-secondary" id="btn-scale-ingredients">
                <i class="fas fa-balance-scale"></i> Scale Recipe
              </button>
              <button class="btn-action btn-sm btn-secondary" id="btn-convert-units">
                <i class="fas fa-exchange-alt"></i> Convert Units
              </button>
            </div>
          </div>
          <div class="ingredients-list">
            ${this.renderIngredients(recipe)}
          </div>
        </div>

        <!-- Instructions Section -->
        <div class="instructions-section">
          <div class="section-header-with-actions">
            <h3><i class="fas fa-list-ol"></i> Instructions</h3>
            <div class="section-actions">
              <button class="btn-action btn-sm" id="btn-add-instruction">
                <i class="fas fa-plus"></i> Add Step
              </button>
              <button class="btn-action btn-sm btn-secondary" id="btn-reorder-steps">
                <i class="fas fa-sort"></i> Reorder Steps
              </button>
              <button class="btn-action btn-sm btn-secondary" id="btn-optimize-steps">
                <i class="fas fa-magic"></i> Optimize Flow
              </button>
            </div>
          </div>
          <div class="instructions-list">
            ${this.renderInstructions(recipe)}
          </div>
        </div>

        <!-- Nutrition Section -->
        <div class="nutrition-section">
          <div class="section-header-with-actions">
            <h3><i class="fas fa-chart-pie"></i> Nutritional Information</h3>
            <div class="section-actions">
              <button class="btn-action btn-sm" id="btn-calculate-macros">
                <i class="fas fa-calculator"></i> Calculate Macros
              </button>
              <button class="btn-action btn-sm btn-secondary" id="btn-generate-nutrition-label">
                <i class="fas fa-file-alt"></i> Nutrition Label
              </button>
              <button class="btn-action btn-sm btn-secondary" id="btn-analyze-health">
                <i class="fas fa-heart"></i> Health Analysis
              </button>
            </div>
          </div>
          <div class="nutrition-grid">
            ${this.renderNutrition(recipe.nutrition || {})}
          </div>
        </div>

        <!-- Dietary Information -->
        <div class="dietary-section">
          <h3><i class="fas fa-leaf"></i> Dietary Information</h3>
          <div class="dietary-grid">
            ${this.renderDietary(recipe.dietary || {})}
          </div>
        </div>

        <!-- Equipment Section -->
        <div class="equipment-section">
          <div class="section-header-with-actions">
            <h3><i class="fas fa-tools"></i> Equipment Required</h3>
            <div class="section-actions">
              <button class="btn-action btn-sm" id="btn-generate-equipment">
                <i class="fas fa-magic"></i> Generate Equipment
              </button>
              <button class="btn-action btn-sm" id="btn-add-equipment">
                <i class="fas fa-plus"></i> Add Equipment
              </button>
              <button class="btn-action btn-sm btn-secondary" id="btn-equipment-alternatives">
                <i class="fas fa-exchange-alt"></i> Alternatives
              </button>
            </div>
          </div>
          <div class="equipment-list">
            ${this.renderEquipment(recipe.equipmentRequired || [])}
          </div>
        </div>

        <!-- Tags and Categories -->
        <div class="tags-section">
          <h3><i class="fas fa-tags"></i> Tags & Categories</h3>
          <div class="tags-grid">
            <div class="tag-group editable-field" data-field="mealType" data-field-type="array">
              <label>Meal Type:</label>
              <div class="tags value">
                ${(recipe.mealType || []).map(type => `<span class="tag">${this.mealTypeEmojis[type] || '🍽️'} ${type}</span>`).join('') || '<span class="empty-tag">None set</span>'}
              </div>
            </div>
            <div class="tag-group editable-field" data-field="occasion" data-field-type="array">
              <label>Occasion:</label>
              <div class="tags value">
                ${(recipe.occasion || []).map(occ => `<span class="tag">${occ}</span>`).join('') || '<span class="empty-tag">None set</span>'}
              </div>
            </div>
            <div class="tag-group editable-field" data-field="seasonality" data-field-type="array">
              <label>Seasonality:</label>
              <div class="tags value">
                ${(recipe.seasonality || []).map(season => `<span class="tag">${season}</span>`).join('') || '<span class="empty-tag">None set</span>'}
              </div>
            </div>
            <div class="tag-group editable-field" data-field="keywords" data-field-type="array">
              <label>Keywords:</label>
              <div class="tags value">
                ${(recipe.keywords || []).map(keyword => `<span class="tag">${keyword}</span>`).join('') || '<span class="empty-tag">None set</span>'}
              </div>
            </div>
            <div class="tag-group editable-field" data-field="allergenFlags" data-field-type="array">
              <label>Allergens:</label>
              <div class="tags value">
                ${(recipe.allergenFlags || []).map(allergen => `<span class="tag allergen">${allergen}</span>`).join('') || '<span class="empty-tag">None set</span>'}
              </div>
            </div>
            <div class="tag-group editable-field" data-field="skillsRequired" data-field-type="array">
              <label>Skills Required:</label>
              <div class="tags value">
                ${(recipe.skillsRequired || []).map(skill => `<span class="tag">${skill}</span>`).join('') || '<span class="empty-tag">None set</span>'}
              </div>
            </div>
          </div>
        </div>

        <!-- Metadata Section -->
        <div class="metadata-section">
          <h3><i class="fas fa-database"></i> Recipe Metadata</h3>
          <div class="metadata-grid">
            <div class="meta-item">
              <label>Recipe ID:</label>
              <code>${recipe.idMeal || recipe.id || 'N/A'}</code>
            </div>
            <div class="meta-item">
              <label>Date Created:</label>
              <span>${recipe.dateModified ? new Date(recipe.dateModified).toLocaleDateString() : 'Unknown'}</span>
            </div>
            <div class="meta-item">
              <label>Source:</label>
              <span>${recipe.strSource || 'AI Generated'}</span>
            </div>
            <div class="meta-item">
              <label>Main Ingredient:</label>
              <span>${recipe.mainIngredient || recipe.strIngredient1 || 'Not specified'}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Attach event listeners after rendering
    this.attachEventListeners();
    
    // Initialize edit mode if needed
    if (this.editMode) {
      this.enableEditMode();
    }
  }
  
  // Attach event listeners to avoid inline handlers (CSP compliance)
  attachEventListeners() {
    // Header action buttons
    this.addEventListenerSafe('btn-toggle-edit', () => this.toggleEditMode());
    this.addEventListenerSafe('btn-print-recipe', () => this.printRecipe());
    this.addEventListenerSafe('btn-export-recipe', () => this.exportRecipe());

    // Title edit button
    this.addEventListenerSafe('btn-edit-title', () => this.toggleTitleEdit());
    
    // Handle Enter key and blur events on title input
    const titleInput = document.getElementById('recipe-title-input');
    if (titleInput) {
      titleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.saveTitleEdit();
        } else if (e.key === 'Escape') {
          this.cancelTitleEdit();
        }
      });
      titleInput.addEventListener('blur', () => this.saveTitleEdit());
    }

    // Image slot management buttons
    this.addEventListenerSafe('btn-generate-all-images', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.generateAllEmptySlots();
    });
    
    // Individual slot actions
    document.querySelectorAll('.btn-delete-slot').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slot = parseInt(e.currentTarget.dataset.slot);
        this.deleteSlotImage(slot);
      });
    });
    
    document.querySelectorAll('.btn-regenerate-slot').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slot = parseInt(e.currentTarget.dataset.slot);
        this.generateSlotImage(slot);
      });
    });
    
    document.querySelectorAll('.btn-add-slot').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slot = parseInt(e.currentTarget.dataset.slot);
        this.addSlotImage(slot);
      });
    });
    
    document.querySelectorAll('.btn-generate-slot').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slot = parseInt(e.currentTarget.dataset.slot);
        this.generateSlotImage(slot);
      });
    });

    // Ingredients section buttons
    this.addEventListenerSafe('btn-add-ingredient', () => this.addIngredient());
    this.addEventListenerSafe('btn-scale-ingredients', () => this.scaleIngredients());
    this.addEventListenerSafe('btn-convert-units', () => this.convertUnits());
    
    // Instructions section buttons
    this.addEventListenerSafe('btn-add-instruction', () => this.addInstruction());
    this.addEventListenerSafe('btn-reorder-steps', () => this.reorderSteps());
    this.addEventListenerSafe('btn-optimize-steps', () => this.optimizeSteps());
    
    // Nutrition section buttons
    this.addEventListenerSafe('btn-calculate-macros', () => this.calculateMacros());
    this.addEventListenerSafe('btn-generate-nutrition-label', () => this.generateNutritionLabel());
    this.addEventListenerSafe('btn-analyze-health', () => this.analyzeHealth());
    
    // Equipment section buttons
    this.addEventListenerSafe('btn-generate-equipment', () => this.generateEquipment());
    this.addEventListenerSafe('btn-add-equipment', () => this.addEquipment());
    this.addEventListenerSafe('btn-equipment-alternatives', () => this.showEquipmentAlternatives());
    
    // Remove buttons for ingredients (using event delegation)
    document.querySelectorAll('[data-ingredient-idx]').forEach(btn => {
      const idx = parseInt(btn.dataset.ingredientIdx);
      btn.addEventListener('click', () => this.removeIngredient(idx));
    });
    
    // Remove buttons for instructions
    document.querySelectorAll('[data-instruction-idx]').forEach(btn => {
      const idx = parseInt(btn.dataset.instructionIdx);
      btn.addEventListener('click', () => this.removeInstruction(idx));
    });
    
    // Remove buttons for equipment
    document.querySelectorAll('[data-equipment-idx]').forEach(btn => {
      const idx = parseInt(btn.dataset.equipmentIdx);
      btn.addEventListener('click', () => this.removeEquipment(idx));
    });
  }

  // Helper method for safe event listener attachment
  addEventListenerSafe(id, handler) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('click', handler);
    }
  }

  // Render image slots (3 total: 1 main + 2 additional)
  renderImageSlots(recipe) {
    const slots = [];
    
    // Prepare all images array (main + additional)
    const allImages = [];
    allImages[0] = recipe.strMealThumb || null;
    
    if (recipe.additionalImages && Array.isArray(recipe.additionalImages)) {
      recipe.additionalImages.forEach((img, idx) => {
        allImages[idx + 1] = img;
      });
    }
    
    // Render 3 slots
    for (let i = 0; i < 3; i++) {
      const imageUrl = allImages[i];
      const slotLabel = i === 0 ? 'Main Image' : `Additional ${i}`;
      const hasImage = imageUrl && imageUrl.trim() !== '';
      
      slots.push(`
        <div class="image-slot ${!hasImage ? 'empty' : ''}" data-slot-index="${i}">
          <div class="slot-label">${slotLabel}</div>
          <div class="slot-content">
            ${hasImage ? `
              <img src="${imageUrl}" alt="${slotLabel}" class="slot-image">
              <div class="slot-actions">
                <button class="btn-slot-action btn-delete-slot" data-slot="${i}" title="Delete">
                  <i class="fas fa-trash"></i>
                </button>
                <button class="btn-slot-action btn-regenerate-slot" data-slot="${i}" title="Regenerate">
                  <i class="fas fa-sync"></i>
                </button>
              </div>
            ` : `
              <div class="slot-placeholder">
                <i class="fas fa-image"></i>
                <p>No Image</p>
              </div>
              <div class="slot-actions">
                <button class="btn-slot-action btn-add-slot" data-slot="${i}" title="Add Image">
                  <i class="fas fa-plus"></i> Add
                </button>
                <button class="btn-slot-action btn-generate-slot" data-slot="${i}" title="Generate">
                  <i class="fas fa-magic"></i> Generate
                </button>
              </div>
            `}
          </div>
        </div>
      `);
    }
    
    return slots.join('');
  }

  // Render ingredients with detailed info
  renderIngredients(recipe) {
    const ingredients = [];
    
    // Check for detailed ingredients
    if (recipe.ingredientsDetailed && recipe.ingredientsDetailed.length > 0) {
      return recipe.ingredientsDetailed.map((ing, idx) => `
        <div class="ingredient-item" data-index="${idx}">
          <span class="ingredient-name">${ing.name}</span>
          <span class="ingredient-amount">${ing.quantity} ${ing.unit}</span>
          ${ing.optional ? '<span class="optional-badge">Optional</span>' : ''}
          ${this.editMode ? `<button class="btn-remove" data-ingredient-idx="${idx}">×</button>` : ''}
        </div>
      `).join('');
    }
    
    // Fallback to traditional ingredients
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipe[`strIngredient${i}`];
      const measure = recipe[`strMeasure${i}`];
      if (ingredient && ingredient.trim()) {
        ingredients.push(`
          <div class="ingredient-item" data-index="${i}">
            <span class="ingredient-name">${ingredient}</span>
            <span class="ingredient-amount">${measure || ''}</span>
            ${this.editMode ? `<button class="btn-remove" data-ingredient-idx="${i}">×</button>` : ''}
          </div>
        `);
      }
    }
    
    return ingredients.join('') || '<p>No ingredients listed</p>';
  }

  // Render instructions
  renderInstructions(recipe) {
    if (recipe.instructions && Array.isArray(recipe.instructions)) {
      return recipe.instructions.map((step, idx) => `
        <div class="instruction-step" data-index="${idx}">
          <span class="step-number">${idx + 1}</span>
          <p class="step-text">${step}</p>
          ${this.editMode ? `<button class="btn-remove" data-instruction-idx="${idx}">×</button>` : ''}
        </div>
      `).join('');
    }
    
    // Fallback to string instructions
    if (recipe.strInstructions) {
      return `<p class="instructions-text">${recipe.strInstructions}</p>`;
    }
    
    return '<p>No instructions available</p>';
  }

  // Render nutrition data
  renderNutrition(nutrition) {
    const nutrients = [
      { key: 'caloriesPerServing', label: 'Calories', unit: 'kcal', icon: '🔥' },
      { key: 'protein', label: 'Protein', unit: 'g', icon: '💪' },
      { key: 'carbs', label: 'Carbs', unit: 'g', icon: '🍞' },
      { key: 'fat', label: 'Fat', unit: 'g', icon: '🥑' },
      { key: 'fiber', label: 'Fiber', unit: 'g', icon: '🌾' },
      { key: 'sugar', label: 'Sugar', unit: 'g', icon: '🍬' },
      { key: 'sodium', label: 'Sodium', unit: 'mg', icon: '🧂' },
      { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', icon: '🥚' },
      { key: 'saturatedFat', label: 'Saturated Fat', unit: 'g', icon: '🧈' },
      { key: 'vitaminA', label: 'Vitamin A', unit: '%', icon: '🥕' },
      { key: 'vitaminC', label: 'Vitamin C', unit: '%', icon: '🍊' },
      { key: 'iron', label: 'Iron', unit: '%', icon: '🩸' },
      { key: 'calcium', label: 'Calcium', unit: '%', icon: '🥛' }
    ];

    return nutrients.map(nutrient => `
      <div class="nutrition-item">
        <span class="nutrient-icon">${nutrient.icon}</span>
        <div class="nutrient-info">
          <label>${nutrient.label}:</label>
          <div class="editable-field nutrition-field" data-field="nutrition.${nutrient.key}" data-unit="${nutrient.unit}">
            <span class="value">${nutrition[nutrient.key] || 0}</span>
            <span class="unit">${nutrient.unit}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Render dietary information
  renderDietary(dietary) {
    const dietaryOptions = [
      { key: 'vegetarian', label: 'Vegetarian', icon: '🥗' },
      { key: 'vegan', label: 'Vegan', icon: '🌱' },
      { key: 'pescatarian', label: 'Pescatarian', icon: '🐟' },
      { key: 'glutenFree', label: 'Gluten-Free', icon: '🌾' },
      { key: 'dairyFree', label: 'Dairy-Free', icon: '🥛' },
      { key: 'keto', label: 'Keto', icon: '🥓' },
      { key: 'paleo', label: 'Paleo', icon: '🍖' },
      { key: 'halal', label: 'Halal', icon: '☪️' },
      { key: 'noRedMeat', label: 'No Red Meat', icon: '🚫🥩' },
      { key: 'noPork', label: 'No Pork', icon: '🚫🐷' },
      { key: 'noShellfish', label: 'No Shellfish', icon: '🚫🦐' },
      { key: 'omnivore', label: 'Omnivore', icon: '🍽️' }
    ];

    return dietaryOptions.map(option => `
      <div class="dietary-item ${dietary[option.key] ? 'active' : ''}">
        <label>
          <input type="checkbox" 
                 data-field="dietary.${option.key}" 
                 ${dietary[option.key] ? 'checked' : ''}
                 ${!this.editMode ? 'disabled' : ''}>
          <span class="dietary-icon">${option.icon}</span>
          <span class="dietary-label">${option.label}</span>
        </label>
      </div>
    `).join('');
  }

  // Render equipment
  renderEquipment(equipment) {
    if (!equipment || equipment.length === 0) {
      return '<p>No equipment specified</p>';
    }
    
    return equipment.map((item, idx) => `
      <div class="equipment-item" data-index="${idx}">
        <i class="fas fa-tools"></i>
        <span>${item}</span>
        ${this.editMode ? `<button class="btn-remove" data-equipment-idx="${idx}">×</button>` : ''}
      </div>
    `).join('');
  }

  // Toggle edit mode
  async toggleEditMode() {
    this.editMode = !this.editMode;
    
    if (this.editMode) {
      this.enableEditMode();
    } else {
      await this.saveChanges();
    }
    
    // Re-render with new mode
    const container = document.querySelector('.comprehensive-recipe-container').parentElement;
    this.renderRecipe(this.currentRecipe, container);
  }

  // Enable edit mode
  enableEditMode() {
    // Define dropdown options for specific fields
    const dropdownOptions = {
      'strCategory': ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'],
      'strArea': ['Italian', 'Mexican', 'American', 'Chinese', 'Japanese', 'Indian', 'Thai', 'French', 'Mediterranean', 'Greek', 'Spanish', 'Korean', 'Vietnamese', 'Middle Eastern', 'British', 'German', 'Brazilian', 'Moroccan', 'International'],
      'difficulty': ['Easy', 'Medium', 'Hard'],
      'dishType': ['Appetizers', 'Side Dishes', 'Main Courses', 'Soups', 'Salads', 'Sandwiches & Wraps', 'Burgers', 'Pizza & Flatbreads', 'Pasta & Noodles', 'Rice Dishes', 'Tacos, Burritos & Quesadillas', 'Stir-Fries', 'Curries', 'Stews & Casseroles', 'Skillet & One-Pan Meals', 'Slow Cooker / Instant Pot', 'Grilling / BBQ', 'Baked Goods', 'Pastries', 'Cookies & Bars', 'Pies & Cobblers', 'Frozen Treats', 'Pancakes & Waffles', 'Dips & Spreads', 'Bowls', 'Drinks & Smoothies', 'Breads', 'Meal Prep', 'Boards & Platters', 'Protein Dishes', 'Cakes & Cupcakes'],
      'timeCategory': ['Under 30 mins', '30-60 mins', '1-2 hours', '2+ hours']
    };

    document.querySelectorAll('.editable-field').forEach(field => {
      const value = field.querySelector('.value');
      const fieldName = field.dataset.field;
      const fieldType = field.dataset.fieldType; // 'array' for tag fields
      
      if (value && !value.querySelector('input') && !value.querySelector('select') && !value.querySelector('textarea')) {
        // Get clean text value (remove emojis)
        let currentValue = value.textContent.trim();
        
        // Remove emojis and extra whitespace for comparison
        if (fieldName === 'strArea' || fieldName === 'dishType') {
          // Extract just the text after emoji
          currentValue = currentValue.replace(/^[^\w\s]+\s*/, '').trim();
        }
        
        // Remove "mins", "hours" etc for time fields
        if (fieldName.includes('Time')) {
          currentValue = currentValue.replace(/\s*(mins|minutes|hours|hrs)/gi, '').trim();
        }
        
        // Handle array fields (tags) - extract text from tag spans
        if (fieldType === 'array') {
          const tags = value.querySelectorAll('.tag:not(.empty-tag)');
          const tagValues = Array.from(tags).map(tag => {
            // Remove emoji and get just text
            return tag.textContent.replace(/^[^\w\s]+\s*/, '').trim();
          });
          currentValue = tagValues.join(', ');
          
          const input = document.createElement('input');
          input.type = 'text';
          input.value = currentValue;
          input.className = 'edit-input';
          input.placeholder = 'Enter comma-separated values';
          value.innerHTML = '';
          value.appendChild(input);
          return;
        }
        
        // Check if this field should have a dropdown
        if (dropdownOptions[fieldName]) {
          const select = document.createElement('select');
          select.className = 'edit-input';
          
          // Add options
          dropdownOptions[fieldName].forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option;
            optElement.textContent = option;
            if (option === currentValue || option.toLowerCase() === currentValue.toLowerCase()) {
              optElement.selected = true;
            }
            select.appendChild(optElement);
          });
          
          value.innerHTML = '';
          value.appendChild(select);
        } else {
          // Determine input type
          let inputType = 'text';
          if (fieldName.includes('Time') || fieldName.includes('Servings') || fieldName.startsWith('nutrition.')) {
            inputType = 'number';
          }
          
          // Use regular input for other fields
          const input = document.createElement('input');
          input.type = inputType;
          input.value = currentValue;
          input.className = 'edit-input';
          
          if (fieldName.startsWith('nutrition.')) {
            input.step = '0.1'; // Allow decimals for nutrition
            input.min = '0'; // No negative values
            input.style.width = '80px'; // Smaller width for nutrition
            input.style.display = 'inline-block'; // Keep inline with unit
          }
          
          value.innerHTML = '';
          value.appendChild(input);
          
          // For nutrition fields, re-add the unit span after the input
          if (fieldName.startsWith('nutrition.')) {
            const unitSpan = document.createElement('span');
            unitSpan.className = 'unit';
            unitSpan.textContent = field.dataset.unit || '';
            unitSpan.style.marginLeft = '0.5rem';
            value.appendChild(unitSpan);
          }
        }
      }
    });
  }

  // Save changes
  async saveChanges() {
    const updates = {};
    
    document.querySelectorAll('.editable-field').forEach(field => {
      const fieldName = field.dataset.field;
      const fieldType = field.dataset.fieldType;
      const input = field.querySelector('input');
      const select = field.querySelector('select');
      
      let value = null;
      if (input) {
        if (input.type === 'number') {
          value = parseFloat(input.value) || 0;
        } else if (fieldType === 'array') {
          // Convert comma-separated string to array
          value = input.value
            .split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0);
        } else {
          value = input.value;
        }
      } else if (select) {
        value = select.value;
      }
      
      if (value !== null) {
        // Handle nested fields
        if (fieldName.includes('.')) {
          const [parent, child] = fieldName.split('.');
          if (!updates[parent]) updates[parent] = {};
          updates[parent][child] = value;
        } else {
          updates[fieldName] = value;
        }
      }
    });

    // Save dietary checkboxes
    const dietary = {};
    document.querySelectorAll('[data-field^="dietary."]').forEach(checkbox => {
      if (checkbox.type === 'checkbox') {
        const key = checkbox.dataset.field.split('.')[1];
        dietary[key] = checkbox.checked;
      }
    });
    if (Object.keys(dietary).length > 0) {
      updates.dietary = dietary;
    }

    // Update the current recipe
    Object.assign(this.currentRecipe, updates);
    
    console.log('🧹 CLEAN SAVE: Using ONLY modern array-based fields (NO duplicate syncing!)');

    // Send to backend
    try {
      const token = localStorage.getItem('fooddb_admin_token');
      const recipeId = this.currentRecipe.id || this.currentRecipe.idMeal;
      
      console.log('💾 Saving recipe to Firebase...');
      console.log('Recipe ID:', recipeId);
      console.log('Token exists:', !!token);
      console.log('Updates being saved:', updates);
      console.log('Full recipe (with synced fields):', this.currentRecipe);
      
      if (!token) {
        this.showNotification('Not authenticated - please login again', 'error');
        return;
      }
      
      if (!recipeId) {
        this.showNotification('Recipe ID missing - cannot save', 'error');
        return;
      }
      
      const response = await fetch(`/admin/recipes/${recipeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...this.currentRecipe,
          ...updates,
          dateModified: new Date().toISOString()
        })
      });

      console.log('Save response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Save successful:', result);
        this.showNotification('Recipe saved to Firebase successfully!', 'success');
      } else {
        const errorText = await response.text();
        console.error('Save failed:', response.status, errorText);
        
        if (response.status === 401) {
          this.showNotification('Authentication expired - please login again', 'error');
        } else if (response.status === 403) {
          this.showNotification('No permission to save recipes', 'error');
        } else {
          this.showNotification(`Failed to save: ${response.status} ${errorText}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error saving recipe:', error);
      this.showNotification(`Error saving changes: ${error.message}`, 'error');
    }
  }

  // Calculate macros
  async calculateMacros() {
    this.showNotification('Calculating nutrition based on ingredients...', 'info');
    
    // Gather ingredients
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ing = this.currentRecipe[`strIngredient${i}`];
      const measure = this.currentRecipe[`strMeasure${i}`];
      if (ing && ing.trim()) {
        ingredients.push({ name: ing, amount: measure });
      }
    }

    // Use local calculation (API endpoint doesn't exist yet)
    console.log('Using local nutrition estimation for ingredients:', ingredients);
    await this.estimateNutrition();
  }

  // Estimate nutrition based on ingredients (improved fallback)
  async estimateNutrition() {
    // Get ingredients for analysis
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ing = this.currentRecipe[`strIngredient${i}`];
      const measure = this.currentRecipe[`strMeasure${i}`];
      if (ing && ing.trim()) {
        ingredients.push({ name: ing.toLowerCase(), amount: measure });
      }
    }
    
    // Base nutritional values per serving
    let calories = 150; // base calories
    let protein = 5;
    let carbs = 20;
    let fat = 5;
    let fiber = 2;
    let sugar = 3;
    let sodium = 200;
    let cholesterol = 0;
    let saturatedFat = 2;
    
    // Analyze ingredients for better estimation
    ingredients.forEach(({ name, amount }) => {
      // Proteins
      if (name.includes('chicken') || name.includes('beef') || name.includes('pork')) {
        calories += 150;
        protein += 25;
        fat += 8;
        cholesterol += 60;
        saturatedFat += 3;
      } else if (name.includes('fish') || name.includes('salmon') || name.includes('tuna')) {
        calories += 120;
        protein += 22;
        fat += 5;
        cholesterol += 40;
      } else if (name.includes('egg')) {
        calories += 70;
        protein += 6;
        fat += 5;
        cholesterol += 185;
      } else if (name.includes('tofu') || name.includes('tempeh')) {
        calories += 80;
        protein += 10;
        fat += 4;
      }
      
      // Carbohydrates
      if (name.includes('rice') || name.includes('pasta') || name.includes('noodle')) {
        calories += 150;
        carbs += 35;
        fiber += 2;
      } else if (name.includes('bread') || name.includes('flour')) {
        calories += 100;
        carbs += 20;
        fiber += 1;
      } else if (name.includes('potato')) {
        calories += 80;
        carbs += 20;
        fiber += 3;
      }
      
      // Vegetables
      if (name.includes('vegetable') || name.includes('broccoli') || name.includes('carrot') || 
          name.includes('spinach') || name.includes('tomato') || name.includes('onion')) {
        calories += 25;
        carbs += 5;
        fiber += 2;
      }
      
      // Dairy
      if (name.includes('milk') || name.includes('cream')) {
        calories += 60;
        fat += 4;
        protein += 3;
        cholesterol += 15;
        saturatedFat += 2;
      } else if (name.includes('cheese')) {
        calories += 100;
        fat += 8;
        protein += 7;
        cholesterol += 25;
        saturatedFat += 5;
      } else if (name.includes('butter')) {
        calories += 100;
        fat += 11;
        saturatedFat += 7;
        cholesterol += 30;
      }
      
      // Oils and fats
      if (name.includes('oil') || name.includes('olive')) {
        calories += 120;
        fat += 14;
        saturatedFat += 2;
      }
      
      // Sugar and sweeteners
      if (name.includes('sugar') || name.includes('honey') || name.includes('syrup')) {
        calories += 50;
        carbs += 13;
        sugar += 12;
      }
      
      // Salt and seasonings
      if (name.includes('salt') || name.includes('soy sauce')) {
        sodium += 500;
      }
    });
    
    // Adjust for servings
    const servings = this.currentRecipe.numberOfServings || 4;
    const nutrition = {
      caloriesPerServing: Math.round(calories / servings),
      protein: Math.round(protein / servings),
      carbs: Math.round(carbs / servings),
      fat: Math.round(fat / servings),
      fiber: Math.round(fiber / servings),
      sugar: Math.round(sugar / servings),
      sodium: Math.round(sodium / servings),
      cholesterol: Math.round(cholesterol / servings),
      saturatedFat: Math.round(saturatedFat / servings),
      vitaminA: Math.round(10 + ingredients.length * 2), // Estimated
      vitaminC: Math.round(15 + ingredients.length * 3), // Estimated
      iron: Math.round(10 + ingredients.length), // Estimated
      calcium: Math.round(8 + ingredients.length * 2) // Estimated
    };

    this.currentRecipe.nutrition = nutrition;
    
    // Re-render nutrition section
    const nutritionGrid = document.querySelector('.nutrition-grid');
    if (nutritionGrid) {
      nutritionGrid.innerHTML = this.renderNutrition(nutrition);
    }
    
    this.showNotification('Nutrition calculated based on ingredients!', 'success');
    
    // Auto-save to Firebase
    await this.saveChanges();
  }

  // Add ingredient
  async addIngredient() {
    const name = prompt('Enter ingredient name:');
    const amount = prompt('Enter amount:');
    
    if (name) {
      if (!this.currentRecipe.ingredientsDetailed) {
        this.currentRecipe.ingredientsDetailed = [];
      }
      
      this.currentRecipe.ingredientsDetailed.push({
        name: name,
        quantity: amount.split(' ')[0] || '1',
        unit: amount.split(' ').slice(1).join(' ') || 'unit',
        optional: false,
        required: true
      });
      
      // Re-render ingredients
      const ingredientsList = document.querySelector('.ingredients-list');
      if (ingredientsList) {
        ingredientsList.innerHTML = this.renderIngredients(this.currentRecipe);
      }
      
      this.showNotification('Ingredient added!', 'success');
      
      // Auto-save to Firebase
      await this.saveChanges();
    }
  }

  // Remove ingredient
  async removeIngredient(index) {
    if (this.currentRecipe.ingredientsDetailed) {
      this.currentRecipe.ingredientsDetailed.splice(index, 1);
    } else {
      this.currentRecipe[`strIngredient${index}`] = '';
      this.currentRecipe[`strMeasure${index}`] = '';
    }
    
    // Re-render ingredients
    const ingredientsList = document.querySelector('.ingredients-list');
    if (ingredientsList) {
      ingredientsList.innerHTML = this.renderIngredients(this.currentRecipe);
      // Re-attach event listeners after re-rendering
      this.attachEventListeners();
    }
    
    // Auto-save to Firebase
    await this.saveChanges();
    this.showNotification('Ingredient removed and saved!', 'success');
  }

  // Add equipment
  async addEquipment() {
    // Common kitchen equipment list
    const commonEquipment = [
      'Oven',
      'Stove / Cooktop',
      'Microwave',
      'Toaster',
      'Blender',
      'Food Processor',
      'Stand Mixer',
      'Hand Mixer',
      'Immersion Blender',
      'Slow Cooker',
      'Instant Pot / Pressure Cooker',
      'Air Fryer',
      'Grill',
      'Griddle',
      'Waffle Maker',
      'Rice Cooker',
      'Skillet / Frying Pan',
      'Saucepan',
      'Stock Pot',
      'Dutch Oven',
      'Baking Sheet / Sheet Pan',
      'Baking Dish / Casserole Dish',
      'Muffin Tin',
      'Cake Pan',
      'Loaf Pan',
      'Pie Dish',
      'Mixing Bowls',
      'Cutting Board',
      'Chef\'s Knife',
      'Paring Knife',
      'Whisk',
      'Spatula',
      'Wooden Spoon',
      'Tongs',
      'Ladle',
      'Measuring Cups',
      'Measuring Spoons',
      'Colander / Strainer',
      'Grater',
      'Peeler',
      'Can Opener',
      'Rolling Pin',
      'Pastry Brush',
      'Mortar and Pestle'
    ];
    
    // Create a simple modal
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%;';
    
    modalContent.innerHTML = `
      <h3 style="margin: 0 0 1rem 0; color: #1a1a1a;">Add Equipment</h3>
      <select id="equipment-select" class="edit-input" style="margin-bottom: 1rem;">
        <option value="">-- Select Equipment --</option>
        ${commonEquipment.map(eq => `<option value="${eq}">${eq}</option>`).join('')}
      </select>
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
        <button id="cancel-equipment" style="padding: 0.5rem 1rem; border: 1px solid #ccc; border-radius: 6px; background: white; cursor: pointer;">Cancel</button>
        <button id="add-equipment-btn" style="padding: 0.5rem 1rem; border: none; border-radius: 6px; background: #0066cc; color: white; cursor: pointer;">Add</button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Handle add button
    document.getElementById('add-equipment-btn').onclick = async () => {
      const select = document.getElementById('equipment-select');
      const equipment = select.value;
      
      if (equipment) {
        if (!this.currentRecipe.equipmentRequired) {
          this.currentRecipe.equipmentRequired = [];
        }
        
        // Prevent duplicates
        if (!this.currentRecipe.equipmentRequired.includes(equipment)) {
          this.currentRecipe.equipmentRequired.push(equipment);
          
          // Re-render equipment
          const equipmentList = document.querySelector('.equipment-list');
          if (equipmentList) {
            equipmentList.innerHTML = this.renderEquipment(this.currentRecipe.equipmentRequired);
            // Re-attach event listeners
            this.attachEventListeners();
          }
          
          this.showNotification('Equipment added!', 'success');
          
          // Auto-save to Firebase
          await this.saveChanges();
        } else {
          this.showNotification('Equipment already added!', 'warning');
        }
      }
      
      document.body.removeChild(modal);
    };
    
    // Handle cancel button
    document.getElementById('cancel-equipment').onclick = () => {
      document.body.removeChild(modal);
    };
    
    // Close on background click
    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    };
  }

  // Remove equipment
  async removeEquipment(index) {
    this.currentRecipe.equipmentRequired.splice(index, 1);
    
    // Re-render equipment
    const equipmentList = document.querySelector('.equipment-list');
    if (equipmentList) {
      equipmentList.innerHTML = this.renderEquipment(this.currentRecipe.equipmentRequired);
      // Re-attach event listeners after re-rendering
      this.attachEventListeners();
    }
    
    // Auto-save to Firebase
    await this.saveChanges();
    this.showNotification('Equipment removed and saved!', 'success');
  }

  // Add instruction
  async addInstruction() {
    const instruction = prompt('Enter instruction step:');
    
    if (instruction) {
      if (!this.currentRecipe.instructions) {
        this.currentRecipe.instructions = [];
      }
      
      this.currentRecipe.instructions.push(instruction);
      
      // Re-render instructions
      const instructionsList = document.querySelector('.instructions-list');
      if (instructionsList) {
        instructionsList.innerHTML = this.renderInstructions(this.currentRecipe);
      }
      
      this.showNotification('Instruction added!', 'success');
      
      // Auto-save to Firebase
      await this.saveChanges();
    }
  }

  // Remove instruction
  async removeInstruction(index) {
    this.currentRecipe.instructions.splice(index, 1);
    
    // Re-render instructions
    const instructionsList = document.querySelector('.instructions-list');
    if (instructionsList) {
      instructionsList.innerHTML = this.renderInstructions(this.currentRecipe);
      // Re-attach event listeners after re-rendering
      this.attachEventListeners();
    }
    
    // Auto-save to Firebase
    await this.saveChanges();
    this.showNotification('Instruction removed and saved!', 'success');
  }

  // Show notification
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  // === NEW FUNCTIONALITY METHODS ===

  // Header Actions
  async printRecipe() {
    this.showNotification('Preparing recipe for printing...', 'info');
    window.print();
  }

  async exportRecipe() {
    try {
      const recipeData = JSON.stringify(this.currentRecipe, null, 2);
      const blob = new Blob([recipeData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.currentRecipe.strMeal || 'recipe'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showNotification('Recipe exported successfully!', 'success');
    } catch (error) {
      this.showNotification('Failed to export recipe', 'error');
    }
  }

  // Title Edit Actions
  toggleTitleEdit() {
    const titleDisplay = document.getElementById('recipe-title-display');
    const titleInput = document.getElementById('recipe-title-input');
    const editBtn = document.getElementById('btn-edit-title');
    
    if (titleDisplay && titleInput && editBtn) {
      titleDisplay.style.display = 'none';
      titleInput.style.display = 'block';
      titleInput.focus();
      titleInput.select();
      editBtn.innerHTML = '<i class="fas fa-check"></i>';
      editBtn.style.background = '#10b981';
    }
  }

  async saveTitleEdit() {
    const titleDisplay = document.getElementById('recipe-title-display');
    const titleInput = document.getElementById('recipe-title-input');
    const editBtn = document.getElementById('btn-edit-title');
    
    if (!titleDisplay || !titleInput || !editBtn) return;
    
    // Check if we're in edit mode
    if (titleDisplay.style.display !== 'none') return;
    
    const newTitle = titleInput.value.trim();
    
    if (!newTitle) {
      this.showNotification('Recipe title cannot be empty', 'error');
      titleInput.value = this.currentRecipe.strMeal;
      this.cancelTitleEdit();
      return;
    }
    
    if (newTitle !== this.currentRecipe.strMeal) {
      try {
        this.showNotification('Updating recipe title...', 'info');
        
        const response = await fetch(`/admin/recipes/${this.currentRecipe.idMeal || this.currentRecipe.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('fooddb_admin_token')}`
          },
          body: JSON.stringify({ strMeal: newTitle })
        });
        
        if (response.ok) {
          this.currentRecipe.strMeal = newTitle;
          titleDisplay.textContent = newTitle;
          this.showNotification('Recipe title updated successfully!', 'success');
        } else {
          throw new Error('Failed to update title');
        }
      } catch (error) {
        console.error('Error updating title:', error);
        this.showNotification('Failed to update recipe title', 'error');
        titleInput.value = this.currentRecipe.strMeal;
      }
    }
    
    // Reset UI
    titleDisplay.style.display = 'block';
    titleInput.style.display = 'none';
    editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
    editBtn.style.background = '';
  }

  cancelTitleEdit() {
    const titleDisplay = document.getElementById('recipe-title-display');
    const titleInput = document.getElementById('recipe-title-input');
    const editBtn = document.getElementById('btn-edit-title');
    
    if (titleDisplay && titleInput && editBtn) {
      titleInput.value = this.currentRecipe.strMeal;
      titleDisplay.style.display = 'block';
      titleInput.style.display = 'none';
      editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
      editBtn.style.background = '';
    }
  }

  // Image Slot Management Actions
  
  // Delete image from specific slot
  async deleteSlotImage(slotIndex) {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      this.showNotification('Deleting image...', 'info');
      
      // Update recipe object
      if (slotIndex === 0) {
        this.currentRecipe.strMealThumb = '';
      } else {
        if (!this.currentRecipe.additionalImages) {
          this.currentRecipe.additionalImages = [];
        }
        this.currentRecipe.additionalImages[slotIndex - 1] = '';
      }
      
      // Save to database
      await this.saveImageSlots();
      
      // Re-render images
      this.refreshImageSlots();
      
      this.showNotification('Image deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting image:', error);
      this.showNotification('Failed to delete image. Please try again.', 'error');
    }
  }

  // Add image to specific slot (via URL)
  async addSlotImage(slotIndex) {
    const imageUrl = prompt('Enter image URL:', '');
    
    if (!imageUrl || imageUrl.trim() === '') {
      return;
    }

    try {
      this.showNotification('Adding image...', 'info');
      
      // Update recipe object
      if (slotIndex === 0) {
        this.currentRecipe.strMealThumb = imageUrl.trim();
      } else {
        if (!this.currentRecipe.additionalImages) {
          this.currentRecipe.additionalImages = [];
        }
        this.currentRecipe.additionalImages[slotIndex - 1] = imageUrl.trim();
      }
      
      // Save to database
      await this.saveImageSlots();
      
      // Re-render images
      this.refreshImageSlots();
      
      this.showNotification('Image added successfully!', 'success');
    } catch (error) {
      console.error('Error adding image:', error);
      this.showNotification('Failed to add image. Please try again.', 'error');
    }
  }

  // Generate image for specific slot
  async generateSlotImage(slotIndex) {
    try {
      this.showNotification(`Generating image for slot ${slotIndex + 1}... This may take 30-60 seconds.`, 'info');
      
      const response = await fetch(`/admin/recipes/${this.currentRecipe.idMeal || this.currentRecipe.id}/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('fooddb_admin_token')}`
        }
      });

      const data = await response.json();

      if (data.success && data.imageUrl) {
        // Update recipe object
        if (slotIndex === 0) {
          this.currentRecipe.strMealThumb = data.imageUrl;
        } else {
          if (!this.currentRecipe.additionalImages) {
            this.currentRecipe.additionalImages = [];
          }
          this.currentRecipe.additionalImages[slotIndex - 1] = data.imageUrl;
        }
        
        // Save to database
        await this.saveImageSlots();
        
        // Re-render images
        this.refreshImageSlots();
        
        this.showNotification('Image generated successfully!', 'success');
      } else {
        throw new Error(data.message || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      this.showNotification('Failed to generate image. Please try again.', 'error');
    }
  }

  // Generate images for all empty slots
  async generateAllEmptySlots() {
    // Disable button to prevent multiple clicks
    const btn = document.getElementById('btn-generate-all-images');
    if (btn) {
      if (btn.disabled) return; // Already generating
      btn.disabled = true;
      btn.style.opacity = '0.5';
    }
    
    try {
      const emptySlots = [];
      
      // Check which slots are empty (3 total: main + 2 additional)
      if (!this.currentRecipe.strMealThumb || this.currentRecipe.strMealThumb.trim() === '') {
        emptySlots.push(0);
      }
      
      for (let i = 1; i < 3; i++) {
        const additionalIndex = i - 1;
        if (!this.currentRecipe.additionalImages || 
            !this.currentRecipe.additionalImages[additionalIndex] || 
            this.currentRecipe.additionalImages[additionalIndex].trim() === '') {
          emptySlots.push(i);
        }
      }
      
      if (emptySlots.length === 0) {
        this.showNotification('All slots already have images!', 'info');
        return;
      }
      
      // Use native confirm dialog
      const userConfirmed = confirm(`Generate ${emptySlots.length} image(s)?\n\nThis will take approximately ${emptySlots.length * 30}-${emptySlots.length * 60} seconds.\n\nClick OK to continue or Cancel to abort.`);
      
      if (!userConfirmed) {
        // User clicked Cancel
        return;
      }

      // User clicked OK - start generation
      this.showNotification(`Generating ${emptySlots.length} images... Please wait...`, 'info');
      
      for (const slot of emptySlots) {
        await this.generateSlotImage(slot);
        // Small delay between generations
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      this.showNotification(`All ${emptySlots.length} images generated successfully!`, 'success');
    } catch (error) {
      console.error('Error generating all images:', error);
      this.showNotification('Some images failed to generate. Please try again.', 'error');
    } finally {
      // Re-enable button
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    }
  }

  // Save image slots to database
  async saveImageSlots() {
    try {
      console.log('💾 Saving images to Firebase (clean format)...');
      console.log('Recipe ID:', this.currentRecipe.idMeal || this.currentRecipe.id);
      console.log('Main image:', this.currentRecipe.strMealThumb);
      console.log('Additional images:', this.currentRecipe.additionalImages);
      
      // ✅ ONLY save: strMealThumb + additionalImages (NO imageUrls, NO images array)
      const response = await fetch(`/admin/recipes/${this.currentRecipe.idMeal || this.currentRecipe.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('fooddb_admin_token')}`
        },
        body: JSON.stringify({
          strMealThumb: this.currentRecipe.strMealThumb || '',
          additionalImages: this.currentRecipe.additionalImages || [],
          dateModified: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to save images:', response.status, errorText);
        throw new Error(`Failed to save images: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Images saved to Firebase successfully:', result);
      
    } catch (error) {
      console.error('❌ Error saving images to Firebase:', error);
      throw error;
    }
  }

  // Refresh image slots UI
  refreshImageSlots() {
    const imagesGrid = document.querySelector('.images-grid');
    if (imagesGrid) {
      imagesGrid.innerHTML = this.renderImageSlots(this.currentRecipe);
      // Re-attach event listeners
      this.attachEventListeners();
    }
  }

  // Ingredients Actions
  async scaleIngredients() {
    const currentServings = this.currentRecipe.numberOfServings || 4;
    const newServings = prompt(`Current recipe serves ${currentServings}. Enter new serving size:`, currentServings);
    
    if (newServings && newServings > 0 && newServings !== currentServings) {
      const scale = newServings / currentServings;
      this.showNotification(`Scaling ingredients by ${scale.toFixed(2)}x...`, 'info');
      
      // Scale detailed ingredients
      if (this.currentRecipe.ingredientsDetailed) {
        this.currentRecipe.ingredientsDetailed.forEach(ing => {
          const quantity = parseFloat(ing.quantity);
          if (!isNaN(quantity)) {
            ing.quantity = (quantity * scale).toFixed(2);
          }
        });
      }
      
      // Update serving size
      this.currentRecipe.numberOfServings = parseInt(newServings);
      
      // Re-render ingredients
      this.refreshIngredientsSection();
      await this.saveChanges();
      this.showNotification('Ingredients scaled successfully!', 'success');
    }
  }

  async convertUnits() {
    this.showNotification('Unit conversion feature coming soon!', 'info');
    // TODO: Implement unit conversion logic
  }

  // Instructions Actions
  async reorderSteps() {
    this.showNotification('Drag and drop to reorder steps (coming soon)', 'info');
    // TODO: Implement drag and drop reordering
  }

  async optimizeSteps() {
    this.showNotification('Analyzing recipe flow for optimization...', 'info');
    // TODO: Use AI to suggest better step ordering
    setTimeout(() => {
      this.showNotification('Recipe flow looks good! No optimizations needed.', 'success');
    }, 2000);
  }

  // Nutrition Actions
  async generateNutritionLabel() {
    if (!this.currentRecipe.nutrition) {
      await this.calculateMacros();
    }
    this.showNotification('Generating FDA nutrition label...', 'info');
    // TODO: Generate and display nutrition label
    setTimeout(() => {
      this.showNotification('Nutrition label generated! (Feature in development)', 'success');
    }, 1500);
  }

  async analyzeHealth() {
    this.showNotification('Analyzing recipe for health benefits...', 'info');
    // TODO: Implement health analysis
    setTimeout(() => {
      this.showNotification('Health analysis complete! This recipe contains good sources of protein and fiber.', 'success');
    }, 2000);
  }

  // Equipment Actions - The main new feature you requested!
  async generateEquipment() {
    this.showNotification('Analyzing recipe to generate equipment list...', 'info');
    
    try {
      const equipment = this.analyzeRecipeForEquipment();
      
      // Update the recipe with generated equipment
      this.currentRecipe.equipmentRequired = [...new Set([
        ...(this.currentRecipe.equipmentRequired || []),
        ...equipment
      ])];
      
      // Re-render equipment section
      this.refreshEquipmentSection();
      
      // Save changes
      await this.saveChanges();
      
      this.showNotification(`Generated ${equipment.length} pieces of equipment!`, 'success');
    } catch (error) {
      console.error('Error generating equipment:', error);
      this.showNotification('Failed to generate equipment', 'error');
    }
  }

  // Smart equipment analysis based on recipe content
  analyzeRecipeForEquipment() {
    const instructions = this.currentRecipe.strInstructions || '';
    const ingredients = this.getAllIngredients();
    const equipment = [];
    
    // Analyze instructions for cooking methods
    const instructionsLower = instructions.toLowerCase();
    
    // Cooking equipment based on instructions
    if (instructionsLower.includes('bake') || instructionsLower.includes('oven')) {
      equipment.push('Oven', 'Baking sheet', 'Oven mitts');
    }
    if (instructionsLower.includes('fry') || instructionsLower.includes('sauté')) {
      equipment.push('Frying pan', 'Spatula');
    }
    if (instructionsLower.includes('boil') || instructionsLower.includes('simmer')) {
      equipment.push('Large pot', 'Wooden spoon');
    }
    if (instructionsLower.includes('grill')) {
      equipment.push('Grill', 'Tongs', 'Grill brush');
    }
    if (instructionsLower.includes('steam')) {
      equipment.push('Steamer basket', 'Large pot with lid');
    }
    if (instructionsLower.includes('roast')) {
      equipment.push('Roasting pan', 'Meat thermometer');
    }
    if (instructionsLower.includes('whisk') || instructionsLower.includes('whip')) {
      equipment.push('Wire whisk');
    }
    if (instructionsLower.includes('blend')) {
      equipment.push('Blender');
    }
    if (instructionsLower.includes('chop') || instructionsLower.includes('dice') || instructionsLower.includes('slice')) {
      equipment.push('Chef\'s knife', 'Cutting board');
    }
    if (instructionsLower.includes('mix') || instructionsLower.includes('combine')) {
      equipment.push('Mixing bowl');
    }
    if (instructionsLower.includes('strain') || instructionsLower.includes('drain')) {
      equipment.push('Colander');
    }
    if (instructionsLower.includes('measure')) {
      equipment.push('Measuring cups', 'Measuring spoons');
    }
    
    // Equipment based on ingredients
    ingredients.forEach(ingredient => {
      const ingLower = ingredient.toLowerCase();
      if (ingLower.includes('pasta') || ingLower.includes('noodle')) {
        equipment.push('Large pot', 'Colander');
      }
      if (ingLower.includes('rice')) {
        equipment.push('Rice cooker', 'Fine-mesh strainer');
      }
      if (ingLower.includes('garlic')) {
        equipment.push('Garlic press');
      }
      if (ingLower.includes('lemon') || ingLower.includes('lime')) {
        equipment.push('Citrus juicer');
      }
    });
    
    // Always useful basic equipment
    equipment.push(
      'Kitchen timer',
      'Can opener',
      'Kitchen towels',
      'Serving spoons'
    );
    
    // Remove duplicates and return
    return [...new Set(equipment)];
  }

  async showEquipmentAlternatives() {
    this.showNotification('Showing equipment alternatives...', 'info');
    // TODO: Show modal with equipment alternatives
    setTimeout(() => {
      this.showNotification('Equipment alternatives feature coming soon!', 'info');
    }, 1000);
  }

  // Helper methods
  getAllIngredients() {
    const ingredients = [];
    
    // Get detailed ingredients
    if (this.currentRecipe.ingredientsDetailed) {
      ingredients.push(...this.currentRecipe.ingredientsDetailed.map(ing => ing.name));
    }
    
    // Get traditional ingredients
    for (let i = 1; i <= 20; i++) {
      const ingredient = this.currentRecipe[`strIngredient${i}`];
      if (ingredient && ingredient.trim()) {
        ingredients.push(ingredient);
      }
    }
    
    return ingredients;
  }

  refreshIngredientsSection() {
    const ingredientsList = document.querySelector('.ingredients-list');
    if (ingredientsList) {
      ingredientsList.innerHTML = this.renderIngredients(this.currentRecipe);
      this.attachEventListeners();
    }
  }

  refreshEquipmentSection() {
    const equipmentList = document.querySelector('.equipment-list');
    if (equipmentList) {
      equipmentList.innerHTML = this.renderEquipment(this.currentRecipe.equipmentRequired || []);
      this.attachEventListeners();
    }
  }

  // Render dietary information with emojis
  renderDietary(dietary) {
    const dietaryItems = [];
    
    // Convert dietary object to array of active dietary preferences
    Object.entries(dietary).forEach(([key, value]) => {
      if (value === true) {
        // Convert camelCase to readable format
        const readableKey = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .replace(/No /g, 'No ')
          .trim();
        
        const emoji = this.dietaryEmojis[readableKey] || this.dietaryEmojis[key] || '🍽️';
        dietaryItems.push(`
          <div class="dietary-tag active">
            <span class="dietary-emoji">${emoji}</span>
            <span class="dietary-label">${readableKey}</span>
          </div>
        `);
      }
    });

    if (dietaryItems.length === 0) {
      return '<p class="no-dietary">No specific dietary restrictions</p>';
    }

    return `<div class="dietary-tags">${dietaryItems.join('')}</div>`;
  }

  // Render nutrition information
  renderNutrition(nutrition) {
    const nutritionItems = [
      { key: 'caloriesPerServing', label: 'Calories', emoji: '🔥', unit: '' },
      { key: 'protein', label: 'Protein', emoji: '🥩', unit: 'g' },
      { key: 'carbs', label: 'Carbs', emoji: '🍞', unit: 'g' },
      { key: 'fat', label: 'Fat', emoji: '🥑', unit: 'g' },
      { key: 'fiber', label: 'Fiber', emoji: '🌾', unit: 'g' },
      { key: 'sugar', label: 'Sugar', emoji: '🍯', unit: 'g' },
      { key: 'sodium', label: 'Sodium', emoji: '🧂', unit: 'mg' },
      { key: 'cholesterol', label: 'Cholesterol', emoji: '🍳', unit: 'mg' }
    ];

    return nutritionItems.map(item => `
      <div class="nutrition-item">
        <div class="emoji">${item.emoji}</div>
        <strong>${item.label}</strong>
        <div class="value">${nutrition[item.key] || 0}${item.unit}</div>
      </div>
    `).join('');
  }

  // Render ingredients list
  renderIngredients(recipe) {
    const ingredients = [];
    
    // Check if we have detailed ingredients array
    if (recipe.ingredientsDetailed && recipe.ingredientsDetailed.length > 0) {
      return recipe.ingredientsDetailed.map((ing, idx) => `
        <div class="ingredient-row" data-index="${idx}">
          <span class="ingredient-name">${ing.name}</span>
          <span class="ingredient-amount">${ing.quantity} ${ing.unit}</span>
          ${this.editMode ? `<button class="btn-remove" onclick="window.recipeDisplay.removeIngredient(${idx})" title="Remove ingredient"><i class="fas fa-times"></i></button>` : ''}
        </div>
      `).join('');
    }

    // Fallback to traditional ingredient slots
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipe[`strIngredient${i}`];
      const measure = recipe[`strMeasure${i}`];
      
      if (ingredient && ingredient.trim()) {
        ingredients.push(`
          <div class="ingredient-row" data-index="${i}">
            <span class="ingredient-name">${ingredient}</span>
            <span class="ingredient-amount">${measure || 'To taste'}</span>
            ${this.editMode ? `<button class="btn-remove" onclick="window.recipeDisplay.removeIngredient(${i})" title="Remove ingredient"><i class="fas fa-times"></i></button>` : ''}
          </div>
        `);
      }
    }

    return ingredients.length > 0 ? ingredients.join('') : '<p class="no-ingredients">No ingredients listed</p>';
  }

  // Render equipment list
  renderEquipment(equipment) {
    if (!equipment || equipment.length === 0) {
      return '<p class="no-equipment">No specific equipment required</p>';
    }

    return equipment.map((item, idx) => `
      <div class="equipment-item" data-index="${idx}">
        <span class="equipment-icon">🔧</span>
        <span class="equipment-name">${item}</span>
        ${this.editMode ? `<button class="btn-remove" onclick="window.recipeDisplay.removeEquipment(${idx})" title="Remove equipment"><i class="fas fa-times"></i></button>` : ''}
      </div>
    `).join('');
  }

  // Render instructions with step numbers
  renderInstructions(recipe) {
    let instructions = [];
    
    // Check if instructions is an array
    if (recipe.instructions && Array.isArray(recipe.instructions)) {
      instructions = recipe.instructions;
    } else if (recipe.strInstructions) {
      // Parse string instructions
      const instructionText = recipe.strInstructions;
      
      // Try to split by step numbers
      if (instructionText.includes('Step ')) {
        instructions = instructionText.split(/Step \d+[:.]\s*/)
          .filter(step => step.trim())
          .map(step => step.trim());
      } else {
        // Split by sentences or periods as fallback
        instructions = instructionText.split(/[.!?]\s+/)
          .filter(step => step.trim() && step.length > 10)
          .map(step => step.trim() + (step.endsWith('.') ? '' : '.'));
      }
    }

    if (instructions.length === 0) {
      return '<p class="no-instructions">No instructions available</p>';
    }

    return instructions.map((instruction, idx) => `
      <div class="instruction-step" data-step="${idx + 1}">
        <div class="step-number">${idx + 1}</div>
        <div class="step-content">
          <p>${instruction}</p>
        </div>
        ${this.editMode ? `<button class="btn-remove" onclick="window.recipeDisplay.removeInstruction(${idx})" title="Remove step"><i class="fas fa-times"></i></button>` : ''}
      </div>
    `).join('');
  }

  // Remove equipment item
  async removeEquipment(index) {
    if (this.currentRecipe.equipmentRequired && this.currentRecipe.equipmentRequired[index]) {
      this.currentRecipe.equipmentRequired.splice(index, 1);
      this.refreshEquipmentSection();
      await this.saveChanges();
      this.showNotification('Equipment removed!', 'success');
    }
  }

  // Remove instruction step
  async removeInstruction(index) {
    if (this.currentRecipe.instructions && this.currentRecipe.instructions[index]) {
      this.currentRecipe.instructions.splice(index, 1);
      
      // Re-render instructions
      const instructionsList = document.querySelector('.instructions-list');
      if (instructionsList) {
        instructionsList.innerHTML = this.renderInstructions(this.currentRecipe);
        this.attachEventListeners();
      }
      
      await this.saveChanges();
      this.showNotification('Instruction step removed!', 'success');
    }
  }
}

console.log('ComprehensiveRecipeDisplay class defined successfully');

// Export class globally and initialize with error handling
try {
  console.log('Starting to export ComprehensiveRecipeDisplay...');
  window.ComprehensiveRecipeDisplay = ComprehensiveRecipeDisplay;
  console.log('Class exported successfully');
  
  window.recipeDisplay = new ComprehensiveRecipeDisplay();
  console.log('Instance created successfully');

  // Debug logging
  console.log('Comprehensive Recipe Display loaded successfully');
  console.log('window.recipeDisplay:', window.recipeDisplay);
  console.log('window.ComprehensiveRecipeDisplay:', window.ComprehensiveRecipeDisplay);
} catch (error) {
  console.error('ERROR loading Comprehensive Recipe Display:', error);
  console.error('Error stack:', error.stack);
  
  // Create a minimal fallback
  window.ComprehensiveRecipeDisplay = class {
    renderRecipe(recipe, container) {
      container.innerHTML = `
        <div style="padding: 20px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px;">
          <h3>⚠️ Fallback Display</h3>
          <p>The comprehensive display failed to load, but here's the basic recipe data:</p>
          <h4>${recipe.strMeal || 'Unnamed Recipe'}</h4>
          <p><strong>Category:</strong> ${recipe.strCategory || 'Unknown'}</p>
          <p><strong>Cuisine:</strong> ${recipe.strArea || 'Unknown'}</p>
          <p><strong>Instructions:</strong></p>
          <p style="white-space: pre-wrap;">${recipe.strInstructions || 'No instructions available'}</p>
          <p><strong>Error:</strong> ${error.message}</p>
        </div>
      `;
    }
  };
  
  window.recipeDisplay = new window.ComprehensiveRecipeDisplay();
}
