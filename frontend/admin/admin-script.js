class AdminPanel {
  constructor() {
    this.token = this.getStoredToken();
    this.currentSection = 'dashboard';
    
    this.initializeElements();
    this.setupEventListeners();
    this.checkAuthentication();
    this.setupNumberAdjustButtons();
    this.setupStepperButtons();
  }

  initializeElements() {
    // Modals and panels
    this.loginModal = document.getElementById('loginModal');
    this.adminPanel = document.getElementById('adminPanel');
    
    // Forms (with null checks)
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
    // Anonymous auth (no PIN required)
    document.getElementById('anonymousAuthBtn').addEventListener('click', this.handleAnonymousAuth.bind(this));
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', this.handleLogout.bind(this));
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.currentTarget.dataset.section;
        if (section) {
          this.switchSection(section);
          this.updatePageTitle(section);
        }
      });
    });
    
    // Forms (with null checks)
    if (this.generateForm) {
      this.generateForm.addEventListener('submit', this.handleGenerateRecipe.bind(this));
    }
    
    // Handle random mode toggle
    const randomModeCheckbox = document.getElementById('randomMode');
    const customFiltersSection = document.getElementById('customFiltersSection');
    
    if (randomModeCheckbox && customFiltersSection) {
      randomModeCheckbox.addEventListener('change', () => {
        if (randomModeCheckbox.checked) {
          customFiltersSection.style.display = 'none';
        } else {
          customFiltersSection.style.display = 'block';
        }
      });
    }

    // Initialize generation filters
    this.generationFilters = {
      categories: new Set(),
      dishTypes: new Set(),
      cuisines: new Set(),
      dietary: new Set()
    };

    // Setup generation filter buttons
    this.setupGenerationFilters();
    
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

  // Authentication is now anonymous-only

  async handleAnonymousAuth() {
    try {
      console.log('🔓 Setting up anonymous authentication...');
      
      // Set anonymous token for persistent access
      this.token = 'anonymous-firebase-auth';
      this.storeToken(this.token);
      
      // Show admin panel immediately
      this.showAdminPanel();
      this.loadDashboard();
      
      // Update username display
      const userNameElement = document.querySelector('.user-name');
      if (userNameElement) {
        userNameElement.textContent = 'Anonymous User';
      }
      
      console.log('✅ Anonymous authentication successful! Access is persistent.');
      
    } catch (error) {
      console.error('❌ Anonymous authentication failed:', error);
      // Still try to show the panel - anonymous auth should always work
      this.showAdminPanel();
      this.loadDashboard();
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
      // Auto-authenticate anonymously - no PIN required
      console.log('🔓 Auto-authenticating anonymously...');
      this.handleAnonymousAuth();
    }
  }
  
  // Setup number adjustment buttons to avoid inline handlers (CSP compliance)
  setupNumberAdjustButtons() {
    document.querySelectorAll('[data-adjust]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const inputId = e.target.dataset.adjust;
        const value = parseInt(e.target.dataset.value);
        const input = document.getElementById(inputId);
        if (input) {
          const currentVal = parseInt(input.value) || 1;
          const newVal = Math.max(1, Math.min(10, currentVal + value));
          input.value = newVal;
        }
      });
    });
  }

  setupGenerationFilters() {
    // Setup filter button event listeners
    document.querySelectorAll('.category-filter').forEach(btn => {
      btn.addEventListener('click', () => this.toggleGenerationFilter('categories', btn.dataset.category, btn));
    });
    
    document.querySelectorAll('.dish-filter').forEach(btn => {
      btn.addEventListener('click', () => this.toggleGenerationFilter('dishTypes', btn.dataset.dish, btn));
    });
    
    document.querySelectorAll('.cuisine-filter').forEach(btn => {
      btn.addEventListener('click', () => this.toggleGenerationFilter('cuisines', btn.dataset.cuisine, btn));
    });
    
    document.querySelectorAll('.dietary-filter').forEach(btn => {
      btn.addEventListener('click', () => this.toggleGenerationFilter('dietary', btn.dataset.dietary, btn));
    });

    // Setup clear filters button
    const clearBtn = document.getElementById('clearGenerationFilters');
    if (clearBtn) {
      clearBtn.addEventListener('click', this.clearGenerationFilters.bind(this));
    }

    // Initialize display
    this.updateGenerationFiltersDisplay();
  }

  toggleGenerationFilter(filterType, value, buttonElement) {
    const filterSet = this.generationFilters[filterType];
    
    if (filterSet.has(value)) {
      // Remove filter
      filterSet.delete(value);
      buttonElement.classList.remove('active');
    } else {
      // Add filter
      filterSet.add(value);
      buttonElement.classList.add('active');
    }
    
    this.updateGenerationFiltersDisplay();
  }

  clearGenerationFilters() {
    // Clear all filter sets
    this.generationFilters.categories.clear();
    this.generationFilters.dishTypes.clear();
    this.generationFilters.cuisines.clear();
    this.generationFilters.dietary.clear();
    
    // Remove active class from all filter buttons
    document.querySelectorAll('.filter-btn-small.active').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Update display
    this.updateGenerationFiltersDisplay();
  }

  updateGenerationFiltersDisplay() {
    const activeFiltersContainer = document.getElementById('activeGenerationFilters');
    if (!activeFiltersContainer) return;
    
    // Clear existing tags
    activeFiltersContainer.innerHTML = '';
    
    // Add filter tags for each active filter
    const allFilters = [];
    
    // Add category filters
    this.generationFilters.categories.forEach(category => {
      allFilters.push({ type: 'categories', value: category, label: `🍽️ ${category}` });
    });
    
    // Add dish type filters
    this.generationFilters.dishTypes.forEach(dish => {
      allFilters.push({ type: 'dishTypes', value: dish, label: `🍳 ${dish}` });
    });
    
    // Add cuisine filters
    this.generationFilters.cuisines.forEach(cuisine => {
      allFilters.push({ type: 'cuisines', value: cuisine, label: `🌍 ${cuisine}` });
    });
    
    // Add dietary filters
    this.generationFilters.dietary.forEach(dietary => {
      allFilters.push({ type: 'dietary', value: dietary, label: `🥗 ${dietary}` });
    });
    
    // Create filter tags
    allFilters.forEach(filter => {
      const tag = document.createElement('div');
      tag.className = 'generation-filter-tag';
      tag.innerHTML = `
        ${filter.label}
        <button class="remove-filter" data-type="${filter.type}" data-value="${filter.value}">×</button>
      `;
      activeFiltersContainer.appendChild(tag);
      
      // Add remove event listener
      const removeBtn = tag.querySelector('.remove-filter');
      removeBtn.addEventListener('click', () => {
        this.removeGenerationFilter(filter.type, filter.value);
      });
    });
    
    // Show "None" if no filters active
    if (allFilters.length === 0) {
      const noneTag = document.createElement('span');
      noneTag.className = 'no-filters-text';
      noneTag.textContent = 'No filters selected - will generate random recipe';
      activeFiltersContainer.appendChild(noneTag);
    }
  }

  removeGenerationFilter(filterType, value) {
    const filterSet = this.generationFilters[filterType];
    filterSet.delete(value);
    
    // Update button state
    const button = document.querySelector(`[data-${filterType.replace('dishTypes', 'dish').replace('cuisines', 'cuisine').replace('categories', 'category').replace('dietary', 'dietary')}="${value}"]`);
    if (button) {
      button.classList.remove('active');
    }
    
    this.updateGenerationFiltersDisplay();
  }

  async verifyToken() {
    try {
      // Handle anonymous tokens directly
      if (this.token === 'anonymous-firebase-auth') {
        console.log('✅ Anonymous token verified, showing admin panel');
        this.showAdminPanel();
        this.loadDashboard();
        
        // Update username display
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement) {
          userNameElement.textContent = 'Anonymous User';
        }
        return;
      }

      // For regular tokens, verify with server
      const response = await fetch('/admin/me', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.showAdminPanel();
        this.loadDashboard();
        
        // Update username display
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement) {
          userNameElement.textContent = data.user.username;
        }
      } else {
        // Token is invalid, auto-authenticate anonymously
        console.log('🔄 Token invalid, switching to anonymous auth');
        this.token = null;
        this.removeStoredToken();
        this.handleAnonymousAuth();
      }
    } catch (error) {
      // Network error, auto-authenticate anonymously
      console.log('🔄 Network error, switching to anonymous auth');
      this.token = null;
      this.removeStoredToken();
      this.handleAnonymousAuth();
    }
  }

  // UI Management
  showLoginModal() {
    this.loginModal.classList.add('active');
    this.adminPanel.classList.remove('active');
  }

  showAdminPanel() {
    this.loginModal.classList.remove('active');
    this.adminPanel.style.display = 'flex';
    this.adminPanel.classList.add('active');
  }

  switchSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-link[data-section="${sectionName}"]`);
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
      'manage-recipes': 'All Recipes'
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
      case 'allRecipes':
        this.loadRecipes();
        break;
      case 'generate':
        // AI Generate section - no special loading needed
        break;
    }
  }

  updatePageTitle(sectionName) {
    const titleElement = document.getElementById('pageTitle');
    if (titleElement) {
      const titles = {
        'dashboard': 'Dashboard',
        'generate': 'AI Recipe Generator',
        'allRecipes': 'All Recipes'
      };
      titleElement.textContent = titles[sectionName] || 'Dashboard';
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
      
      // Update stats - check if elements exist
      const totalRecipesEl = document.getElementById('totalRecipes');
      const totalCategoriesEl = document.getElementById('totalCategories');
      const totalAreasEl = document.getElementById('totalAreas');
      const recentRecipesEl = document.getElementById('recentRecipes');
      
      if (totalRecipesEl) totalRecipesEl.textContent = data.stats.totalRecipes;
      if (totalCategoriesEl) totalCategoriesEl.textContent = data.stats.totalCategories;
      if (totalAreasEl) totalAreasEl.textContent = data.stats.totalAreas;
      if (recentRecipesEl) recentRecipesEl.textContent = data.stats.recentRecipes;
      
      // Update recent activity if it exists
      const activityList = document.getElementById('recentActivity');
      if (activityList && data.recentActivity) {
        activityList.innerHTML = data.recentActivity.map(activity => `
          <div class="activity-item">
            <span>${activity.name}</span>
            <span>${new Date(activity.date).toLocaleDateString()}</span>
          </div>
        `).join('');
      }
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
          // Pass all image URLs to display function
          const recipe = data.recipe;
          if (data.imageUrls && data.imageUrls.length > 0) {
            recipe.additionalImages = data.imageUrls;
          }
          this.displayRecipeResult(recipe, data.imageUrl);
          
          const imageText = data.imageCount > 1 ? `with ${data.imageCount} images` : '';
          this.showSuccess(this.generateResult, `🎉 Recipe generated successfully ${imageText}!`);
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
    const generateImage = document.getElementById('generateImage')?.checked ?? true;
    const recipeCount = parseInt(document.getElementById('recipeCount')?.value) || 1;
    const imageCount = parseInt(document.getElementById('imageCount')?.value) || 1;
    
    const baseParams = {
      generateImage: generateImage,
      includeExistingContext: true,
      batchCount: recipeCount,
      imageCount: imageCount
    };
    
    if (randomMode) {
      // Random generation with variety
      return {
        ...baseParams,
        mode: 'random'
      };
    } else {
      // Custom generation with filters
      const filters = {
        categories: Array.from(this.generationFilters.categories),
        dishTypes: Array.from(this.generationFilters.dishTypes),
        cuisines: Array.from(this.generationFilters.cuisines),
        dietary: Array.from(this.generationFilters.dietary)
      };
      
      return {
        ...baseParams,
        mode: 'filtered',
        filters: filters
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
      const recipesContent = document.getElementById('recipesContent');
      if (!recipesContent) return;
      
      // Show loading state
      recipesContent.innerHTML = `
        <div class="flex items-center justify-center p-8">
          <div class="text-center">
            <i class="fas fa-spinner fa-spin text-2xl text-muted mb-4"></i>
            <p class="text-muted">Loading recipes...</p>
          </div>
        </div>
      `;
      
      const response = await fetch('/admin/recipes', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      const data = await response.json();
      console.log('🔍 Recipe data structure:', data.recipes?.[0]);
      
      if (!data.recipes || data.recipes.length === 0) {
        recipesContent.innerHTML = `
          <div class="text-center p-8">
            <div class="mb-6">
              <i class="fas fa-utensils" style="font-size: 4rem; color: var(--color-muted); margin-bottom: 1rem;"></i>
              <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--color-text); margin-bottom: 0.5rem;">No recipes found</h3>
              <p style="color: var(--color-muted); margin-bottom: 1.5rem;">Start by generating some recipes with AI!</p>
              <button class="btn btn-primary" id="btn-go-to-generate">
                <i class="fas fa-magic"></i>
                Generate Recipes
              </button>
            </div>
          </div>
        `;
        // Add event listener for the generate button
        const goToGenerateBtn = document.getElementById('btn-go-to-generate');
        if (goToGenerateBtn) {
          goToGenerateBtn.addEventListener('click', () => this.switchSection('generate'));
        }
        return;
      }
      
      // Sort recipes by latest added (dateModified descending)
      const sortedRecipes = data.recipes.sort((a, b) => {
        const dateA = new Date(a.dateModified || 0);
        const dateB = new Date(b.dateModified || 0);
        return dateB - dateA; // Latest first
      });

      recipesContent.innerHTML = `
        <div class="recipes-table-container">
          <table class="recipes-table">
            <thead>
              <tr>
                <th class="col-image">Image</th>
                <th class="col-name">Recipe Name</th>
                <th class="col-category">Category</th>
                <th class="col-cuisine">Cuisine</th>
                <th class="col-date">Date Added</th>
                <th class="col-status">Status</th>
                <th class="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${sortedRecipes.map(recipe => `
                <tr class="recipe-row" data-recipe-id="${recipe.id || recipe.idMeal}">
                  <td class="col-image">
                    ${recipe.strMealThumb ? 
                      `<img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" class="recipe-thumb-table">` : 
                      '<div class="recipe-thumb-placeholder-table">📸</div>'
                    }
                  </td>
                  <td class="col-name">
                    <div class="recipe-name-cell">
                      <h4>${recipe.strMeal || 'Unnamed Recipe'}</h4>
                      <p class="recipe-preview">${recipe.strInstructions ? recipe.strInstructions.substring(0, 80) + '...' : 'No description'}</p>
                    </div>
                  </td>
                  <td class="col-category">
                    <span class="category-badge">${recipe.strCategory || 'Uncategorized'}</span>
                  </td>
                  <td class="col-cuisine">
                    <span class="cuisine-badge">${recipe.strArea || 'Unknown'}</span>
                  </td>
                  <td class="col-date">
                    <div class="date-cell">
                      <span class="date-main">${recipe.dateModified ? new Date(recipe.dateModified).toLocaleDateString() : 'Unknown'}</span>
                      <span class="date-time">${recipe.dateModified ? new Date(recipe.dateModified).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                    </div>
                  </td>
                  <td class="col-status">
                    <span class="status-badge status-published">Published</span>
                  </td>
                  <td class="col-actions">
                    <div class="action-buttons">
                      <button class="btn-action-table btn-primary view-recipe-btn" data-recipe-id="${recipe.id || recipe.idMeal}" title="View Full Details">
                        <span class="btn-icon">👁️</span>
                        <span class="btn-text">View</span>
                      </button>
                      <button class="btn-action-table btn-secondary improve-recipe-btn" data-recipe-id="${recipe.id || recipe.idMeal}" title="Improve with AI">
                        <span class="btn-icon">🤖</span>
                        <span class="btn-text">Edit</span>
                      </button>
                      <button class="btn-action-table btn-danger delete-recipe-btn" data-recipe-id="${recipe.id || recipe.idMeal}" title="Delete Recipe">
                        <span class="btn-icon">🗑️</span>
                        <span class="btn-text">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      
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
    document.querySelectorAll('.improve-recipe-btn, .delete-recipe-btn, .edit-recipe-btn, .view-recipe-btn').forEach(btn => {
      btn.replaceWith(btn.cloneNode(true));
    });
    
    // Add view recipe listeners
    document.querySelectorAll('.view-recipe-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const recipeId = e.currentTarget.getAttribute('data-recipe-id');
        console.log('🔍 View recipe clicked, ID:', recipeId);
        await this.viewRecipeComprehensive(recipeId);
      });
    });
    
    // Add improve recipe listeners
    document.querySelectorAll('.improve-recipe-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const recipeId = e.currentTarget.getAttribute('data-recipe-id');
        this.improveRecipe(recipeId);
      });
    });
    
    // Add edit recipe listeners
    document.querySelectorAll('.edit-recipe-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const recipeId = e.currentTarget.getAttribute('data-recipe-id');
        this.editRecipe(recipeId);
      });
    });
    
    // Add delete recipe listeners  
    document.querySelectorAll('.delete-recipe-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const recipeId = e.currentTarget.getAttribute('data-recipe-id');
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

  // View recipe with comprehensive display
  async viewRecipeComprehensive(recipeId) {
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
      const recipe = data.recipe || data;
      
      // Create a modal or dedicated section for the comprehensive view
      const modal = document.createElement('div');
      modal.className = 'comprehensive-recipe-modal';
      modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content-large">
          <button class="close-modal-btn">×</button>
          <div id="comprehensiveRecipeContent"></div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Add event listeners for closing the modal
      const overlay = modal.querySelector('.modal-overlay');
      const closeBtn = modal.querySelector('.close-modal-btn');
      
      if (overlay) {
        overlay.addEventListener('click', () => modal.remove());
      }
      
      if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.remove());
      }
      
      // Use the comprehensive display component
      const container = document.getElementById('comprehensiveRecipeContent');
      
      // Debug logging
      console.log('Attempting to load comprehensive display...');
      console.log('window.recipeDisplay exists:', !!window.recipeDisplay);
      console.log('window.ComprehensiveRecipeDisplay exists:', !!window.ComprehensiveRecipeDisplay);
      
      // Function to render recipe
      const renderRecipe = () => {
        try {
          if (window.recipeDisplay && typeof window.recipeDisplay.renderRecipe === 'function') {
            console.log('Using existing recipeDisplay instance');
            window.recipeDisplay.renderRecipe(recipe, container);
            return true;
          } else if (window.ComprehensiveRecipeDisplay) {
            console.log('Creating new recipeDisplay instance');
            window.recipeDisplay = new window.ComprehensiveRecipeDisplay();
            window.recipeDisplay.renderRecipe(recipe, container);
            return true;
          }
          return false;
        } catch (error) {
          console.error('Error rendering recipe:', error);
          return false;
        }
      };
      
      // Try to render immediately
      if (!renderRecipe()) {
        console.log('Component not ready, waiting...');
        // Fallback - try to load after delays
        setTimeout(() => {
          if (!renderRecipe()) {
            setTimeout(() => {
              if (!renderRecipe()) {
                console.error('Comprehensive recipe display failed to load after multiple attempts');
                container.innerHTML = `
                  <div class="error-message" style="padding: 20px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px;">
                    <h3 style="color: #dc3545; margin-bottom: 15px;">🚨 Component Loading Error</h3>
                    <p><strong>The comprehensive recipe display component failed to load.</strong></p>
                    <p>Debug info:</p>
                    <ul style="margin: 10px 0;">
                      <li>window.recipeDisplay: ${!!window.recipeDisplay}</li>
                      <li>window.ComprehensiveRecipeDisplay: ${!!window.ComprehensiveRecipeDisplay}</li>
                      <li>Script loaded: ${document.querySelector('script[src*="comprehensive-recipe-display.js"]') ? 'Yes' : 'No'}</li>
                    </ul>
                    <details style="margin-top: 15px;">
                      <summary style="cursor: pointer; font-weight: bold;">View Recipe Data</summary>
                      <pre style="background: #fff; padding: 10px; border: 1px solid #ccc; border-radius: 4px; max-height: 300px; overflow: auto; font-size: 12px;">${JSON.stringify(recipe, null, 2)}</pre>
                    </details>
                    <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">🔄 Refresh Page</button>
                  </div>`;
              }
            }, 1000);
          }
        }, 500);
      }
      
    } catch (error) {
      console.error('Failed to view recipe:', error);
      alert('Failed to load recipe details');
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

  // Setup stepper button functionality
  setupStepperButtons() {
    document.querySelectorAll('.stepper-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        const targetId = e.currentTarget.dataset.target;
        const input = document.getElementById(targetId);
        
        if (input) {
          const currentValue = parseInt(input.value) || 1;
          const min = parseInt(input.min) || 1;
          const max = parseInt(input.max) || 10;
          
          let newValue = currentValue;
          if (action === 'increase' && currentValue < max) {
            newValue = currentValue + 1;
          } else if (action === 'decrease' && currentValue > min) {
            newValue = currentValue - 1;
          }
          
          input.value = newValue;
        }
      });
    });
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