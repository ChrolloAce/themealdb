class AdminPanel {
  constructor() {
    this.token = this.getStoredToken();
    this.currentSection = 'dashboard';
    this.currentSort = { column: null, direction: 'asc' };
    this.recipes = [];
    this.filteredRecipes = [];
    
    this.initializeElements();
    this.setupEventListeners();
    this.checkAuthentication();
    this.setupNumberAdjustButtons();
    this.setupStepperButtons();
    this.setupFilterButtons();
    this.setupSortingHandlers();
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
    
    // Delete All Recipes Button
    const deleteAllBtn = document.getElementById('deleteAllRecipesBtn');
    if (deleteAllBtn) {
      deleteAllBtn.addEventListener('click', this.deleteAllRecipes.bind(this));
    }
    
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
    const switchElement = document.querySelector('.switch');
    
    console.log('🔍 Toggle elements found:', {
      randomModeCheckbox: !!randomModeCheckbox,
      customFiltersSection: !!customFiltersSection,
      switchElement: !!switchElement
    });
    
    if (randomModeCheckbox && customFiltersSection) {
      // Set initial state
      const initialState = randomModeCheckbox.checked;
      customFiltersSection.style.display = initialState ? 'none' : 'block';
      console.log('🎯 Initial toggle state:', initialState, 'Filters display:', customFiltersSection.style.display);
      
      // Function to handle toggle
      const handleToggle = () => {
        const isChecked = randomModeCheckbox.checked;
        console.log('🎛️ Random mode toggle changed:', isChecked);
        
        if (isChecked) {
          // Random mode ON - hide custom filters
          customFiltersSection.style.display = 'none';
          console.log('🎲 Random mode enabled - filters hidden');
        } else {
          // Random mode OFF - show custom filters
          customFiltersSection.style.display = 'block';
          console.log('🎯 Custom mode enabled - filters shown');
        }
      };
      
      // Add multiple event listeners to ensure it works
      randomModeCheckbox.addEventListener('change', handleToggle);
      randomModeCheckbox.addEventListener('click', handleToggle);
      
      // Also add click to the switch container
      if (switchElement) {
        switchElement.addEventListener('click', (e) => {
          if (e.target !== randomModeCheckbox) {
            randomModeCheckbox.checked = !randomModeCheckbox.checked;
            handleToggle();
          }
        });
      }
    } else {
      console.error('⚠️ Toggle elements not found:', {
        randomModeCheckbox: !!randomModeCheckbox,
        customFiltersSection: !!customFiltersSection
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
    
    // Edit modal listeners (only if elements exist)
    const closeEditModal = document.getElementById('closeEditModal');
    if (closeEditModal) {
      closeEditModal.addEventListener('click', this.closeEditModal.bind(this));
    }
    
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', this.closeEditModal.bind(this));
    }
    
    const editRecipeForm = document.getElementById('editRecipeForm');
    if (editRecipeForm) {
      editRecipeForm.addEventListener('submit', this.saveRecipeEdit.bind(this));
    }
    
    const addIngredientBtn = document.getElementById('addIngredientBtn');
    if (addIngredientBtn) {
      addIngredientBtn.addEventListener('click', this.addIngredientField.bind(this));
    }
    
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
      case 'recipeEditor':
        // Recipe Editor section - no special loading needed (content loaded by viewRecipeComprehensive)
        break;
    }
  }

  updatePageTitle(sectionName) {
    const titleElement = document.getElementById('pageTitle');
    if (titleElement) {
      const titles = {
        'dashboard': 'Dashboard',
        'generate': 'AI Recipe Generator',
        'allRecipes': 'All Recipes',
        'recipeEditor': 'Recipe Editor'
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
      <div style="background: #ffffff !important; border-radius: 20px !important; padding: 40px !important; box-shadow: 0 25px 70px rgba(0,0,0,0.2) !important; border: 4px solid #10B981 !important; margin: 40px 0 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; max-width: 100% !important; color: #1a202c !important;">
        
        <!-- SUCCESS HEADER -->
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important; color: white !important; padding: 50px !important; border-radius: 20px !important; margin-bottom: 40px !important; box-shadow: 0 15px 40px rgba(16,185,129,0.4) !important; text-align: center !important;">
          <div style="font-size: 5rem !important; margin-bottom: 20px !important;">🎉</div>
          <h2 style="font-size: 3rem !important; font-weight: 900 !important; margin: 0 !important; text-shadow: 0 6px 12px rgba(0,0,0,0.4) !important; letter-spacing: -1px !important; color: white !important;">RECIPE GENERATED!</h2>
          <p style="margin: 20px 0 0 0 !important; font-size: 1.4rem !important; opacity: 0.95 !important; font-weight: 600 !important; color: white !important;">${isPreview ? '🔍 PREVIEW MODE' : '✨ YOUR AI RECIPE IS READY'}</p>
        </div>
        
        <div style="background: #f8fafc; border-radius: 16px; padding: 32px; border: 2px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          
          <!-- RECIPE TITLE & IMAGE -->
          <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #e2e8f0;">
            <h1 style="font-size: 3rem; font-weight: 800; color: #1a202c; margin: 0 0 24px 0; display: flex; align-items: center; justify-content: center; gap: 16px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              🍽️ ${recipe.strMeal}
            </h1>
            ${imageUrl ? `
              <div style="display: inline-block; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.15); border: 4px solid #e2e8f0; transition: transform 0.3s ease;">
                <img src="${imageUrl}" alt="${recipe.strMeal}" style="width: 100%; max-width: 500px; height: 300px; object-fit: cover; display: block;">
            </div>
            ` : `
              <div style="width: 100%; max-width: 500px; height: 300px; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 5rem; border: 3px dashed #cbd5e1; margin: 0 auto; box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);">🍽️</div>
            `}
          </div>
          
          <!-- STATS BAR WITH ENHANCED STYLING -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin-bottom: 32px;">
            <div style="text-align: center; padding: 20px; background: #ffffff; border-radius: 12px; border: 2px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: transform 0.2s ease; cursor: default;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
              <div style="font-size: 2.5rem; margin-bottom: 8px;">⏱️</div>
              <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Prep Time</div>
              <div style="font-size: 18px; font-weight: 800; color: #1a202c;">${recipe.prepTime || '15 min'}</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #ffffff; border-radius: 12px; border: 2px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: transform 0.2s ease; cursor: default;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
              <div style="font-size: 2.5rem; margin-bottom: 8px;">🔥</div>
              <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Cook Time</div>
              <div style="font-size: 18px; font-weight: 800; color: #1a202c;">${recipe.cookTime || '30 min'}</div>
          </div>
            <div style="text-align: center; padding: 20px; background: #ffffff; border-radius: 12px; border: 2px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: transform 0.2s ease; cursor: default;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
              <div style="font-size: 2.5rem; margin-bottom: 8px;">⏰</div>
              <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Total Time</div>
              <div style="font-size: 18px; font-weight: 800; color: #1a202c;">${recipe.totalTime || '45 min'}</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #ffffff; border-radius: 12px; border: 2px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: transform 0.2s ease; cursor: default;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
              <div style="font-size: 2.5rem; margin-bottom: 8px;">🍽️</div>
              <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Servings</div>
              <div style="font-size: 18px; font-weight: 800; color: #1a202c;">${recipe.servings || '4'}</div>
          </div>
            <div style="text-align: center; padding: 20px; background: #ffffff; border-radius: 12px; border: 2px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: transform 0.2s ease; cursor: default;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
              <div style="font-size: 2.5rem; margin-bottom: 8px;">📊</div>
              <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Difficulty</div>
              <div style="font-size: 18px; font-weight: 800; color: #1a202c;">${recipe.difficulty || 'Medium'}</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #ffffff; border-radius: 12px; border: 2px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: transform 0.2s ease; cursor: default;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
              <div style="font-size: 2.5rem; margin-bottom: 8px;">🥘</div>
              <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Yield</div>
              <div style="font-size: 18px; font-weight: 800; color: #1a202c;">${recipe.yield || 'Serves 4'}</div>
          </div>
            </div>
          
          <!-- RECIPE BADGES -->
          <div style="display: flex; flex-wrap: wrap; gap: var(--space-2); justify-content: center; margin-bottom: var(--space-6);">
            <span style="padding: var(--space-2) var(--space-4); background: var(--color-primary); color: white; border-radius: var(--radius-full); font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: var(--space-1);">
              🏷️ ${recipe.strCategory || 'Uncategorized'}
            </span>
            <span style="padding: var(--space-2) var(--space-4); background: var(--color-info, #3B82F6); color: white; border-radius: var(--radius-full); font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: var(--space-1);">
              🌍 ${recipe.strArea || 'International'}
            </span>
            ${qualityBadge ? `<span style="padding: var(--space-2) var(--space-4); background: var(--color-success, #10B981); color: white; border-radius: var(--radius-full); font-size: 14px; font-weight: 600;">${qualityBadge}</span>` : ''}
        </div>
        
          <!-- DESCRIPTION -->
          ${recipe.strDescription ? `
            <div style="background: var(--color-surface); padding: var(--space-5); border-radius: var(--radius-card); margin-bottom: var(--space-6); border-left: 4px solid var(--color-info, #3B82F6); box-shadow: var(--shadow-sm);">
              <h3 style="margin: 0 0 var(--space-3) 0; color: var(--color-text); display: flex; align-items: center; gap: var(--space-2); font-size: 1.25rem; font-weight: 600;">📖 Description</h3>
              <p style="color: var(--color-muted); line-height: 1.6; margin: 0; font-size: 1rem;">${recipe.strDescription}</p>
          </div>
          ` : ''}
          
          <!-- INGREDIENTS SECTION -->
          <div style="background: var(--color-surface); padding: var(--space-5); border-radius: var(--radius-card); margin-bottom: var(--space-6); border: 2px solid var(--color-success, #10B981); box-shadow: var(--shadow-sm); position: relative; overflow: hidden;">
            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--color-success, #10B981) 0%, var(--color-success-600, #059669) 100%);"></div>
            <h3 style="margin: 0 0 var(--space-4) 0; color: var(--color-text); display: flex; align-items: center; gap: var(--space-2); font-size: 1.5rem; font-weight: 600;">
              🥄 Ingredients (${ingredients.length} items)
            </h3>
            <div style="display: grid; gap: var(--space-3);">
              ${ingredients.map((ing, index) => {
              const [amount, ...nameParts] = ing.split(' ');
              const name = nameParts.join(' ');
              return `
                  <div style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); background: var(--color-input-bg); border-radius: var(--radius-lg); border: 1px solid var(--color-divider); box-shadow: var(--shadow-sm);">
                    <span style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: var(--color-success, #10B981); color: white; border-radius: 50%; font-size: 14px; font-weight: 600; flex-shrink: 0;">${index + 1}</span>
                    <div style="flex: 1;">
                      <div style="color: var(--color-text); font-weight: 500; font-size: 1rem;">${name || ing}</div>
                      ${amount && name ? `<div style="color: var(--color-muted); font-size: 0.9rem; margin-top: 2px;">${amount}</div>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
            </div>
          </div>
          
          <!-- INSTRUCTIONS SECTION -->
          <div style="background: var(--color-surface); padding: var(--space-5); border-radius: var(--radius-card); margin-bottom: var(--space-6); border: 2px solid var(--color-warning, #F59E0B); box-shadow: var(--shadow-sm); position: relative; overflow: hidden;">
            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--color-warning, #F59E0B) 0%, var(--color-warning-600, #D97706) 100%);"></div>
            <h3 style="margin: 0 0 var(--space-4) 0; color: var(--color-text); display: flex; align-items: center; gap: var(--space-2); font-size: 1.5rem; font-weight: 600;">
              📝 Instructions (${steps.length > 0 ? steps.length : 1} steps)
            </h3>
            <div style="display: grid; gap: var(--space-4);">
              ${steps.length > 0 ? 
                steps.map((step, index) => `
                  <div style="display: flex; gap: var(--space-4); padding: var(--space-4); background: var(--color-input-bg); border-radius: var(--radius-lg); border: 1px solid var(--color-divider); box-shadow: var(--shadow-sm);">
                    <span style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: var(--color-warning, #F59E0B); color: white; border-radius: 50%; font-size: 16px; font-weight: 700; flex-shrink: 0; box-shadow: var(--shadow-md);">${index + 1}</span>
                    <span style="flex: 1; line-height: 1.6; color: var(--color-text); font-size: 1rem; padding-top: 8px;">${step}</span>
                  </div>
                `).join('') :
                `<div style="padding: var(--space-6); text-align: center; background: var(--color-input-bg); border-radius: var(--radius-lg); border: 2px dashed var(--color-divider);">
                  <p style="color: var(--color-muted); font-size: 1rem; margin: 0; line-height: 1.6;">${recipe.strInstructions || 'No instructions provided.'}</p>
                </div>`
              }
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add action buttons if not preview
    if (!isPreview) {
      const actionsHtml = `
        <div style="display: flex; gap: var(--space-3); justify-content: center; flex-wrap: wrap; margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--color-divider);">
          <button id="saveRecipeBtn" style="padding: var(--space-3) var(--space-5); background: var(--color-primary); color: white; border: none; border-radius: var(--radius-lg); cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: var(--space-2); transition: all 0.2s ease; box-shadow: var(--shadow-sm);">
            💾 Save Recipe to Database
          </button>
          <button onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(recipe).replace(/"/g, '&quot;')}, null, 2))" style="padding: var(--space-3) var(--space-5); background: var(--color-info, #3B82F6); color: white; border: none; border-radius: var(--radius-lg); cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: var(--space-2); transition: all 0.2s ease; box-shadow: var(--shadow-sm);">
            📋 Copy Recipe Data
          </button>
          <button onclick="adminPanel.generateRecipe()" style="padding: var(--space-3) var(--space-5); background: var(--color-success, #10B981); color: white; border: none; border-radius: var(--radius-lg); cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: var(--space-2); transition: all 0.2s ease; box-shadow: var(--shadow-sm);">
            🎲 Generate Another
          </button>
        </div>
      `;
      
      // Find the last closing div and insert before it
      const lastClosingDiv = this.generateResult.innerHTML.lastIndexOf('</div>');
      if (lastClosingDiv !== -1) {
        const beforeClosing = this.generateResult.innerHTML.substring(0, lastClosingDiv);
        const afterClosing = this.generateResult.innerHTML.substring(lastClosingDiv);
        this.generateResult.innerHTML = beforeClosing + actionsHtml + afterClosing;
      } else {
        this.generateResult.innerHTML += actionsHtml;
      }
      
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
      const recipesTableContainer = document.getElementById('recipesTableContainer');
      const emptyState = document.getElementById('emptyState');
      
      if (!recipesTableContainer && !emptyState) {
        console.error('❌ Recipe containers not found');
        return;
      }
      
      // Show loading state in table body
      const tableBody = document.getElementById('recipesTableBody');
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: var(--space-8);">
              <div>
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--color-muted); margin-bottom: 1rem;"></i>
                <p style="color: var(--color-muted);">Loading recipes...</p>
              </div>
            </td>
          </tr>
        `;
      }
      
      const response = await fetch('/admin/recipes', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      const data = await response.json();
      console.log('📊 Full recipe response:', data);
      console.log('🔍 Recipe data structure:', data.recipes?.[0]);
      console.log('📈 Recipe count:', data.recipes?.length || 0);
      
      // Store recipes in class properties
      this.recipes = data.recipes || [];
      this.filteredRecipes = [...this.recipes];
      
      console.log('💾 Stored recipes count:', this.recipes.length);
      
      if (!this.recipes || this.recipes.length === 0) {
        console.log('📭 No recipes found, showing empty state');
        this.showEmptyState();
        return;
      }
      
      console.log('🎯 Proceeding to render recipes table');
      
      // Sort recipes by latest added (dateModified descending) by default
      this.filteredRecipes.sort((a, b) => {
        const dateA = new Date(a.dateModified || 0);
        const dateB = new Date(b.dateModified || 0);
        return dateB - dateA; // Latest first
      });

      this.renderRecipesTable();
    } catch (error) {
      console.error('Failed to load recipes:', error);
      this.showEmptyState();
    }
  }

  showEmptyState() {
    const recipesTableContainer = document.getElementById('recipesTableContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (recipesTableContainer) recipesTableContainer.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
  }

  renderRecipesTable() {
    console.log('🖼️ Rendering recipes table with', this.filteredRecipes.length, 'recipes');
    
    const recipesTableContainer = document.getElementById('recipesTableContainer');
    const emptyState = document.getElementById('emptyState');
    const tableBody = document.getElementById('recipesTableBody');
    
    console.log('🔍 Table elements found:', {
      recipesTableContainer: !!recipesTableContainer,
      emptyState: !!emptyState,
      tableBody: !!tableBody
    });
    
    if (!tableBody) {
      console.error('❌ Table body not found!');
      return;
    }
    
    if (recipesTableContainer) recipesTableContainer.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    
    // Render table rows with minimalistic action buttons
    tableBody.innerHTML = this.filteredRecipes.map(recipe => `
      <tr class="recipe-row" data-recipe-id="${recipe.id || recipe.idMeal}">
        <td class="col-image">
          ${recipe.strMealThumb ? 
            `<img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" class="recipe-thumb-table">` : 
            '<div class="recipe-thumb-placeholder-table">📸</div>'
          }
        </td>
        <td class="col-name">
          <div class="recipe-name-table">${recipe.strMeal || 'Unnamed Recipe'}</div>
        </td>
        <td class="col-category">
          <span class="badge-table category-badge-table">${recipe.strCategory || 'Uncategorized'}</span>
        </td>
        <td class="col-cuisine">
          <span class="badge-table cuisine-badge-table">${recipe.strArea || 'Unknown'}</span>
        </td>
        <td class="col-date">
          <div class="date-table">${recipe.dateModified ? new Date(recipe.dateModified).toLocaleDateString() : 'Unknown'}</div>
        </td>
        <td class="col-status">
          <span class="status-badge-table status-active">Published</span>
        </td>
        <td class="col-actions">
          <div class="action-buttons-table">
            <button class="btn-action-icon btn-view" data-tooltip="View Recipe" data-recipe-id="${recipe.id || recipe.idMeal}">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn-action-icon btn-edit" data-tooltip="Edit Recipe" data-recipe-id="${recipe.id || recipe.idMeal}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-action-icon btn-delete" data-tooltip="Delete Recipe" data-recipe-id="${recipe.id || recipe.idMeal}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
      `).join('');
      
    console.log('✅ Table HTML generated, setting up event listeners');
    
    // Add event listeners for the new minimalistic action buttons
      this.setupRecipeActionListeners();
    
    console.log('🎉 Recipes table rendered successfully!');
  }
  
  // Setup event listeners for recipe action buttons (dynamically created)
  setupRecipeActionListeners() {
    // Remove existing listeners to prevent duplicates by re-attaching
    document.querySelectorAll('.btn-action-icon').forEach(btn => {
      btn.replaceWith(btn.cloneNode(true));
    });
    
    // Add view recipe listeners
    document.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const recipeId = e.currentTarget.getAttribute('data-recipe-id');
        console.log('🔍 View recipe clicked, ID:', recipeId);
        await this.viewRecipeComprehensive(recipeId);
      });
    });
    
    // Add edit recipe listeners
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const recipeId = e.currentTarget.getAttribute('data-recipe-id');
        console.log('✏️ Edit recipe clicked, ID:', recipeId);
        await this.viewRecipeComprehensive(recipeId); // Opens comprehensive view in edit mode
      });
    });
    
    // Add delete recipe listeners  
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const recipeId = e.currentTarget.getAttribute('data-recipe-id');
        console.log('🗑️ Delete recipe clicked, ID:', recipeId);
        
        // Show confirmation dialog
        if (confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
          await this.deleteRecipe(recipeId);
        }
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
      console.log('👁️ Opening comprehensive view for recipe ID:', recipeId);
      
      // Fetch recipe data
      const response = await fetch(`/admin/recipes/${recipeId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch recipe: ${response.status}`);
      }
      
      const data = await response.json();
      const recipe = data.recipe || data;
      
      console.log('📊 Recipe data received:', recipe);
      
      // Check if comprehensive recipe display is available
      if (typeof window.recipeDisplay === 'undefined') {
        console.error('❌ Comprehensive recipe display not loaded');
        alert('Recipe display component not loaded. Please refresh the page.');
        return;
      }
      
      // Switch to recipe editor section and display the recipe
      this.switchSection('recipeEditor');
      
      // Get the container for comprehensive recipe display
      const container = document.getElementById('comprehensiveRecipeDisplayContainer');
      if (!container) {
        console.error('❌ Recipe display container not found');
        alert('Recipe display container not found.');
        return;
      }
      
      console.log('🖼️ Rendering recipe in comprehensive display');
      
      // Show loading state first
      container.innerHTML = `
        <div class="recipe-editor-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Loading recipe editor...</p>
        </div>
      `;
      
      // Use the comprehensive recipe display component
      try {
        if (window.recipeDisplay && typeof window.recipeDisplay.renderRecipe === 'function') {
          window.recipeDisplay.renderRecipe(recipe, container);
          console.log('✅ Recipe rendered successfully with comprehensive display');
        } else {
          // Fallback: render basic recipe display if comprehensive component not available
          console.log('⚠️ Comprehensive display not available, using fallback');
          this.renderBasicRecipeEditor(recipe, container);
        }
      } catch (error) {
        console.error('❌ Error rendering recipe:', error);
        // Show error state with recipe data
        container.innerHTML = `
          <div class="recipe-editor-error">
            <h3>🚨 Recipe Display Error</h3>
            <p>Unable to load the recipe editor component.</p>
            <details style="margin-top: var(--space-4);">
              <summary style="cursor: pointer; font-weight: bold;">View Recipe Data (Debug)</summary>
              <pre style="background: var(--color-surface); padding: var(--space-4); border-radius: var(--radius-lg); margin-top: var(--space-2); text-align: left; font-size: 12px; max-height: 300px; overflow: auto;">${JSON.stringify(recipe, null, 2)}</pre>
            </details>
            <button onclick="location.reload()" style="margin-top: var(--space-4); padding: var(--space-2) var(--space-4); background: var(--color-primary); color: white; border: none; border-radius: var(--radius-lg); cursor: pointer;">
              🔄 Refresh Page
            </button>
          </div>
        `;
      }
      
    } catch (error) {
      console.error('❌ Failed to view recipe:', error);
      alert('Failed to load recipe: ' + error.message);
    }
  }

  renderBasicRecipeEditor(recipe, container) {
    console.log('🎨 Rendering basic recipe editor');
    
    // Get ingredients
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipe[`strIngredient${i}`];
      const measure = recipe[`strMeasure${i}`];
      if (ingredient && ingredient.trim()) {
        ingredients.push(`${measure || ''} ${ingredient}`.trim());
      }
    }
    
    // Parse instructions
    let instructions = recipe.strInstructions || 'No instructions available';
    if (Array.isArray(instructions)) {
      instructions = instructions.join(' ');
    }
    
    // Split instructions into steps
    const steps = instructions.split(/(?:\d+\.|Step \d+:|\n\n)/)
      .map(step => step.trim())
      .filter(step => step.length > 10);
    
    container.innerHTML = `
      <div class="recipe-editor-content" style="background: var(--color-surface); padding: var(--space-6); border-radius: var(--radius-card); box-shadow: var(--shadow-lg); border: 2px solid var(--color-divider);">
        
        <!-- RECIPE HEADER WITH VISUAL EMPHASIS -->
        <div class="recipe-editor-header" style="background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-600, #4F46E5) 100%); color: white; padding: var(--space-6); border-radius: var(--radius-card); margin-bottom: var(--space-6); box-shadow: var(--shadow-md);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 style="font-size: 2.5rem; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🍽️ ${recipe.strMeal || 'Unnamed Recipe'}</h1>
              <p style="margin: var(--space-2) 0 0 0; font-size: 1.1rem; opacity: 0.9;">Professional Recipe Editor</p>
            </div>
            <button class="btn btn-secondary" onclick="adminPanel.switchSection('allRecipes')" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: var(--space-3) var(--space-5); border-radius: var(--radius-lg); font-weight: 600; backdrop-filter: blur(10px);">
              <i class="fas fa-arrow-left"></i> Back to Recipes
            </button>
          </div>
        </div>
        
        <!-- VISUAL GRID LAYOUT WITH ENHANCED BOXES -->
        <div class="recipe-details-grid" style="display: grid; gap: var(--space-6); grid-template-columns: 1fr 1fr; margin-bottom: var(--space-6);">
          
          <!-- RECIPE INFO BOX -->
          <div class="recipe-info-card" style="background: var(--color-surface); padding: var(--space-6); border-radius: var(--radius-card); border: 2px solid var(--color-primary); box-shadow: var(--shadow-lg); position: relative; overflow: hidden;">
            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-600, #4F46E5) 100%);"></div>
            <h3 style="margin: 0 0 var(--space-4) 0; color: var(--color-text); display: flex; align-items: center; gap: var(--space-2); font-size: 1.5rem; font-weight: 600;">
              📊 Recipe Information
            </h3>
            <div style="display: grid; gap: var(--space-3);">
              <div style="display: flex; justify-content: space-between; padding: var(--space-2); background: var(--color-input-bg); border-radius: var(--radius-lg); border-left: 4px solid var(--color-primary);">
                <strong style="color: var(--color-text);">Category:</strong> 
                <span style="color: var(--color-muted); font-weight: 500;">${recipe.strCategory || 'Not specified'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: var(--space-2); background: var(--color-input-bg); border-radius: var(--radius-lg); border-left: 4px solid var(--color-primary);">
                <strong style="color: var(--color-text);">Cuisine:</strong> 
                <span style="color: var(--color-muted); font-weight: 500;">${recipe.strArea || 'Not specified'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: var(--space-2); background: var(--color-input-bg); border-radius: var(--radius-lg); border-left: 4px solid var(--color-primary);">
                <strong style="color: var(--color-text);">Prep Time:</strong> 
                <span style="color: var(--color-muted); font-weight: 500;">${recipe.prepTime || 'Not specified'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: var(--space-2); background: var(--color-input-bg); border-radius: var(--radius-lg); border-left: 4px solid var(--color-primary);">
                <strong style="color: var(--color-text);">Cook Time:</strong> 
                <span style="color: var(--color-muted); font-weight: 500;">${recipe.cookTime || 'Not specified'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: var(--space-2); background: var(--color-input-bg); border-radius: var(--radius-lg); border-left: 4px solid var(--color-primary);">
                <strong style="color: var(--color-text);">Servings:</strong> 
                <span style="color: var(--color-muted); font-weight: 500;">${recipe.servings || 'Not specified'}</span>
              </div>
            </div>
          </div>
          
          <!-- RECIPE IMAGE BOX -->
          <div class="recipe-image-card" style="background: var(--color-surface); padding: var(--space-6); border-radius: var(--radius-card); border: 2px solid var(--color-divider); box-shadow: var(--shadow-lg); text-align: center; position: relative; overflow: hidden;">
            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--color-success, #10B981) 0%, var(--color-success-600, #059669) 100%);"></div>
            <h3 style="margin: 0 0 var(--space-4) 0; color: var(--color-text); font-size: 1.5rem; font-weight: 600;">🖼️ Recipe Image</h3>
            ${recipe.strMealThumb ? 
              `<img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" style="width: 100%; max-width: 300px; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); border: 3px solid var(--color-divider);">` :
              `<div style="width: 100%; height: 200px; background: linear-gradient(135deg, var(--color-input-bg) 0%, var(--color-divider) 100%); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: var(--color-muted); font-size: 4rem; border: 2px dashed var(--color-divider);">🍽️</div>`
            }
          </div>
        </div>
        
        <!-- INGREDIENTS BOX WITH ENHANCED VISUAL STYLING -->
        <div class="ingredients-card" style="background: var(--color-surface); padding: var(--space-6); border-radius: var(--radius-card); border: 2px solid var(--color-success, #10B981); box-shadow: var(--shadow-lg); margin-bottom: var(--space-6); position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--color-success, #10B981) 0%, var(--color-success-600, #059669) 100%);"></div>
          <h3 style="margin: 0 0 var(--space-4) 0; color: var(--color-text); display: flex; align-items: center; gap: var(--space-2); font-size: 1.5rem; font-weight: 600;">
            🥄 Ingredients (${ingredients.length} items)
          </h3>
          <div class="ingredients-list" style="display: grid; gap: var(--space-3);">
            ${ingredients.map((ingredient, index) => `
              <div style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4); background: var(--color-input-bg); border-radius: var(--radius-lg); border: 1px solid var(--color-divider); box-shadow: var(--shadow-sm); transition: transform 0.2s ease;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">
                <span style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: var(--color-success, #10B981); color: white; border-radius: 50%; font-size: 14px; font-weight: 600; flex-shrink: 0;">${index + 1}</span>
                <span style="flex: 1; color: var(--color-text); font-weight: 500; font-size: 1.1rem;">${ingredient}</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- INSTRUCTIONS BOX WITH ENHANCED VISUAL STYLING -->
        <div class="instructions-card" style="background: var(--color-surface); padding: var(--space-6); border-radius: var(--radius-card); border: 2px solid var(--color-warning, #F59E0B); box-shadow: var(--shadow-lg); margin-bottom: var(--space-6); position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--color-warning, #F59E0B) 0%, var(--color-warning-600, #D97706) 100%);"></div>
          <h3 style="margin: 0 0 var(--space-4) 0; color: var(--color-text); display: flex; align-items: center; gap: var(--space-2); font-size: 1.5rem; font-weight: 600;">
            📝 Instructions (${steps.length > 0 ? steps.length : 1} steps)
          </h3>
          <div class="instructions-list" style="display: grid; gap: var(--space-4);">
            ${steps.length > 0 ? 
              steps.map((step, index) => `
                <div style="display: flex; gap: var(--space-4); padding: var(--space-4); background: var(--color-input-bg); border-radius: var(--radius-lg); border: 1px solid var(--color-divider); box-shadow: var(--shadow-sm); transition: transform 0.2s ease;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">
                  <span style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: var(--color-warning, #F59E0B); color: white; border-radius: 50%; font-size: 16px; font-weight: 700; flex-shrink: 0; box-shadow: var(--shadow-md);">${index + 1}</span>
                  <span style="flex: 1; line-height: 1.6; color: var(--color-text); font-size: 1.1rem; padding-top: 8px;">${step}</span>
                </div>
              `).join('') :
              `<div style="padding: var(--space-6); text-align: center; background: var(--color-input-bg); border-radius: var(--radius-lg); border: 2px dashed var(--color-divider);">
                <p style="color: var(--color-muted); font-size: 1.1rem; margin: 0;">${instructions}</p>
              </div>`
            }
          </div>
        </div>
        
        ${recipe.strDescription ? `
          <!-- DESCRIPTION BOX -->
          <div class="description-card" style="background: var(--color-surface); padding: var(--space-6); border-radius: var(--radius-card); border: 2px solid var(--color-info, #3B82F6); box-shadow: var(--shadow-lg); position: relative; overflow: hidden;">
            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--color-info, #3B82F6) 0%, var(--color-info-600, #2563EB) 100%);"></div>
            <h3 style="margin: 0 0 var(--space-4) 0; color: var(--color-text); display: flex; align-items: center; gap: var(--space-2); font-size: 1.5rem; font-weight: 600;">📖 Description</h3>
            <p style="line-height: 1.8; color: var(--color-text); font-size: 1.1rem; margin: 0; padding: var(--space-4); background: var(--color-input-bg); border-radius: var(--radius-lg); border-left: 4px solid var(--color-info, #3B82F6);">${recipe.strDescription}</p>
          </div>
        ` : ''}
        
        <!-- FOOTER WITH METADATA -->
        <div style="margin-top: var(--space-8); padding: var(--space-4); background: var(--color-input-bg); border-radius: var(--radius-lg); border: 1px solid var(--color-divider); text-align: center;">
          <p style="color: var(--color-muted); margin: 0; font-size: 0.9rem;">
            <strong>Recipe ID:</strong> ${recipe.idMeal || 'Generated'} | 
            <strong>Source:</strong> ${recipe.strSource || 'AI Generated'} | 
            <strong>Loaded:</strong> ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `;
  }

  async deleteAllRecipes() {
    const confirmation = prompt('⚠️ DANGER: This will delete ALL recipes from the database permanently!\n\nType "DELETE ALL RECIPES" to confirm:');
    
    if (confirmation !== 'DELETE ALL RECIPES') {
      alert('❌ Action cancelled. You must type "DELETE ALL RECIPES" exactly to confirm.');
      return;
    }
    
    const finalConfirmation = confirm('🚨 FINAL WARNING: This action cannot be undone!\n\nAre you absolutely sure you want to delete ALL recipes?');
    if (!finalConfirmation) return;
    
    try {
      const response = await fetch('/admin/recipes/delete-all', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(`✅ Success! Deleted ${data.deletedCount || 'all'} recipes from the database.`);
        this.loadRecipes(); // Reload the recipes list
      } else {
        alert(`❌ Error: ${data.message || 'Failed to delete recipes'}`);
      }
    } catch (error) {
      console.error('❌ Error deleting all recipes:', error);
      alert('❌ Network error: Failed to delete recipes');
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
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
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

  setupFilterButtons() {
    // Setup generation filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.currentTarget;
        button.classList.toggle('active');
        
        // Update filter selections based on data attributes
        const category = button.dataset.category;
        const dishType = button.dataset.dishtype;
        const cuisine = button.dataset.cuisine;
        const dietary = button.dataset.dietary;
        
        const isActive = button.classList.contains('active');
        
        if (category) {
          if (isActive) {
            this.generationFilters.categories.add(category);
          } else {
            this.generationFilters.categories.delete(category);
          }
          console.log('🍽️ Category filter:', category, isActive ? 'added' : 'removed');
        }
        
        if (dishType) {
          if (isActive) {
            this.generationFilters.dishTypes.add(dishType);
          } else {
            this.generationFilters.dishTypes.delete(dishType);
          }
          console.log('🍴 Dish type filter:', dishType, isActive ? 'added' : 'removed');
        }
        
        if (cuisine) {
          if (isActive) {
            this.generationFilters.cuisines.add(cuisine);
          } else {
            this.generationFilters.cuisines.delete(cuisine);
          }
          console.log('🌍 Cuisine filter:', cuisine, isActive ? 'added' : 'removed');
        }
        
        if (dietary) {
          if (isActive) {
            this.generationFilters.dietary.add(dietary);
          } else {
            this.generationFilters.dietary.delete(dietary);
          }
          console.log('🥗 Dietary filter:', dietary, isActive ? 'added' : 'removed');
        }
        
        console.log('📊 Current filters:', {
          categories: Array.from(this.generationFilters.categories),
          dishTypes: Array.from(this.generationFilters.dishTypes),
          cuisines: Array.from(this.generationFilters.cuisines),
          dietary: Array.from(this.generationFilters.dietary)
        });
      });
    });
  }

  setupSortingHandlers() {
    document.querySelectorAll('.sortable').forEach(header => {
      header.addEventListener('click', (e) => {
        const column = e.currentTarget.dataset.sort;
        this.sortTable(column);
      });
    });
  }

  sortTable(column) {
    // Remove existing sort classes
    document.querySelectorAll('.sortable').forEach(header => {
      header.classList.remove('sort-asc', 'sort-desc');
    });

    // Determine sort direction
    let direction = 'asc';
    if (this.currentSort.column === column && this.currentSort.direction === 'asc') {
      direction = 'desc';
    }

    this.currentSort = { column, direction };

    // Add sort class to current header
    const currentHeader = document.querySelector(`[data-sort="${column}"]`);
    if (currentHeader) {
      currentHeader.classList.add(`sort-${direction}`);
    }

    // Sort the recipes array
    this.filteredRecipes.sort((a, b) => {
      let aVal = '';
      let bVal = '';

      switch (column) {
        case 'name':
          aVal = (a.strMeal || '').toLowerCase();
          bVal = (b.strMeal || '').toLowerCase();
          break;
        case 'category':
          aVal = (a.strCategory || '').toLowerCase();
          bVal = (b.strCategory || '').toLowerCase();
          break;
        case 'cuisine':
          aVal = (a.strArea || '').toLowerCase();
          bVal = (b.strArea || '').toLowerCase();
          break;
        case 'date':
          aVal = new Date(a.dateModified || 0);
          bVal = new Date(b.dateModified || 0);
          break;
        case 'status':
          aVal = 'published'; // All recipes are published for now
          bVal = 'published';
          break;
        default:
          return 0;
      }

      if (column === 'date') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      } else {
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      }
    });

    // Re-render the table
    this.renderRecipesTable();
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