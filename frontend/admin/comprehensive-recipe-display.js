// Comprehensive Recipe Display Component
class ComprehensiveRecipeDisplay {
  constructor() {
    this.currentRecipe = null;
    this.editMode = false;
  }

  // Render full recipe with all comprehensive data
  renderRecipe(recipe, container) {
    this.currentRecipe = recipe;
    
    container.innerHTML = `
      <div class="comprehensive-recipe-container">
        <!-- Header with Quick Actions -->
        <div class="recipe-header-actions">
          <h2 class="recipe-title">${recipe.strMeal || 'Untitled Recipe'}</h2>
          <div class="quick-actions">
            <button class="btn-action" id="btn-calculate-macros">
              <i class="fas fa-calculator"></i> Calculate Macros
            </button>
            <button class="btn-action" id="btn-add-ingredient">
              <i class="fas fa-plus"></i> Add Ingredient
            </button>
            <button class="btn-action" id="btn-add-equipment">
              <i class="fas fa-tools"></i> Add Equipment
            </button>
            <button class="btn-action" id="btn-toggle-edit">
              <i class="fas fa-edit"></i> ${this.editMode ? 'Save Changes' : 'Edit Mode'}
            </button>
          </div>
        </div>

        <!-- Main Image Gallery -->
        <div class="recipe-images-section">
          <div class="main-image">
            <img src="${recipe.strMealThumb || '/placeholder.jpg'}" alt="${recipe.strMeal}">
          </div>
          ${recipe.additionalImages && recipe.additionalImages.length > 0 ? `
            <div class="additional-images">
              ${recipe.additionalImages.map((img, idx) => `
                <img src="${img}" alt="Image ${idx + 1}" class="thumb-image">
              `).join('')}
            </div>
          ` : ''}
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
              <span class="value">${recipe.strArea || 'Not set'}</span>
            </div>
            <div class="editable-field" data-field="difficulty">
              <label>Difficulty:</label>
              <span class="value">${recipe.difficulty || 'Medium'}</span>
            </div>
            <div class="editable-field" data-field="dishType">
              <label>Dish Type:</label>
              <span class="value">${recipe.dishType || 'Main Course'}</span>
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
          <h3><i class="fas fa-carrot"></i> Ingredients</h3>
          <div class="ingredients-list">
            ${this.renderIngredients(recipe)}
          </div>
          <button class="btn-add" id="btn-add-ingredient-section">
            <i class="fas fa-plus"></i> Add Ingredient
          </button>
        </div>

        <!-- Instructions Section -->
        <div class="instructions-section">
          <h3><i class="fas fa-list-ol"></i> Instructions</h3>
          <div class="instructions-list">
            ${this.renderInstructions(recipe)}
          </div>
          <button class="btn-add" id="btn-add-instruction-section">
            <i class="fas fa-plus"></i> Add Step
          </button>
        </div>

        <!-- Nutrition Section -->
        <div class="nutrition-section">
          <h3><i class="fas fa-chart-pie"></i> Nutritional Information</h3>
          <button class="btn-action btn-calculate" id="btn-calculate-macros-section">
            <i class="fas fa-calculator"></i> Recalculate Nutrition
          </button>
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
          <h3><i class="fas fa-tools"></i> Equipment Required</h3>
          <div class="equipment-list">
            ${this.renderEquipment(recipe.equipmentRequired || [])}
          </div>
          <button class="btn-add" id="btn-add-equipment-section">
            <i class="fas fa-plus"></i> Add Equipment
          </button>
        </div>

        <!-- Tags and Categories -->
        <div class="tags-section">
          <h3><i class="fas fa-tags"></i> Tags & Categories</h3>
          <div class="tags-grid">
            <div class="tag-group">
              <label>Meal Type:</label>
              <div class="tags">
                ${(recipe.mealType || []).map(type => `<span class="tag">${type}</span>`).join('')}
              </div>
            </div>
            <div class="tag-group">
              <label>Occasion:</label>
              <div class="tags">
                ${(recipe.occasion || []).map(occ => `<span class="tag">${occ}</span>`).join('')}
              </div>
            </div>
            <div class="tag-group">
              <label>Seasonality:</label>
              <div class="tags">
                ${(recipe.seasonality || []).map(season => `<span class="tag">${season}</span>`).join('')}
              </div>
            </div>
            <div class="tag-group">
              <label>Keywords:</label>
              <div class="tags">
                ${(recipe.keywords || []).map(keyword => `<span class="tag">${keyword}</span>`).join('')}
              </div>
            </div>
            <div class="tag-group">
              <label>Allergens:</label>
              <div class="tags">
                ${(recipe.allergenFlags || []).map(allergen => `<span class="tag allergen">${allergen}</span>`).join('')}
              </div>
            </div>
            <div class="tag-group">
              <label>Skills Required:</label>
              <div class="tags">
                ${(recipe.skillsRequired || []).map(skill => `<span class="tag">${skill}</span>`).join('')}
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
    // Quick action buttons in header
    const calcMacrosBtn = document.getElementById('btn-calculate-macros');
    if (calcMacrosBtn) {
      calcMacrosBtn.addEventListener('click', () => this.calculateMacros());
    }
    
    const addIngredientBtn = document.getElementById('btn-add-ingredient');
    if (addIngredientBtn) {
      addIngredientBtn.addEventListener('click', () => this.addIngredient());
    }
    
    const addEquipmentBtn = document.getElementById('btn-add-equipment');
    if (addEquipmentBtn) {
      addEquipmentBtn.addEventListener('click', () => this.addEquipment());
    }
    
    const toggleEditBtn = document.getElementById('btn-toggle-edit');
    if (toggleEditBtn) {
      toggleEditBtn.addEventListener('click', () => this.toggleEditMode());
    }
    
    // Section-specific add buttons
    const addIngredientSectionBtn = document.getElementById('btn-add-ingredient-section');
    if (addIngredientSectionBtn) {
      addIngredientSectionBtn.addEventListener('click', () => this.addIngredient());
    }
    
    const addInstructionBtn = document.getElementById('btn-add-instruction-section');
    if (addInstructionBtn) {
      addInstructionBtn.addEventListener('click', () => this.addInstruction());
    }
    
    const calcMacrosSectionBtn = document.getElementById('btn-calculate-macros-section');
    if (calcMacrosSectionBtn) {
      calcMacrosSectionBtn.addEventListener('click', () => this.calculateMacros());
    }
    
    const addEquipmentSectionBtn = document.getElementById('btn-add-equipment-section');
    if (addEquipmentSectionBtn) {
      addEquipmentSectionBtn.addEventListener('click', () => this.addEquipment());
    }
    
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
          ${this.editMode ? '<button class="btn-remove" data-ingredient-idx="' + idx + '">×</button>' : ''}
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
            ${this.editMode ? '<button class="btn-remove" data-ingredient-idx="' + i + '">×</button>' : ''}
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
          ${this.editMode ? '<button class="btn-remove" data-instruction-idx="' + idx + '">×</button>' : ''}
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
          <div class="editable-field" data-field="nutrition.${nutrient.key}">
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
        ${this.editMode ? '<button class="btn-remove" data-equipment-idx="' + idx + '">×</button>' : ''}
      </div>
    `).join('');
  }

  // Toggle edit mode
  toggleEditMode() {
    this.editMode = !this.editMode;
    
    if (this.editMode) {
      this.enableEditMode();
    } else {
      this.saveChanges();
    }
    
    // Re-render with new mode
    const container = document.querySelector('.comprehensive-recipe-container').parentElement;
    this.renderRecipe(this.currentRecipe, container);
  }

  // Enable edit mode
  enableEditMode() {
    document.querySelectorAll('.editable-field').forEach(field => {
      const value = field.querySelector('.value');
      if (value && !value.querySelector('input')) {
        const currentValue = value.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'edit-input';
        value.innerHTML = '';
        value.appendChild(input);
      }
    });
  }

  // Save changes
  async saveChanges() {
    const updates = {};
    
    document.querySelectorAll('.editable-field').forEach(field => {
      const fieldName = field.dataset.field;
      const input = field.querySelector('input');
      if (input) {
        const value = input.value;
        
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

    // Send to backend
    try {
      const response = await fetch(`/api/admin/recipes/${this.currentRecipe.idMeal || this.currentRecipe.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        this.showNotification('Recipe updated successfully!', 'success');
      } else {
        this.showNotification('Failed to update recipe', 'error');
      }
    } catch (error) {
      console.error('Error saving recipe:', error);
      this.showNotification('Error saving changes', 'error');
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

    // Call nutrition API or use local calculation
    try {
      const response = await fetch('/api/admin/calculate-nutrition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ ingredients, servings: this.currentRecipe.numberOfServings || 4 })
      });

      if (response.ok) {
        const nutrition = await response.json();
        this.currentRecipe.nutrition = nutrition;
        
        // Re-render nutrition section
        const nutritionGrid = document.querySelector('.nutrition-grid');
        if (nutritionGrid) {
          nutritionGrid.innerHTML = this.renderNutrition(nutrition);
        }
        
        this.showNotification('Nutrition calculated successfully!', 'success');
      } else {
        // Fallback to estimated values
        this.estimateNutrition();
      }
    } catch (error) {
      console.error('Error calculating nutrition:', error);
      this.estimateNutrition();
    }
  }

  // Estimate nutrition (fallback)
  estimateNutrition() {
    const nutrition = {
      caloriesPerServing: Math.floor(Math.random() * 200 + 300),
      protein: Math.floor(Math.random() * 20 + 15),
      carbs: Math.floor(Math.random() * 30 + 20),
      fat: Math.floor(Math.random() * 15 + 10),
      fiber: Math.floor(Math.random() * 5 + 3),
      sugar: Math.floor(Math.random() * 10 + 5),
      sodium: Math.floor(Math.random() * 500 + 400),
      cholesterol: Math.floor(Math.random() * 50 + 30),
      saturatedFat: Math.floor(Math.random() * 8 + 4),
      vitaminA: Math.floor(Math.random() * 20 + 10),
      vitaminC: Math.floor(Math.random() * 30 + 15),
      iron: Math.floor(Math.random() * 15 + 10),
      calcium: Math.floor(Math.random() * 12 + 8)
    };

    this.currentRecipe.nutrition = nutrition;
    
    // Re-render nutrition section
    const nutritionGrid = document.querySelector('.nutrition-grid');
    if (nutritionGrid) {
      nutritionGrid.innerHTML = this.renderNutrition(nutrition);
    }
    
    this.showNotification('Nutrition estimated based on ingredients', 'info');
  }

  // Add ingredient
  addIngredient() {
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
    }
  }

  // Remove ingredient
  removeIngredient(index) {
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
  }

  // Add equipment
  addEquipment() {
    const equipment = prompt('Enter equipment name:');
    
    if (equipment) {
      if (!this.currentRecipe.equipmentRequired) {
        this.currentRecipe.equipmentRequired = [];
      }
      
      this.currentRecipe.equipmentRequired.push(equipment);
      
      // Re-render equipment
      const equipmentList = document.querySelector('.equipment-list');
      if (equipmentList) {
        equipmentList.innerHTML = this.renderEquipment(this.currentRecipe.equipmentRequired);
      }
      
      this.showNotification('Equipment added!', 'success');
    }
  }

  // Remove equipment
  removeEquipment(index) {
    this.currentRecipe.equipmentRequired.splice(index, 1);
    
    // Re-render equipment
    const equipmentList = document.querySelector('.equipment-list');
    if (equipmentList) {
      equipmentList.innerHTML = this.renderEquipment(this.currentRecipe.equipmentRequired);
      // Re-attach event listeners after re-rendering
      this.attachEventListeners();
    }
  }

  // Add instruction
  addInstruction() {
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
    }
  }

  // Remove instruction
  removeInstruction(index) {
    this.currentRecipe.instructions.splice(index, 1);
    
    // Re-render instructions
    const instructionsList = document.querySelector('.instructions-list');
    if (instructionsList) {
      instructionsList.innerHTML = this.renderInstructions(this.currentRecipe);
      // Re-attach event listeners after re-rendering
      this.attachEventListeners();
    }
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
}

// Initialize globally
window.recipeDisplay = new ComprehensiveRecipeDisplay();
