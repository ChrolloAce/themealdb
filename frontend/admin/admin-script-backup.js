class AdminPanel {
  constructor() {
    this.token = this.getStoredToken();
    this.currentSection = 'dashboard';
    
    this.initializeElements();
    this.setupEventListeners();
    this.checkAuthentication();
  }

  initializeElements() {
    // Modals and panels
    this.loginModal = document.getElementById('loginModal');
    this.adminPanel = document.getElementById('adminPanel');
    
    // Forms
    this.loginForm = document.getElementById('loginForm');
    this.generateForm = document.getElementById('generateForm');
    this.ideasForm = document.getElementById('ideasForm');
    this.batchForm = document.getElementById('batchForm');
    
    // Navigation
    this.navButtons = document.querySelectorAll('.nav-btn');
    this.sections = document.querySelectorAll('.admin-section');
    
    // Results containers
    this.generateResult = document.getElementById('generateResult');
    this.ideasResult = document.getElementById('ideasResult');
    this.batchResult = document.getElementById('batchResult');
  }

  setupEventListeners() {
    // Login
    this.loginForm.addEventListener('submit', this.handleLogin.bind(this));
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', this.handleLogout.bind(this));
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.currentTarget.dataset.section;
        if (section) {
          this.switchSection(section);
        }
      });
    });
    
    // Forms
    this.generateForm.addEventListener('submit', this.handleGenerateRecipe.bind(this));
    
    // Handle random mode toggle
    const randomModeCheckbox = document.getElementById('randomMode');
    const customPromptSection = document.getElementById('customPromptSection');
    
    if (randomModeCheckbox && customPromptSection) {
      randomModeCheckbox.addEventListener('change', () => {
        if (randomModeCheckbox.checked) {
          customPromptSection.style.display = 'none';
        } else {
          customPromptSection.style.display = 'block';
        }
      });
    }
    
    if (this.ideasForm) {
      this.ideasForm.addEventListener('submit', this.handleGenerateIdeas.bind(this));
    }
    
    // Batch templates
    document.querySelectorAll('[data-template]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.loadBatchTemplate(e.target.dataset.template);
      });
    });
    
    if (this.batchForm) {
      this.batchForm.addEventListener('submit', this.handleBatchGenerate.bind(this));
    }
    
    // Recipe management
    const refreshBtn = document.getElementById('refreshRecipes');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', this.loadRecipes.bind(this));
    }
    
    // Quick generation buttons
    document.querySelectorAll('.quick-gen-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleQuickGenerate(e.target.dataset.preset);
      });
    });
    
    // Edit modal listeners
    document.getElementById('closeEditModal').addEventListener('click', this.closeEditModal.bind(this));
    document.getElementById('cancelEditBtn').addEventListener('click', this.closeEditModal.bind(this));
    document.getElementById('editRecipeForm').addEventListener('submit', this.saveRecipeEdit.bind(this));
    document.getElementById('addIngredientBtn').addEventListener('click', this.addIngredientField.bind(this));
    
    // Setup recipe action listeners (will be called after loadRecipes)
    this.setupRecipeActionListeners();
  }

  // Authentication with PIN system
  async handleLogin(e) {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    // PIN-only system - no username required
    const finalUsername = 'admin';
    const finalPassword = password;
    
    try {
      const response = await fetch('/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: finalUsername, password: finalPassword })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.token = data.token;
        this.storeToken(data.token);
        this.showAdminPanel();
        this.loadDashboard();
        document.getElementById('adminUsername').textContent = data.user.username;
      } else {
        errorDiv.textContent = data.message || 'Login failed';
      }
    } catch (error) {
      errorDiv.textContent = 'Connection error. Please try again.';
    }
  }

  handleLogout() {
    this.token = null;
    this.removeStoredToken();
    this.showLoginModal();
  }

  checkAuthentication() {
    if (this.token) {
      this.verifyToken();
    } else {
      this.showLoginModal();
    }
  }

  async verifyToken() {
    try {
      const response = await fetch('/admin/me', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.showAdminPanel();
        this.loadDashboard();
        document.getElementById('adminUsername').textContent = data.user.username;
      } else {
        // Token is invalid, remove it and show login
        this.token = null;
        this.removeStoredToken();
        this.showLoginModal();
      }
    } catch (error) {
      // Network error or server issue, show login
      this.token = null;
      this.removeStoredToken();
      this.showLoginModal();
    }
  }

  // UI Management
  showLoginModal() {
    this.loginModal.classList.add('active');
    this.adminPanel.classList.remove('active');
  }

  showAdminPanel() {
    this.loginModal.classList.remove('active');
    this.adminPanel.classList.add('active');
  }

  switchSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
    if (activeNav) {
      activeNav.classList.add('active');
    }
    
    // Update sections
    this.sections.forEach(section => section.classList.remove('active'));
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
      targetSection.classList.add('active');
    }
    
    // Update page title
    const titles = {
      'dashboard': 'Dashboard',
      'ai-generate': 'AI Recipe Generator',
      'ai-ideas': 'Recipe Ideas',
      'manage-recipes': 'Manage Recipes'
    };
    
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle && titles[sectionName]) {
      pageTitle.textContent = titles[sectionName];
    }
    
    this.currentSection = sectionName;
    
    // Load section-specific data
    switch (sectionName) {
      case 'dashboard':
        this.loadDashboard();
        break;
      case 'manage-recipes':
        this.loadRecipes();
        break;
    }
  }

  // Dashboard
  async loadDashboard() {
    try {
      const response = await fetch('/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      const data = await response.json();
      
      // Update stats
      document.getElementById('totalRecipes').textContent = data.stats.totalRecipes;
      document.getElementById('totalCategories').textContent = data.stats.totalCategories;
      document.getElementById('totalAreas').textContent = data.stats.totalAreas;
      document.getElementById('recentRecipes').textContent = data.stats.recentRecipes;
      
      // Update recent activity
      const activityList = document.getElementById('recentActivity');
      activityList.innerHTML = data.recentActivity.map(activity => `
        <div class="activity-item">
          <span>${activity.name}</span>
          <span>${new Date(activity.date).toLocaleDateString()}</span>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  }

  // Recipe Generation with Batch Support
  async handleGenerateRecipe(e) {
    e.preventDefault();
    
    const params = this.getGenerateFormData();
    const batchCount = params.batchCount || 1;
    
    if (batchCount > 1) {
      // Handle batch generation
      this.handleBatchGenerateFromForm(params);
    } else {
      // Handle single recipe generation
      this.showLoading(this.generateResult, '🚀 Generating recipe with AI...');
      
      try {
        const response = await fetch('/admin/recipes/create-with-ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify(params)
        });
        
        const data = await response.json();
        
        if (data.success) {
          this.displayRecipeResult(data.recipe, data.imageUrl);
          this.showSuccess(this.generateResult, '🎉 Recipe generated successfully!');
        } else {
          this.showError(this.generateResult, data.message || 'Generation failed');
        }
      } catch (error) {
        this.showError(this.generateResult, `Network error: ${error.message}`);
      }
    }
  }

  // Handle batch generation from main form
  async handleBatchGenerateFromForm(baseParams) {
    const batchCount = baseParams.batchCount;
    const randomize = baseParams.randomizeSettings;
    
    this.showLoading(this.generateResult, `🔥 Generating ${batchCount} recipes...`);
    
    const recipes = [];
    const cuisines = ['Italian', 'Mexican', 'Chinese', 'Japanese', 'Indian', 'French', 'American', 'Mediterranean'];
    const categories = ['Beef', 'Chicken', 'Seafood', 'Vegetarian', 'Vegan', 'Dessert'];
    const difficulties = ['Easy', 'Medium', 'Hard'];
    
    for (let i = 0; i < batchCount; i++) {
      let recipeParams = { ...baseParams };
      
      if (randomize) {
        recipeParams.cuisine = cuisines[Math.floor(Math.random() * cuisines.length)];
        recipeParams.category = categories[Math.floor(Math.random() * categories.length)];
        recipeParams.difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
        recipeParams.theme = `delicious ${recipeParams.cuisine.toLowerCase()} ${recipeParams.category.toLowerCase()}`;
      }
      
      try {
        const response = await fetch('/admin/recipes/create-with-ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify(recipeParams)
        });
        
        const data = await response.json();
        
        if (data.success) {
          recipes.push(data.recipe);
        }
        
        // Update loading message
        this.showLoading(this.generateResult, `🔥 Generated ${i + 1}/${batchCount} recipes...`);
        
      } catch (error) {
        console.error(`Failed to generate recipe ${i + 1}:`, error);
      }
    }
    
    // Display batch results
    this.displayBatchResults(recipes);
    this.showSuccess(this.generateResult, `🎉 Generated ${recipes.length}/${batchCount} recipes successfully!`);
  }

  // Display batch generation results
  displayBatchResults(recipes) {
    const resultsHTML = recipes.map(recipe => `
      <div class="batch-recipe-card">
        <h4>${recipe.strMeal}</h4>
        <p><strong>${recipe.strCategory}</strong> • ${recipe.strArea}</p>
        ${recipe.strMealThumb ? `<img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" class="batch-recipe-thumb">` : ''}
        <p class="batch-recipe-preview">${recipe.strInstructions ? recipe.strInstructions.substring(0, 100) + '...' : ''}</p>
      </div>
    `).join('');
    
    this.generateResult.innerHTML = `
      <div class="batch-results">
        <h3>🎉 Batch Generation Complete</h3>
        <div class="batch-recipes-grid">
          ${resultsHTML}
        </div>
      </div>
    `;
  }

  async previewRecipe(e) {
    e.preventDefault();
    
    const params = this.getGenerateFormData();
    
    this.showLoading(this.generateResult, 'Generating recipe preview...');
    
    try {
      const response = await fetch('/admin/ai/generate-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(params)
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.displayRecipeResult(data.recipe, null, true);
      } else {
        this.showError(this.generateResult, data.message || 'Preview failed');
      }
    } catch (error) {
      this.showError(this.generateResult, 'Failed to generate preview');
    }
  }

  // Quick generation with presets
  async handleQuickGenerate(preset) {
    const presets = {
      random: {
        cuisine: 'any',
        category: 'any',
        difficulty: 'any',
        mainIngredient: '',
        theme: 'surprise me with something delicious',
        generateImage: true
      },
      healthy: {
        cuisine: 'Mediterranean',
        category: 'Vegetarian',
        difficulty: 'Medium',
        mainIngredient: '',
        theme: 'healthy and nutritious',
        generateImage: true
      },
      comfort: {
        cuisine: 'American',
        category: 'any',
        difficulty: 'Easy',
        mainIngredient: '',
        theme: 'comfort food',
        generateImage: true
      },
      dessert: {
        cuisine: 'any',
        category: 'Dessert',
        difficulty: 'Medium',
        mainIngredient: '',
        theme: 'delicious dessert',
        generateImage: true
      }
    };

    const params = presets[preset];
    params.servings = 4;
    params.cookingTime = '30 minutes';

    this.showLoading(this.generateResult, `🚀 Generating ${preset} recipe...`);

    try {
      const response = await fetch('/admin/recipes/create-with-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(params)
      });

      const data = await response.json();

      if (data.success) {
        this.displayRecipeResult(data.recipe, data.imageUrl);
        this.showSuccess(this.generateResult, `🎉 ${preset.charAt(0).toUpperCase() + preset.slice(1)} recipe generated!`);
      } else {
        this.showError(this.generateResult, data.message || 'Generation failed');
      }
    } catch (error) {
      this.showError(this.generateResult, `Failed to generate ${preset} recipe`);
    }
  }

  getGenerateFormData() {
    const randomMode = document.getElementById('randomMode')?.checked ?? true;
    const customPrompt = document.getElementById('customPrompt')?.value || '';
    const generateImage = document.getElementById('generateImage')?.checked ?? true;
    
    if (randomMode) {
      // Random generation with variety
      return {
        mode: 'random',
        generateImage: generateImage,
        // Add variety to prevent duplication
        includeExistingContext: true
      };
    } else {
      // Custom prompt generation
      return {
        mode: 'custom',
        customPrompt: customPrompt,
        generateImage: generateImage,
        includeExistingContext: true
      };
    }
  }

  displayRecipeResult(recipe, imageUrl = null, isPreview = false, imageQuality = null) {
    const ingredients = this.getRecipeIngredients(recipe);
    
    // Parse instructions into steps
    const instructions = recipe.strInstructions || '';
    const steps = instructions.split(/Step \d+:|^\d+\.|^\d+\)/gm)
      .filter(step => step.trim())
      .map(step => step.replace(/^[:.]/, '').trim());
    
    // Parse equipment
    const equipment = recipe.equipment || recipe.strEquipment || '';
    const equipmentList = typeof equipment === 'string' 
      ? equipment.split(',').map(e => e.trim()).filter(e => e)
      : Array.isArray(equipment) ? equipment : [];
    
    const qualityBadge = imageQuality === 'ultra-hd' ? 
      '<span style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; margin-left: 0.5rem;">🎨 ULTRA-HD AI GENERATED</span>' : '';
    
    // Parse JSON fields safely
    const parseDietaryLabels = (labels) => {
      try { return JSON.parse(labels || '[]'); } catch { return []; }
    };
    const parseEquipment = (equipment) => {
      try { return JSON.parse(equipment || '[]'); } catch { return []; }
    };
    const parseAllergens = (allergens) => {
      try { return JSON.parse(allergens || '[]'); } catch { return []; }
    };
    const parseKeywords = (keywords) => {
      try { return JSON.parse(keywords || '[]'); } catch { return []; }
    };

    this.generateResult.innerHTML = `
      <div class="recipe-display-modern">
        <!-- Recipe Header -->
        <div class="recipe-header-modern">
          <h1 class="recipe-title-modern">${recipe.strMeal}</h1>
          ${imageUrl ? `
            <img src="${imageUrl}" alt="${recipe.strMeal}" style="width: 100%; max-width: 600px; border-radius: 12px; margin-top: 1rem;">
          ` : ''}
        </div>
        
        <!-- Stats Bar -->
        <div class="recipe-stats-bar">
          <div class="stat-badge">
            <span class="stat-badge-icon">⏱️</span>
            <div class="stat-badge-content">
              <span class="stat-badge-label">Prep</span>
              <span class="stat-badge-value">${recipe.prepTime || '15 min'}</span>
            </div>
          </div>
          <div class="stat-badge">
            <span class="stat-badge-icon">🔥</span>
            <div class="stat-badge-content">
              <span class="stat-badge-label">Cook</span>
              <span class="stat-badge-value">${recipe.cookTime || '30 min'}</span>
            </div>
          </div>
          <div class="stat-badge">
            <span class="stat-badge-icon">⏰</span>
            <div class="stat-badge-content">
              <span class="stat-badge-label">Total</span>
              <span class="stat-badge-value">${recipe.totalTime || '45 min'}</span>
            </div>
          </div>
          <div class="stat-badge">
            <span class="stat-badge-icon">🍽️</span>
            <div class="stat-badge-content">
              <span class="stat-badge-label">Serves</span>
              <span class="stat-badge-value">${recipe.servings || '4'}</span>
            </div>
          </div>
          <div class="stat-badge">
            <span class="stat-badge-icon">📊</span>
            <div class="stat-badge-content">
              <span class="stat-badge-label">Difficulty</span>
              <span class="stat-badge-value">${recipe.difficulty || 'Medium'}</span>
            </div>
          </div>
          <div class="stat-badge">
            <span class="stat-badge-icon">🥘</span>
            <div class="stat-badge-content">
              <span class="stat-badge-label">Yield</span>
              <span class="stat-badge-value">${recipe.yield || 'Serves 4'}</span>
            </div>
          </div>
        </div>
        
        <!-- Ingredients Grid -->
        <div class="ingredients-grid-modern">
          <div class="ingredients-grid-header">
            <span class="ingredients-grid-title">🥘 Ingredients</span>
          </div>
          <div class="ingredients-container">
            ${ingredients.map(ing => {
              const [amount, ...nameParts] = ing.split(' ');
              const name = nameParts.join(' ');
              return `
                <div class="ingredient-card">
                  <div class="ingredient-icon">🥄</div>
                  <div class="ingredient-details">
                    <div class="ingredient-name">${name || ing}</div>
                    <div class="ingredient-amount">${amount && !name ? ing : amount}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    
    // Add save button if not preview
    if (!isPreview) {
      this.generateResult.innerHTML += `
        <button id="saveRecipeBtn" class="btn btn-success">💾 Save Recipe to Database</button>
      `;
      document.getElementById('saveRecipeBtn').addEventListener('click', () => this.saveGeneratedRecipe(recipe));
    }
  }



          <h4>🔧 Equipment Needed</h4>
          <div class="equipment-list">
            ${(recipe.equipment || recipe.strEquipment.split(',')).map(item => 
              `<span class="equipment-item">• ${typeof item === 'string' ? item.trim() : item}</span>`
            ).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Nutrition Facts -->
        ${recipe.caloriesPerServing ? `
        <div class="nutrition-panel">
          <h4>📊 Nutrition Facts (per serving)</h4>
          <div class="nutrition-grid">
            <div class="nutrition-item calories">
              <strong>${recipe.caloriesPerServing}</strong><br>Calories
            </div>
            <div class="nutrition-item">
              <strong>${recipe.protein || 'N/A'}</strong><br>Protein
            </div>
            <div class="nutrition-item">
              <strong>${recipe.carbs || 'N/A'}</strong><br>Carbs
            </div>
            <div class="nutrition-item">
              <strong>${recipe.fat || 'N/A'}</strong><br>Fat
            </div>
            <div class="nutrition-item">
              <strong>${recipe.fiber || 'N/A'}</strong><br>Fiber
            </div>
            <div class="nutrition-item">
              <strong>${recipe.sodium || 'N/A'}</strong><br>Sodium
            </div>
          </div>
          
          ${recipe.vitaminA || recipe.vitaminC || recipe.iron || recipe.calcium ? `
          <div class="micronutrients">
            <h5>Vitamins & Minerals</h5>
            <div class="micro-grid">
              ${recipe.vitaminA ? `<span>Vitamin A: ${recipe.vitaminA}</span>` : ''}
              ${recipe.vitaminC ? `<span>Vitamin C: ${recipe.vitaminC}</span>` : ''}
              ${recipe.iron ? `<span>Iron: ${recipe.iron}</span>` : ''}
              ${recipe.calcium ? `<span>Calcium: ${recipe.calcium}</span>` : ''}
            </div>
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        <!-- Ingredients -->
        <div class="ingredients-list">
          <h4>🥘 Ingredients</h4>
          <ul class="ingredients-enhanced">
            ${ingredients.map(ing => `<li>${ing}</li>`).join('')}
          </ul>
        </div>
        
        <!-- Equipment -->
        ${recipe.strEquipment || parseEquipment(recipe.equipmentRequired).length ? `
        <div class="equipment-list">
          <h4>🍳 Required Equipment</h4>
          <div class="equipment-tags">
            ${parseEquipment(recipe.equipmentRequired).length ? 
              parseEquipment(recipe.equipmentRequired).map(item => 
                `<span class="equipment-tag">${item}</span>`
              ).join('') :
              `<p>${recipe.strEquipment}</p>`
            }
          </div>
        </div>
        ` : ''}
        
        <!-- Instructions -->
        <div class="instructions">
          <h4>👨‍🍳 Instructions</h4>
          <div class="instructions-content">${recipe.strInstructions}</div>
        </div>
        
        <!-- Recipe Details -->
        <div class="recipe-details-grid">
          <div class="detail-section">
            <h5>🏷️ Categories</h5>
            <p><strong>Cuisine:</strong> ${recipe.cuisine || recipe.strArea}</p>
            <p><strong>Meal Type:</strong> ${recipe.mealType || 'N/A'}</p>
            <p><strong>Dish Type:</strong> ${recipe.dishType || recipe.strCategory}</p>
            <p><strong>Main Ingredient:</strong> ${recipe.mainIngredient || 'N/A'}</p>
          </div>
          
          <div class="detail-section">
            <h5>🎯 Context</h5>
            <p><strong>Occasion:</strong> ${recipe.occasion || 'Any time'}</p>
            <p><strong>Season:</strong> ${recipe.seasonality || 'Year-round'}</p>
            <p><strong>Time Category:</strong> ${recipe.timeCategory || 'N/A'}</p>
          </div>
        </div>
        
        <!-- Keywords & Search -->
        ${parseKeywords(recipe.keywords).length ? `
        <div class="keywords-section">
          <h5>🔍 Keywords</h5>
          <div class="keyword-tags">
            ${parseKeywords(recipe.keywords).map(keyword => 
              `<span class="keyword-tag">${keyword}</span>`
            ).join('')}
          </div>
        </div>
        ` : ''}
        
        ${recipe.strTags ? `<p><strong>Tags:</strong> ${recipe.strTags}</p>` : ''}
        ${isPreview ? `<div class="form-actions"><button class="btn btn-primary save-previewed-recipe-btn">💾 Save This Amazing Recipe</button></div>` : ''}
      </div>
    `;
    
    this.previewedRecipe = recipe;
    
    // Set up event listeners for preview buttons if this is a preview
    if (isPreview) {
      this.setupPreviewEventListeners();
    }
  }

  getRecipeIngredients(recipe) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipe[`strIngredient${i}`];
      const measure = recipe[`strMeasure${i}`];
      if (ingredient && ingredient.trim()) {
        ingredients.push(`${measure || ''} ${ingredient}`.trim());
      }
    }
    return ingredients;
  }

  // Recipe Ideas
  async handleGenerateIdeas(e) {
    e.preventDefault();
    
    const params = {
      count: parseInt(document.getElementById('ideasCount').value),
      cuisine: document.getElementById('ideasCuisine').value,
      trending: document.getElementById('trendingFocus').checked,
      seasonal: document.getElementById('seasonalFocus').checked
    };
    
    this.showLoading(this.ideasResult, 'Generating recipe ideas...');
    
    try {
      const response = await fetch('/admin/ai/generate-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(params)
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.displayIdeasResult(data.ideas);
      } else {
        this.showError(this.ideasResult, data.message || 'Ideas generation failed');
      }
    } catch (error) {
      this.showError(this.ideasResult, 'Failed to generate ideas');
    }
  }

  displayIdeasResult(ideas) {
    this.ideasResult.innerHTML = ideas.map(idea => `
      <div class="idea-card">
        <h4>${idea.name}</h4>
        <div class="idea-meta">
          <span>${idea.cuisine}</span>
          <span>${idea.category}</span>
          <span>${idea.difficulty}</span>
          <span>${idea.estimatedTime}</span>
        </div>
        <p class="idea-description">${idea.description}</p>
        <div class="idea-ingredients">
          <strong>Key Ingredients:</strong>
          <div class="ingredients-tags">
            ${idea.keyIngredients.map(ing => `<span class="ingredient-tag">${ing}</span>`).join('')}
          </div>
        </div>
        <p><strong>Special Feature:</strong> ${idea.uniqueFeature}</p>
        <button class="btn btn-primary create-recipe-btn" data-recipe-name="${idea.name}" data-cuisine="${idea.cuisine}" data-category="${idea.category}">
          Create Full Recipe
        </button>
      </div>
    `).join('');
    
    // Add event listeners for dynamically created buttons
    this.setupIdeasEventListeners();
  }
  
  // Add event listeners for recipe ideas buttons
  setupIdeasEventListeners() {
    // Create recipe from idea buttons
    document.querySelectorAll('.create-recipe-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const recipeName = e.target.getAttribute('data-recipe-name');
        const cuisine = e.target.getAttribute('data-cuisine');
        const category = e.target.getAttribute('data-category');
        this.createFromIdea(recipeName, cuisine, category);
      });
    });
  }

  async createFromIdea(name, cuisine, category) {
    const params = {
      cuisine,
      category,
      theme: `Create a recipe for: ${name}`,
      generateImage: true
    };
    
    this.switchSection('ai-generate');
    
    // Pre-fill the form
    document.getElementById('cuisine').value = cuisine !== 'various' ? cuisine : 'any';
    document.getElementById('category').value = category;
    document.getElementById('theme').value = `Recipe idea: ${name}`;
    
    // Generate the recipe
    this.showLoading(this.generateResult, `Creating full recipe for: ${name}...`);
    
    try {
      const response = await fetch('/admin/recipes/create-with-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(params)
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.displayRecipeResult(data.recipe, data.imageUrl);
        this.showSuccess(this.generateResult, `Recipe "${name}" created successfully!`);
      } else {
        this.showError(this.generateResult, data.message || 'Recipe creation failed');
      }
    } catch (error) {
      this.showError(this.generateResult, 'Failed to create recipe from idea');
    }
  }

  // Batch Generation
  loadBatchTemplate(templateName) {
    const templates = {
      seasonal: [
        { cuisine: 'any', category: 'any', theme: 'spring seasonal recipes', mainIngredient: 'asparagus' },
        { cuisine: 'any', category: 'any', theme: 'spring seasonal recipes', mainIngredient: 'strawberries' },
        { cuisine: 'any', category: 'any', theme: 'spring seasonal recipes', mainIngredient: 'peas' },
        { cuisine: 'any', category: 'any', theme: 'spring seasonal recipes', mainIngredient: 'artichokes' },
        { cuisine: 'any', category: 'any', theme: 'spring seasonal recipes', mainIngredient: 'rhubarb' }
      ],
      healthy: [
        { cuisine: 'Mediterranean', category: 'Seafood', theme: 'healthy and nutritious' },
        { cuisine: 'Asian', category: 'Vegetarian', theme: 'healthy and nutritious' },
        { cuisine: 'American', category: 'Chicken', theme: 'healthy and nutritious' },
        { cuisine: 'Mexican', category: 'Vegetarian', theme: 'healthy and nutritious' },
        { cuisine: 'Indian', category: 'Vegan', theme: 'healthy and nutritious' },
        { cuisine: 'Italian', category: 'Seafood', theme: 'healthy and nutritious' },
        { cuisine: 'Greek', category: 'Vegetarian', theme: 'healthy and nutritious' },
        { cuisine: 'Japanese', category: 'Seafood', theme: 'healthy and nutritious' }
      ],
      international: [
        { cuisine: 'Italian', category: 'Pasta', theme: 'authentic traditional' },
        { cuisine: 'Mexican', category: 'Beef', theme: 'authentic traditional' },
        { cuisine: 'Chinese', category: 'Chicken', theme: 'authentic traditional' },
        { cuisine: 'Indian', category: 'Vegetarian', theme: 'authentic traditional' },
        { cuisine: 'French', category: 'Seafood', theme: 'authentic traditional' },
        { cuisine: 'Japanese', category: 'Seafood', theme: 'authentic traditional' },
        { cuisine: 'Thai', category: 'Chicken', theme: 'authentic traditional' },
        { cuisine: 'Greek', category: 'Lamb', theme: 'authentic traditional' },
        { cuisine: 'Spanish', category: 'Seafood', theme: 'authentic traditional' },
        { cuisine: 'Moroccan', category: 'Chicken', theme: 'authentic traditional' }
      ],
      desserts: [
        { cuisine: 'American', category: 'Dessert', theme: 'classic comfort dessert' },
        { cuisine: 'French', category: 'Dessert', theme: 'elegant pastry' },
        { cuisine: 'Italian', category: 'Dessert', theme: 'traditional sweet' },
        { cuisine: 'Mexican', category: 'Dessert', theme: 'festive dessert' },
        { cuisine: 'British', category: 'Dessert', theme: 'classic pudding' },
        { cuisine: 'German', category: 'Dessert', theme: 'traditional cake' }
      ]
    };
    
    const template = templates[templateName];
    if (template) {
      document.getElementById('batchConfig').value = JSON.stringify(template, null, 2);
    }
  }

  async handleBatchGenerate(e) {
    e.preventDefault();
    
    try {
      const recipes = JSON.parse(document.getElementById('batchConfig').value);
      const generateImages = document.getElementById('batchGenerateImages').checked;
      
      this.showLoading(this.batchResult, `Starting batch generation of ${recipes.length} recipes...`);
      
      const response = await fetch('/admin/recipes/batch-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ recipes, generateImages })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.displayBatchResult(data);
      } else {
        this.showError(this.batchResult, data.message || 'Batch generation failed');
      }
    } catch (error) {
      this.showError(this.batchResult, 'Failed to process batch generation');
    }
  }

  displayBatchResult(data) {
    const successItems = data.results.map(result => `
      <div class="progress-item success">
        <strong>${result.recipe.strMeal}</strong> - Generated successfully
        ${result.imageUrl ? '<br><small>✓ Image generated</small>' : ''}
      </div>
    `).join('');
    
    const errorItems = data.errors.map(error => `
      <div class="progress-item error">
        <strong>Failed:</strong> ${error.error}
      </div>
    `).join('');
    
    this.batchResult.innerHTML = `
      <h3>Batch Generation Complete</h3>
      <p>Generated: ${data.generated} | Failed: ${data.failed}</p>
      ${successItems}
      ${errorItems}
    `;
  }

  // Recipe Management
  async loadRecipes() {
    try {
      const response = await fetch('/admin/recipes', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      const data = await response.json();
      
      const recipesList = document.getElementById('recipesList');
      
      if (!data.recipes || data.recipes.length === 0) {
        recipesList.innerHTML = `
          <div class="empty-state">
            <h3>No recipes found</h3>
            <p>Start by generating some recipes with AI!</p>
            <button class="btn btn-primary" onclick="adminPanel.switchSection('ai-generate')">
              🤖 Generate Recipes
            </button>
          </div>
        `;
        return;
      }
      
      recipesList.innerHTML = data.recipes.map(recipe => `
        <div class="recipe-item">
          <div class="recipe-header">
            ${recipe.strMealThumb ? `<img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" class="recipe-thumb">` : '<div class="recipe-thumb-placeholder">📸</div>'}
            <h4>${recipe.strMeal || 'Unnamed Recipe'}</h4>
          </div>
          <div class="recipe-info">
            <p>${recipe.strCategory || 'No Category'} • ${recipe.strArea || 'No Area'}</p>
            <p class="recipe-date">${recipe.dateModified ? new Date(recipe.dateModified).toLocaleDateString() : 'No Date'}</p>
            <p class="recipe-preview">${recipe.strInstructions ? recipe.strInstructions.substring(0, 120) + '...' : 'No instructions'}</p>
          </div>
          <div class="recipe-actions">
            <button class="btn btn-outline edit-recipe-btn" data-recipe-id="${recipe.id || recipe.idMeal}">
              ✏️ Edit
            </button>
            <button class="btn btn-outline improve-recipe-btn" data-recipe-id="${recipe.id || recipe.idMeal}">
              🤖 Improve
            </button>
            <button class="btn btn-danger delete-recipe-btn" data-recipe-id="${recipe.id || recipe.idMeal}">
              🗑️ Delete
            </button>
          </div>
        </div>
      `).join('');
      
      // Add event listeners for dynamically created buttons
      this.setupRecipeActionListeners();
      this.setupPreviewEventListeners();
    } catch (error) {
      console.error('Failed to load recipes:', error);
    }
  }
  
  // Setup event listeners for recipe action buttons (dynamically created)
  setupRecipeActionListeners() {
    // Remove existing listeners to prevent duplicates
    document.querySelectorAll('.improve-recipe-btn, .delete-recipe-btn, .edit-recipe-btn').forEach(btn => {
      btn.replaceWith(btn.cloneNode(true));
    });
    
    // Add improve recipe listeners
    document.querySelectorAll('.improve-recipe-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const recipeId = e.target.getAttribute('data-recipe-id');
        this.improveRecipe(recipeId);
      });
    });
    
    // Add edit recipe listeners
    document.querySelectorAll('.edit-recipe-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const recipeId = e.target.getAttribute('data-recipe-id');
        this.editRecipe(recipeId);
      });
    });
    
    // Add delete recipe listeners  
    document.querySelectorAll('.delete-recipe-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const recipeId = e.target.getAttribute('data-recipe-id');
        this.deleteRecipe(recipeId);
      });
    });
  }
  
  // Setup event listeners for preview buttons (dynamically created)
  setupPreviewEventListeners() {
    // Save previewed recipe button
    document.querySelectorAll('.save-previewed-recipe-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.savePreviewedRecipe();
      });
    });
  }

  async improveRecipe(recipeId) {
    try {
      const response = await fetch(`/admin/ai/improve-recipe/${recipeId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Improvement suggestions for "${data.originalRecipe.strMeal}":\n\n${data.improvements.suggestions.join('\n')}`);
      }
    } catch (error) {
      alert('Failed to generate improvements');
    }
  }

  async deleteRecipe(recipeId) {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    
    try {
      const response = await fetch(`/admin/recipes/${recipeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (response.ok) {
        this.loadRecipes(); // Reload the list
      } else {
        alert('Failed to delete recipe');
      }
    } catch (error) {
      alert('Failed to delete recipe');
    }
  }

  // Utility methods
  showLoading(container, message) {
    container.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <span>${message}</span>
      </div>
    `;
  }

  showError(container, message) {
    container.innerHTML = `<div class="error-message">${message}</div>`;
  }

  showSuccess(container, message) {
    const existingContent = container.innerHTML;
    container.innerHTML = `<div class="success-message">${message}</div>` + existingContent;
  }

  // Token management
  getStoredToken() {
    return localStorage.getItem('fooddb_admin_token');
  }

  storeToken(token) {
    localStorage.setItem('fooddb_admin_token', token);
  }

  removeStoredToken() {
    localStorage.removeItem('fooddb_admin_token');
  }

  // Edit Recipe functionality
  async editRecipe(recipeId) {
    try {
      // Fetch recipe data
      const response = await fetch(`/admin/recipes/${recipeId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch recipe');
      }
      
      const data = await response.json();
      const recipe = data.recipe;
      
      // Populate form fields
      document.getElementById('editRecipeId').value = recipeId;
      document.getElementById('editStrMeal').value = recipe.strMeal || '';
      document.getElementById('editStrCategory').value = recipe.strCategory || '';
      document.getElementById('editStrArea').value = recipe.strArea || '';
      document.getElementById('editStrMealThumb').value = recipe.strMealThumb || '';
      document.getElementById('editStrInstructions').value = recipe.strInstructions || '';
      
      // Populate ingredients
      this.populateIngredients(recipe);
      
      // Show modal
      document.getElementById('editRecipeModal').classList.add('active');
    } catch (error) {
      console.error('Failed to load recipe for editing:', error);
      alert('Failed to load recipe data');
    }
  }
  
  populateIngredients(recipe) {
    const container = document.getElementById('editIngredientsContainer');
    container.innerHTML = '';
    
    // Extract ingredients from recipe (TheMealDB format)
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipe[`strIngredient${i}`];
      const measure = recipe[`strMeasure${i}`];
      
      if (ingredient && ingredient.trim()) {
        this.addIngredientField(ingredient, measure || '');
      }
    }
    
    // Add one empty field if no ingredients exist
    if (container.children.length === 0) {
      this.addIngredientField('', '');
    }
  }
  
  addIngredientField(ingredient = '', measure = '') {
    const container = document.getElementById('editIngredientsContainer');
    const ingredientDiv = document.createElement('div');
    ingredientDiv.className = 'ingredient-row';
    
    ingredientDiv.innerHTML = `
      <div class="form-row">
        <div class="form-group">
          <input type="text" class="ingredient-input" placeholder="Ingredient" value="${ingredient}">
        </div>
        <div class="form-group">
          <input type="text" class="measure-input" placeholder="Measurement" value="${measure}">
        </div>
        <div class="form-group">
          <button type="button" class="btn btn-danger remove-ingredient-btn">×</button>
        </div>
      </div>
    `;
    
    // Add remove functionality
    ingredientDiv.querySelector('.remove-ingredient-btn').addEventListener('click', () => {
      ingredientDiv.remove();
    });
    
    container.appendChild(ingredientDiv);
  }
  
  async saveRecipeEdit(e) {
    e.preventDefault();
    
    const recipeId = document.getElementById('editRecipeId').value;
    
    // Build recipe object
    const recipeData = {
      strMeal: document.getElementById('editStrMeal').value,
      strCategory: document.getElementById('editStrCategory').value,
      strArea: document.getElementById('editStrArea').value,
      strMealThumb: document.getElementById('editStrMealThumb').value,
      strInstructions: document.getElementById('editStrInstructions').value
    };
    
    // Add ingredients
    const ingredientRows = document.querySelectorAll('.ingredient-row');
    ingredientRows.forEach((row, index) => {
      const ingredient = row.querySelector('.ingredient-input').value.trim();
      const measure = row.querySelector('.measure-input').value.trim();
      
      if (ingredient) {
        recipeData[`strIngredient${index + 1}`] = ingredient;
        recipeData[`strMeasure${index + 1}`] = measure;
      }
    });
    
    // Clear unused ingredient slots
    for (let i = ingredientRows.length + 1; i <= 20; i++) {
      recipeData[`strIngredient${i}`] = '';
      recipeData[`strMeasure${i}`] = '';
    }
    
    try {
      const response = await fetch(`/admin/recipes/${recipeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(recipeData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Recipe updated successfully!');
        this.closeEditModal();
        this.loadRecipes(); // Refresh recipe list
      } else {
        alert('Failed to update recipe: ' + result.message);
      }
    } catch (error) {
      console.error('Failed to save recipe:', error);
      alert('Failed to save recipe');
    }
  }
  
  closeEditModal() {
    document.getElementById('editRecipeModal').classList.remove('active');
  }
}

// Initialize admin panel
const adminPanel = new AdminPanel();