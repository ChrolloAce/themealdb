class AdminPanel {
  constructor() {
    this.token = this.getStoredToken();
    this.currentSection = 'allRecipes';
    this.currentSort = { column: null, direction: 'asc' };
    this.recipes = [];
    this.filteredRecipes = [];
    
    // ✅ Pagination state
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalRecipes = 0;
    this.recipesPerPage = 50;
    
    this.initializeElements();
    this.setupEventListeners();
    this.checkAuthentication();
    this.setupNumberAdjustButtons();
    this.setupStepperButtons();
    this.setupFilterButtons();
    this.setupSortingHandlers();
    this.setupPaginationHandlers();
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
      dietary: new Set(),
      difficulty: new Set()
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
        this.loadRecipes();
      
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
      this.loadRecipes();
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
    
    document.querySelectorAll('.difficulty-filter').forEach(btn => {
      btn.addEventListener('click', () => this.toggleGenerationFilter('difficulty', btn.dataset.difficulty, btn));
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
    this.generationFilters.difficulty.clear();
    
    // Remove active class from all filter buttons
    document.querySelectorAll('.filter-btn-small.active, .filter-btn.active').forEach(btn => {
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
        this.loadRecipes();
        
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
        this.loadRecipes();
        
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
      case 'allRecipes':
        this.loadRecipes();
        break;
      case 'generate':
        // Load recipe counts for generation filters
        this.updateGenerationFilterCounts();
        break;
      case 'jsonViewer':
        this.loadJsonViewer();
        break;
      case 'coverageMatrix':
        this.loadCoverageMatrix();
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
        'generate': 'AI Recipe Generator',
        'allRecipes': 'All Recipes',
        'jsonViewer': 'JSON Viewer',
        'coverageMatrix': 'Recipe Coverage Matrix',
        'recipeEditor': 'Recipe Editor'
      };
      titleElement.textContent = titles[sectionName] || 'All Recipes';
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
        
        // Try to parse as JSON, but if it fails, try to extract logs from text
        let data;
        let logs = [];
        let errorMessage = null;
        
        try {
          const responseText = await response.text();
          
          // Try to parse as JSON
          try {
            data = JSON.parse(responseText);
            logs = data.logs || [];
          } catch (jsonError) {
            // JSON parsing failed - try to extract logs from the error response
            errorMessage = `JSON parsing error: ${jsonError.message}`;
            
            console.error('Failed to parse JSON response:', responseText);
            
            // Show the error message
            this.showError(this.generateResult, errorMessage);
            
            // Try multiple strategies to extract logs from malformed JSON
            // Strategy 1: Look for "logs" array in the response
            const logsPatterns = [
              /"logs"\s*:\s*\[([\s\S]*?)\]/g,  // Standard JSON format
              /logs["\s]*:[\s]*\[([\s\S]*?)\]/g,  // Without quotes
              /"logs"\s*:\s*\[([^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*)\]/g  // Nested arrays
            ];
            
            for (const pattern of logsPatterns) {
              const matches = [...responseText.matchAll(pattern)];
              if (matches.length > 0) {
                for (const match of matches) {
                  try {
                    // Try to parse the logs array content
                    const logsContent = '[' + match[1] + ']';
                    const parsedLogs = JSON.parse(logsContent);
                    if (Array.isArray(parsedLogs) && parsedLogs.length > 0) {
                      logs = parsedLogs;
                      console.log(`✅ Extracted ${logs.length} logs from error response`);
                      break;
                    }
                  } catch (e) {
                    // Try next pattern
                    continue;
                  }
                }
                if (logs.length > 0) break;
              }
            }
            
            // Strategy 2: If no logs found, try to find any JSON-like structure
            if (logs.length === 0) {
              // Look for any array-like structure that might contain log objects
              const arrayMatch = responseText.match(/\[[\s\S]*?\{[\s\S]*?"timestamp"[\s\S]*?\}[\s\S]*?\]/);
              if (arrayMatch) {
                try {
                  const potentialLogs = JSON.parse(arrayMatch[0]);
                  if (Array.isArray(potentialLogs) && potentialLogs.length > 0 && potentialLogs[0].timestamp) {
                    logs = potentialLogs;
                    console.log(`✅ Extracted ${logs.length} logs using fallback method`);
                  }
                } catch (e) {
                  // Not valid logs
                }
              }
            }
            
            // Always show logs if we found any
            if (logs && logs.length > 0) {
              this.displayGenerationLogs(logs);
            } else {
              // Show raw response snippet for debugging if no logs found
              const errorDetails = document.createElement('div');
              errorDetails.style.cssText = 'margin-top: 20px; padding: 15px; background: #fee; border: 1px solid #fcc; border-radius: 5px; font-family: monospace; font-size: 12px; max-height: 300px; overflow: auto;';
              errorDetails.innerHTML = `<strong>Raw response (first 2000 chars):</strong><br><pre>${this.escapeHtml(responseText.substring(0, 2000))}</pre>`;
              this.generateResult.appendChild(errorDetails);
            }
            
            return; // Exit early since we can't parse the response
          }
        } catch (textError) {
          // Even reading as text failed
          this.showError(this.generateResult, `Failed to read response: ${textError.message}`);
          return;
        }
        
        if (data.success) {
          // Pass all image URLs to display function
          const recipe = data.recipe;
          if (data.imageUrls && data.imageUrls.length > 0) {
            recipe.additionalImages = data.imageUrls;
          }
          this.displayRecipeResult(recipe, data.imageUrl, false, null, data.logs);
          
          // Show warning if image generation failed
          if (data.warning) {
            this.showError(this.generateResult, data.warning);
          } else {
            const imageText = data.imageCount > 1 ? `with ${data.imageCount} images` : '';
            this.showSuccess(this.generateResult, `🎉 Recipe generated successfully ${imageText}!`);
          }
          
          // Update filter counts after generation
          this.updateGenerationFilterCounts();
        } else {
          this.showError(this.generateResult, data.message || 'Generation failed');
          // Show logs even on failure
          if (data.logs && data.logs.length > 0) {
            this.displayGenerationLogs(data.logs);
          }
        }
      } catch (error) {
        // Network or other errors
        this.showError(this.generateResult, `Network error: ${error.message}`);
        console.error('Full error details:', error);
      }
    }
  }

  // Handle batch generation from main form
  async handleBatchGenerateFromForm(baseParams) {
    const batchCount = baseParams.batchCount;
    const randomize = baseParams.randomizeSettings;
    
    // 🔍 DEBUG: Log batch params
    console.log('🔥 BATCH GENERATION PARAMS:', {
      batchCount,
      generateImage: baseParams.generateImage,
      imageCount: baseParams.imageCount
    });
    
    this.showLoading(this.generateResult, `🔥 Generating ${batchCount} recipes...`);
    
    const recipes = [];
    const cuisines = ['Italian', 'Mexican', 'Chinese', 'Japanese', 'Indian', 'French', 'American', 'Mediterranean'];
    const categories = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
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
        // 🔍 DEBUG: Log individual request
        console.log(`📤 Sending recipe ${i + 1}/${batchCount} with params:`, {
          generateImage: recipeParams.generateImage,
          imageCount: recipeParams.imageCount
        });
        
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
    
    // Update filter counts after batch generation
    this.updateGenerationFilterCounts();
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
        this.displayRecipeResult(data.recipe, data.imageUrl, false, null, data.logs);
        this.showSuccess(this.generateResult, `🎉 ${preset.charAt(0).toUpperCase() + preset.slice(1)} recipe generated!`);
      } else {
        this.showError(this.generateResult, data.message || 'Generation failed');
        if (data.logs && data.logs.length > 0) {
          this.displayGenerationLogs(data.logs);
        }
      }
    } catch (error) {
      this.showError(this.generateResult, `Failed to generate ${preset} recipe`);
    }
  }

  getGenerateFormData() {
    const randomMode = document.getElementById('randomMode')?.checked ?? true;
    const generateImage = document.getElementById('generateImage')?.checked ?? true;
    const recipeCount = parseInt(document.getElementById('generateRecipeCount')?.value) || 1;
    const imageCount = parseInt(document.getElementById('imageCount')?.value) || 1;
    
    // 🔍 DEBUG: Log toggle state
    console.log('🎛️ GENERATE IMAGE TOGGLE:', {
      element: document.getElementById('generateImage'),
      checked: generateImage,
      imageCount: imageCount
    });
    
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
        dietary: Array.from(this.generationFilters.dietary),
        difficulty: Array.from(this.generationFilters.difficulty)
      };
      
      return {
        ...baseParams,
        mode: 'filtered',
        filters: filters
      };
    }
  }

  displayRecipeResult(recipe, imageUrl = null, isPreview = false, imageQuality = null, logs = null) {
    const ingredients = this.getRecipeIngredients(recipe);
    
    // Parse instructions into steps
    // Check if instructions is already an array (modern format)
    let steps = [];
    if (recipe.instructions && Array.isArray(recipe.instructions)) {
      // Use the array directly - already split into steps
      steps = recipe.instructions.filter(step => step && step.trim());
    } else if (recipe.strInstructions) {
      // Fallback: parse string instructions
      const instructions = recipe.strInstructions;
      steps = instructions.split(/Step \d+:|^\d+\.|^\d+\)/gm)
        .filter(step => step.trim())
        .map(step => step.replace(/^[:.]/, '').trim());
    }
    
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
      <div style="background: white; border-radius: 20px; padding: 30px; box-shadow: 0 20px 50px rgba(0,0,0,0.15); border: 4px solid #10B981; margin: 30px auto; font-family: system-ui, -apple-system, sans-serif; color: #333; line-height: 1.6;">
        
        <!-- BIG SUCCESS HEADER -->
        <div style="background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 40px; border-radius: 15px; margin-bottom: 30px; text-align: center; box-shadow: 0 10px 30px rgba(16,185,129,0.3);">
          <div style="font-size: 80px; margin-bottom: 15px;">🎉</div>
          <h1 style="font-size: 48px; font-weight: bold; margin: 0; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">RECIPE READY!</h1>
          <p style="font-size: 20px; margin: 15px 0 0 0; color: white; opacity: 0.9;">${isPreview ? 'Preview Mode Active' : 'AI Generated Successfully'}</p>
        </div>
        
        <!-- RECIPE TITLE -->
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #e5e5e5;">
          <h2 style="font-size: 36px; font-weight: bold; color: #1a1a1a; margin: 0 0 20px 0;">🍽️ ${recipe.strMeal}</h2>
          ${imageUrl ? `
            <img src="${imageUrl}" alt="${recipe.strMeal}" style="max-width: 400px; width: 100%; height: 250px; object-fit: cover; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); border: 3px solid #e5e5e5;">
          ` : `
            <div style="width: 400px; height: 250px; background: linear-gradient(135deg, #f0f0f0, #e5e5e5); border-radius: 15px; display: flex; align-items: center; justify-content: center; font-size: 80px; color: #999; border: 3px dashed #ccc; margin: 0 auto;">🍽️</div>
          `}
        </div>
        
        <!-- INGREDIENTS SECTION -->
        <div style="background: white; border-radius: 15px; padding: 25px; margin-bottom: 25px; border: 3px solid #10B981; box-shadow: 0 5px 15px rgba(16,185,129,0.1);">
          <div style="background: #10B981; color: white; padding: 15px; border-radius: 10px; margin: -25px -25px 20px -25px;">
            <h3 style="margin: 0; font-size: 24px; font-weight: bold;">🥄 INGREDIENTS (${ingredients.length} items)</h3>
            </div>
          ${ingredients.map((ing, index) => `
            <div style="display: flex; align-items: center; padding: 15px; margin: 10px 0; background: #f8f9fa; border-radius: 10px; border-left: 4px solid #10B981; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
              <div style="background: #10B981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; font-size: 14px;">${index + 1}</div>
              <div style="font-size: 16px; font-weight: 500; color: #333;">${ing}</div>
          </div>
          `).join('')}
            </div>
        
        <!-- INSTRUCTIONS SECTION -->
        <div style="background: white; border-radius: 15px; padding: 25px; margin-bottom: 25px; border: 3px solid #F59E0B; box-shadow: 0 5px 15px rgba(245,158,11,0.1);">
          <div style="background: #F59E0B; color: white; padding: 15px; border-radius: 10px; margin: -25px -25px 20px -25px;">
            <h3 style="margin: 0; font-size: 24px; font-weight: bold;">📝 INSTRUCTIONS (${steps.length > 0 ? steps.length : 1} steps)</h3>
          </div>
          ${steps.length > 0 ? 
            steps.map((step, index) => `
              <div style="display: flex; align-items: flex-start; padding: 20px; margin: 15px 0; background: #fef3c7; border-radius: 10px; border-left: 4px solid #F59E0B; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <div style="background: #F59E0B; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; font-size: 16px; flex-shrink: 0;">${index + 1}</div>
                <div style="font-size: 16px; line-height: 1.6; color: #333; padding-top: 5px;">${step}</div>
            </div>
            `).join('') :
            `<div style="padding: 30px; text-align: center; background: #fef3c7; border-radius: 10px; border: 2px dashed #F59E0B;">
              <p style="font-size: 16px; color: #333; margin: 0; line-height: 1.6;">${recipe.strInstructions || 'No instructions provided.'}</p>
            </div>`
          }
        </div>
        
        <!-- RECIPE BADGES -->
        <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-bottom: 30px;">
          <span style="padding: 8px 16px; background: #6366f1; color: white; border-radius: 25px; font-size: 14px; font-weight: 600;">
            🏷️ ${recipe.strCategory || 'Uncategorized'}
          </span>
          <span style="padding: 8px 16px; background: #3b82f6; color: white; border-radius: 25px; font-size: 14px; font-weight: 600;">
            🌍 ${recipe.strArea || 'International'}
          </span>
          ${qualityBadge ? `<span style="padding: 8px 16px; background: #10B981; color: white; border-radius: 25px; font-size: 14px; font-weight: 600;">${qualityBadge}</span>` : ''}
        </div>
        
        <!-- STATS BAR -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-bottom: 30px;">
          <div style="text-align: center; padding: 20px; background: white; border-radius: 12px; border: 2px solid #e5e5e5; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
            <div style="font-size: 2.5em; margin-bottom: 8px;">⏱️</div>
            <div style="font-size: 11px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Prep</div>
            <div style="font-size: 16px; font-weight: bold; color: #333;">${recipe.prepTime || '15 min'}</div>
          </div>
          <div style="text-align: center; padding: 20px; background: white; border-radius: 12px; border: 2px solid #e5e5e5; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
            <div style="font-size: 2.5em; margin-bottom: 8px;">🔥</div>
            <div style="font-size: 11px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Cook</div>
            <div style="font-size: 16px; font-weight: bold; color: #333;">${recipe.cookTime || '30 min'}</div>
          </div>
          <div style="text-align: center; padding: 20px; background: white; border-radius: 12px; border: 2px solid #e5e5e5; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
            <div style="font-size: 2.5em; margin-bottom: 8px;">🍽️</div>
            <div style="font-size: 11px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Serves</div>
            <div style="font-size: 16px; font-weight: bold; color: #333;">${recipe.servings || '4'}</div>
          </div>
          <div style="text-align: center; padding: 20px; background: white; border-radius: 12px; border: 2px solid #e5e5e5; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
            <div style="font-size: 2.5em; margin-bottom: 8px;">📊</div>
            <div style="font-size: 11px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Level</div>
            <div style="font-size: 16px; font-weight: bold; color: #333;">${recipe.difficulty || 'Medium'}</div>
          </div>
          <div style="text-align: center; padding: 20px; background: white; border-radius: 12px; border: 2px solid #e5e5e5; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
            <div style="font-size: 2.5em; margin-bottom: 8px;">🍳</div>
            <div style="font-size: 11px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Dish Type</div>
            <div style="font-size: 16px; font-weight: bold; color: #333;">${recipe.dishType || 'Main Course'}</div>
          </div>
          <div style="text-align: center; padding: 20px; background: white; border-radius: 12px; border: 2px solid #e5e5e5; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
            <div style="font-size: 2.5em; margin-bottom: 8px;">🥗</div>
            <div style="font-size: 11px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Dietary</div>
            <div style="font-size: 12px; font-weight: bold; color: #333;">${this.formatDietaryInfo(recipe.dietary)}</div>
          </div>
        </div>
        
        ${recipe.strDescription ? `
          <!-- DESCRIPTION -->
          <div style="background: white; border-radius: 15px; padding: 25px; margin-bottom: 25px; border: 3px solid #3b82f6; box-shadow: 0 5px 15px rgba(59,130,246,0.1);">
            <div style="background: #3b82f6; color: white; padding: 15px; border-radius: 10px; margin: -25px -25px 20px -25px;">
              <h3 style="margin: 0; font-size: 20px; font-weight: bold;">📖 DESCRIPTION</h3>
            </div>
            <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0;">${recipe.strDescription}</p>
          </div>
        ` : ''}
      </div>
    `;
    
    // Add action buttons if not preview
    if (!isPreview) {
      this.generateResult.innerHTML += `
        <!-- ACTION BUTTONS -->
        <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-top: 30px; padding-top: 25px; border-top: 3px solid #e5e5e5;">
          <button id="saveRecipeBtn" style="padding: 15px 25px; background: #6366f1; color: white; border: none; border-radius: 12px; cursor: pointer; font-size: 16px; font-weight: bold; box-shadow: 0 4px 10px rgba(99,102,241,0.3); transition: all 0.2s ease;">
            💾 Save to Database
          </button>
          <button onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(recipe).replace(/"/g, '&quot;')}, null, 2)); alert('Recipe data copied to clipboard!');" style="padding: 15px 25px; background: #3b82f6; color: white; border: none; border-radius: 12px; cursor: pointer; font-size: 16px; font-weight: bold; box-shadow: 0 4px 10px rgba(59,130,246,0.3); transition: all 0.2s ease;">
            📋 Copy Data
          </button>
          <button onclick="adminPanel.generateRecipe()" style="padding: 15px 25px; background: #10B981; color: white; border: none; border-radius: 12px; cursor: pointer; font-size: 16px; font-weight: bold; box-shadow: 0 4px 10px rgba(16,185,129,0.3); transition: all 0.2s ease;">
            🎲 Generate Another
          </button>
        </div>
      `;
      
      document.getElementById('saveRecipeBtn').addEventListener('click', () => this.saveGeneratedRecipe(recipe));
      
      // Add generation logs section if logs are available
      if (logs && logs.length > 0) {
        this.displayGenerationLogs(logs);
      }
    }
  }

  displayGenerationLogs(logs) {
    if (!logs || logs.length === 0) return;
    
    const logsHtml = `
      <!-- GENERATION LOGS -->
      <div style="margin-top: 40px; padding-top: 30px; border-top: 3px solid #e5e5e5;">
        <div style="background: #1a1a1a; border-radius: 15px; padding: 25px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
            <h3 style="margin: 0; color: #fff; font-size: 20px; font-weight: bold;">
              📋 Generation Log
            </h3>
            <span style="background: #3b82f6; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
              ${logs.length} entries
            </span>
          </div>
          
          <div style="max-height: 600px; overflow-y: auto; font-family: 'Monaco', 'Menlo', 'Courier New', monospace; font-size: 13px; line-height: 1.6;">
            ${logs.map((log, index) => {
              const time = new Date(log.timestamp).toLocaleTimeString();
              const levelColor = log.level === 'error' ? '#ef4444' : '#10b981';
              const levelIcon = log.level === 'error' ? '❌' : 'ℹ️';
              
              return `
                <div style="padding: 8px 0; border-bottom: 1px solid #333; color: #d4d4d4;">
                  <span style="color: #6b7280; font-size: 11px; margin-right: 10px;">[${time}]</span>
                  <span style="color: ${levelColor}; margin-right: 8px;">${levelIcon}</span>
                  <span style="white-space: pre-wrap; word-wrap: break-word;">${this.escapeHtml(log.message)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    
    this.generateResult.innerHTML += logsHtml;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
        this.displayRecipeResult(data.recipe, data.imageUrl, false, null, data.logs);
        this.showSuccess(this.generateResult, `Recipe "${name}" created successfully!`);
      } else {
        this.showError(this.generateResult, data.message || 'Recipe creation failed');
        if (data.logs && data.logs.length > 0) {
          this.displayGenerationLogs(data.logs);
        }
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
  async loadRecipes(page = this.currentPage, forceLoadAll = false) {
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
      
      // ✅ Decide whether to load all recipes or just one page
      const cacheBust = `t=${Date.now()}`;
      let paginationParams;
      
      if (forceLoadAll || page === 1) {
        // Load ALL recipes for filtering (on first load or when forced)
        paginationParams = `limit=9999`;
        console.log('📦 Loading ALL recipes for filtering');
      } else {
        // Load specific page (server-side pagination)
        paginationParams = `page=${page}&limit=${this.recipesPerPage}`;
        console.log(`📄 Loading page ${page}`);
      }
      
      const response = await fetch(`/admin/recipes?${paginationParams}&${cacheBust}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      const data = await response.json();
      console.log('📊 Full recipe response:', data);
      console.log('🔍 Recipe data structure:', data.recipes?.[0]);
      console.log('📈 Recipe count:', data.recipes?.length || 0);
      console.log('📄 Pagination:', data.pagination);
      
      // ✅ Store ALL recipes for filtering
      this.recipes = data.recipes || [];
      this.filteredRecipes = [...this.recipes];
      
      // ✅ Store pagination data
      if (data.pagination) {
        this.currentPage = data.pagination.page;
        this.totalPages = data.pagination.pages;
        this.totalRecipes = data.pagination.total;
      }
      
      console.log('💾 Stored recipes count:', this.recipes.length);
      console.log(`📄 Page ${this.currentPage} of ${this.totalPages} (${this.totalRecipes} total recipes)`);
      
      if (!this.recipes || this.recipes.length === 0) {
        console.log('📭 No recipes found, showing empty state');
        this.showEmptyState();
        this.hidePagination();
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
      this.updatePagination(); // ✅ Update pagination UI
      this.populateFilterDropdowns();
      this.setupFilterListeners();
      this.updateRecipeCount();
    } catch (error) {
      console.error('Failed to load recipes:', error);
      this.showEmptyState();
    }
  }

  populateFilterDropdowns() {
    console.log('🔧 Populating filter dropdowns');
    
    // FIXED: Show ALL possible options, not just what exists in database
    const categories = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
    
    const dishTypes = [
      'Appetizers', 'Side Dishes', 'Main Courses', 'Soups', 'Salads', 
      'Sandwiches & Wraps', 'Burgers', 'Pizza & Flatbreads', 'Pasta & Noodles', 
      'Rice Dishes', 'Tacos, Burritos & Quesadillas', 'Stir-Fries', 'Curries', 
      'Stews & Casseroles', 'Skillet & One-Pan Meals', 'Slow Cooker / Instant Pot', 
      'Grilling / BBQ', 'Baked Goods', 'Pastries', 'Cookies & Bars', 
      'Pies & Cobblers', 'Frozen Treats', 'Pancakes & Waffles', 'Dips & Spreads',
      'Bowls', 'Drinks & Smoothies', 'Breads', 'Meal Prep', 'Boards & Platters',
      'Protein Dishes', 'Cakes & Cupcakes'
    ];
    
    const cuisines = [
      'American', 'Brazilian', 'British', 'Chinese', 'French', 'German', 
      'Greek', 'Indian', 'International', 'Italian', 'Japanese', 'Korean', 
      'Mediterranean', 'Mexican', 'Middle Eastern', 'Moroccan', 'Spanish', 
      'Thai', 'Vietnamese'
    ];
    
    // Get dietary options (these are objects with boolean values)
    const dietaryOptions = [
      'Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Low-Carb', 
      'High-Protein', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 
      'Low-Sodium', 'Low-Sugar', 'Mediterranean Diet'
    ];
    
    // Populate category dropdown
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.innerHTML = '<option value="">All Categories</option>' +
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }
    
    // Populate dish type dropdown
    const dishTypeFilter = document.getElementById('dishTypeFilter');
    if (dishTypeFilter) {
      dishTypeFilter.innerHTML = '<option value="">All Dish Types</option>' +
        dishTypes.map(dt => `<option value="${dt}">${dt}</option>`).join('');
    }
    
    // Populate cuisine dropdown
    const cuisineFilter = document.getElementById('cuisineFilter');
    if (cuisineFilter) {
      cuisineFilter.innerHTML = '<option value="">All Cuisines</option>' +
        cuisines.map(cui => `<option value="${cui}">${cui}</option>`).join('');
    }
    
    // Populate dietary dropdown
    const dietaryFilter = document.getElementById('dietaryFilter');
    if (dietaryFilter) {
      dietaryFilter.innerHTML = '<option value="">All Dietary</option>' +
        dietaryOptions.map(opt => `<option value="${opt.toLowerCase()}">${opt}</option>`).join('');
    }
    
    console.log('✅ Filters populated:', {
      categories: categories.length,
      dishTypes: dishTypes.length,
      cuisines: cuisines.length,
      dietary: dietaryOptions.length
    });
  }

  setupFilterListeners() {
    // Search input
    const searchInput = document.getElementById('recipeSearch');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.applyFilters());
    }
    
    // Filter dropdowns
    ['categoryFilter', 'dishTypeFilter', 'cuisineFilter', 'dietaryFilter', 'difficultyFilter'].forEach(filterId => {
      const filter = document.getElementById(filterId);
      if (filter) {
        filter.addEventListener('change', () => this.applyFilters());
      }
    });
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => this.clearAllFilters());
    }
    
    console.log('✅ Filter listeners set up');
  }

  applyFilters() {
    console.log('🔍 Applying filters...');
    
    const searchTerm = document.getElementById('recipeSearch')?.value.toLowerCase() || '';
    const categoryValue = document.getElementById('categoryFilter')?.value || '';
    const dishTypeValue = document.getElementById('dishTypeFilter')?.value || '';
    const cuisineValue = document.getElementById('cuisineFilter')?.value || '';
    const dietaryValue = document.getElementById('dietaryFilter')?.value || '';
    const difficultyValue = document.getElementById('difficultyFilter')?.value || '';
    
    this.filteredRecipes = this.recipes.filter(recipe => {
      // Search filter
      if (searchTerm) {
        const searchableText = [
          recipe.strMeal,
          recipe.strCategory,
          recipe.strArea,
          recipe.dishType,
          recipe.strDescription
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }
      
      // Category filter
      if (categoryValue && recipe.strCategory !== categoryValue) {
        return false;
      }
      
      // Dish type filter
      if (dishTypeValue && recipe.dishType !== dishTypeValue) {
        return false;
      }
      
      // Cuisine filter
      if (cuisineValue && recipe.strArea !== cuisineValue) {
        return false;
      }
      
      // Dietary filter
      if (dietaryValue && recipe.dietary) {
        const dietaryKey = dietaryValue.replace(/-/g, '');
        if (!recipe.dietary[dietaryKey]) {
          return false;
        }
      }
      
      // Difficulty filter
      if (difficultyValue && recipe.difficulty !== difficultyValue) {
        return false;
      }
      
      return true;
    });
    
    console.log(`✅ Filtered ${this.filteredRecipes.length} of ${this.recipes.length} recipes`);
    
    // ✅ Reset to page 1 when filters change
    this.currentPage = 1;
    
    this.updateRecipeCount();
    this.renderRecipesTable();
    this.updatePagination(); // ✅ Update pagination for filtered results
  }

  // ✅ Helper method to check if any filters are active
  hasActiveFilters() {
    const searchValue = document.getElementById('recipeSearch')?.value || '';
    const categoryValue = document.getElementById('categoryFilter')?.value || '';
    const dishTypeValue = document.getElementById('dishTypeFilter')?.value || '';
    const cuisineValue = document.getElementById('cuisineFilter')?.value || '';
    const dietaryValue = document.getElementById('dietaryFilter')?.value || '';
    const difficultyValue = document.getElementById('difficultyFilter')?.value || '';
    
    return !!(searchValue || categoryValue || dishTypeValue || cuisineValue || dietaryValue || difficultyValue);
  }

  updateRecipeCount() {
    const recipeCountEl = document.getElementById('recipeCount');
    if (recipeCountEl) {
      // ✅ Use totalRecipes from pagination, not current page count
      const totalCount = this.totalRecipes || this.recipes.length;
      
      if (this.hasActiveFilters()) {
        // Filters are active - show filtered count
        const filteredCount = this.filteredRecipes.length;
        recipeCountEl.textContent = `(${filteredCount} of ${totalCount})`;
        recipeCountEl.style.color = '#0066cc';
      } else {
        // No filters - just show total (pagination doesn't affect this)
        recipeCountEl.textContent = `(${totalCount})`;
        recipeCountEl.style.color = '#666';
      }
    }
  }

  clearAllFilters() {
    console.log('🧹 Clearing all filters');
    
    document.getElementById('recipeSearch').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('dishTypeFilter').value = '';
    document.getElementById('cuisineFilter').value = '';
    document.getElementById('dietaryFilter').value = '';
    document.getElementById('difficultyFilter').value = '';
    
    this.filteredRecipes = [...this.recipes];
    this.updateRecipeCount();
    this.renderRecipesTable();
  }

  // JSON Viewer functionality
  async loadJsonViewer() {
    console.log('🔍 Loading JSON Viewer');
    
    try {
      // Fetch all recipes
      const response = await fetch('/admin/recipes', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      const data = await response.json();
      this.jsonViewerRecipes = data.recipes || [];
      
      // Populate recipe dropdown
      const recipeSelect = document.getElementById('recipeSelectJson');
      if (recipeSelect) {
        recipeSelect.innerHTML = '<option value="">Select a specific recipe...</option>' +
          this.jsonViewerRecipes.map((recipe, index) => 
            `<option value="${index}">${recipe.strMeal || 'Unnamed Recipe'}</option>`
          ).join('');
      }
      
      // Setup event listeners
      const randomBtn = document.getElementById('randomJsonBtn');
      if (randomBtn) {
        randomBtn.addEventListener('click', () => this.showRandomRecipeJson());
      }
      
      if (recipeSelect) {
        recipeSelect.addEventListener('change', (e) => {
          const index = parseInt(e.target.value);
          if (!isNaN(index) && this.jsonViewerRecipes[index]) {
            this.displayRecipeJson(this.jsonViewerRecipes[index]);
          }
        });
      }
      
      const copyBtn = document.getElementById('copyJsonBtn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => this.copyJsonToClipboard());
      }
      
      console.log(`✅ JSON Viewer loaded with ${this.jsonViewerRecipes.length} recipes`);
      
    } catch (error) {
      console.error('❌ Failed to load JSON Viewer:', error);
    }
  }

  showRandomRecipeJson() {
    if (!this.jsonViewerRecipes || this.jsonViewerRecipes.length === 0) {
      alert('No recipes available');
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * this.jsonViewerRecipes.length);
    const randomRecipe = this.jsonViewerRecipes[randomIndex];
    
    // Update dropdown to show selected recipe
    const recipeSelect = document.getElementById('recipeSelectJson');
    if (recipeSelect) {
      recipeSelect.value = randomIndex;
    }
    
    this.displayRecipeJson(randomRecipe);
  }

  displayRecipeJson(recipe) {
    const jsonCode = document.getElementById('jsonCode');
    if (jsonCode) {
      // Pretty print JSON with syntax highlighting
      const jsonString = JSON.stringify(recipe, null, 2);
      jsonCode.textContent = jsonString;
      
      // Store current JSON for copying
      this.currentJson = jsonString;
      
      console.log('✅ Displaying JSON for:', recipe.strMeal);
    }
  }

  copyJsonToClipboard() {
    if (!this.currentJson) {
      alert('No JSON to copy. Please select or view a recipe first.');
      return;
    }
    
    navigator.clipboard.writeText(this.currentJson).then(() => {
      // Show success feedback
      const copyBtn = document.getElementById('copyJsonBtn');
      if (copyBtn) {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        copyBtn.style.background = '#059669';
        copyBtn.style.color = '#ffffff';
        
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
          copyBtn.style.background = '';
          copyBtn.style.color = '';
        }, 2000);
      }
      
      console.log('✅ JSON copied to clipboard');
    }).catch(err => {
      console.error('❌ Failed to copy:', err);
      alert('Failed to copy JSON to clipboard');
    });
  }

  async updateGenerationFilterCounts() {
    console.log('📊 Updating generation filter counts');
    
    try {
      // ✅ Fetch ALL recipes for accurate counting (not just page 1!)
      const response = await fetch('/admin/recipes?limit=9999', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      const data = await response.json();
      const recipes = data.recipes || [];
      
      console.log('📦 Loaded', recipes.length, 'total recipes for counting (not just page 1)');
      
      // Count categories (ONLY the 6 allowed ones)
      const allowedCategories = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
      const categoryCounts = {};
      recipes.forEach(r => {
        const cat = r.strCategory;
        if (cat && allowedCategories.includes(cat)) {
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
      });
      
      // Count dish types
      const dishTypeCounts = {};
      recipes.forEach(r => {
        const dt = r.dishType;
        if (dt) dishTypeCounts[dt] = (dishTypeCounts[dt] || 0) + 1;
      });
      
      // Count cuisines
      const cuisineCounts = {};
      recipes.forEach(r => {
        const cuisine = r.strArea;
        if (cuisine) cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
      });
      
      // Count dietary (these are objects with boolean values)
      const dietaryCounts = {
        'vegetarian': 0,
        'vegan': 0,
        'pescatarian': 0,
        'keto': 0,
        'lowCarb': 0,
        'highProtein': 0,
        'glutenFree': 0,
        'dairyFree': 0,
        'nutFree': 0,
        'lowSodium': 0,
        'lowSugar': 0,
        'mediterraneanDiet': 0
      };
      
      recipes.forEach(r => {
        if (r.dietary) {
          Object.keys(dietaryCounts).forEach(key => {
            if (r.dietary[key]) dietaryCounts[key]++;
          });
        }
      });
      
      // Update category buttons
      document.querySelectorAll('[data-category]').forEach(btn => {
        const category = btn.dataset.category;
        const count = categoryCounts[category] || 0;
        const text = btn.textContent.split('(')[0].trim();
        btn.innerHTML = `${text} <span style="opacity: 0.6; font-size: 0.875em;">(${count})</span>`;
      });
      
      // Update dish type buttons
      document.querySelectorAll('[data-dishtype]').forEach(btn => {
        const dishType = btn.dataset.dishtype;
        const count = dishTypeCounts[dishType] || 0;
        const text = btn.textContent.split('(')[0].trim();
        btn.innerHTML = `${text} <span style="opacity: 0.6; font-size: 0.875em;">(${count})</span>`;
      });
      
      // Update cuisine buttons
      document.querySelectorAll('[data-cuisine]').forEach(btn => {
        const cuisine = btn.dataset.cuisine;
        const count = cuisineCounts[cuisine] || 0;
        const text = btn.textContent.split('(')[0].trim();
        btn.innerHTML = `${text} <span style="opacity: 0.6; font-size: 0.875em;">(${count})</span>`;
      });
      
      // Update dietary buttons
      document.querySelectorAll('[data-dietary]').forEach(btn => {
        const dietary = btn.dataset.dietary;
        const dietaryKey = dietary.charAt(0).toLowerCase() + dietary.slice(1).replace(/[- ]/g, '');
        const count = dietaryCounts[dietaryKey] || 0;
        const text = btn.textContent.split('(')[0].trim();
        btn.innerHTML = `${text} <span style="opacity: 0.6; font-size: 0.875em;">(${count})</span>`;
      });
      
      console.log('✅ Filter counts updated:', {
        categories: Object.keys(categoryCounts).length,
        dishTypes: Object.keys(dishTypeCounts).length,
        cuisines: Object.keys(cuisineCounts).length,
        dietary: Object.values(dietaryCounts).filter(c => c > 0).length
      });
      
    } catch (error) {
      console.error('❌ Failed to update filter counts:', error);
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
    
    // ✅ Client-side pagination when filters are active
    let recipesToRender = this.filteredRecipes;
    if (this.hasActiveFilters()) {
      // Paginate filtered results on client-side
      const startIndex = (this.currentPage - 1) * this.recipesPerPage;
      const endIndex = startIndex + this.recipesPerPage;
      recipesToRender = this.filteredRecipes.slice(startIndex, endIndex);
      console.log(`📄 Client-side pagination: Showing ${startIndex + 1}-${Math.min(endIndex, this.filteredRecipes.length)} of ${this.filteredRecipes.length} filtered recipes`);
    }
    
    // Render table rows with minimalistic action buttons
    tableBody.innerHTML = recipesToRender.map(recipe => `
      <tr class="recipe-row" data-recipe-id="${recipe.idMeal || recipe.id}">
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
        <td class="col-dishtype">
          <span class="badge-table dishtype-badge-table">${recipe.dishType || 'Main Course'}</span>
        </td>
        <td class="col-cuisine">
          <span class="badge-table cuisine-badge-table">${recipe.strArea || 'Unknown'}</span>
        </td>
        <td class="col-dietary">
          <div class="dietary-badges">${this.renderDietaryBadges(recipe.dietary || {})}</div>
        </td>
        <td class="col-date">
          <div class="date-table">${recipe.dateModified ? new Date(recipe.dateModified).toLocaleDateString() : 'Unknown'}</div>
        </td>
        <td class="col-status">
          <span class="status-badge-table status-active">Published</span>
        </td>
        <td class="col-actions">
          <div class="action-buttons-table">
            <button class="btn-action-icon btn-view" data-tooltip="View Recipe" data-recipe-id="${recipe.idMeal || recipe.id}">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn-action-icon btn-edit" data-tooltip="Edit Recipe" data-recipe-id="${recipe.idMeal || recipe.id}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-action-icon btn-delete" data-tooltip="Delete Recipe" data-recipe-id="${recipe.idMeal || recipe.id}">
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
  
  // Render dietary badges with emojis
  renderDietaryBadges(dietary) {
    const dietaryEmojis = {
      'vegetarian': '🥗',
      'vegan': '🌱',
      'pescatarian': '🐟',
      'keto': '🥑',
      'lowCarb': '🥩',
      'highProtein': '💪',
      'glutenFree': '🌾',
      'dairyFree': '🥛',
      'nutFree': '🥜',
      'lowSodium': '🧂',
      'lowSugar': '🍯',
      'mediterraneanDiet': '🫒'
    };
    
    const activeDietary = Object.entries(dietary)
      .filter(([key, value]) => value === true)
      .map(([key]) => key);
    
    if (activeDietary.length === 0) {
      return '<span class="dietary-none">None</span>';
    }
    
    // Show max 3 dietary badges to avoid overcrowding
    const displayDietary = activeDietary.slice(0, 3);
    const remainingCount = activeDietary.length - displayDietary.length;
    
    let badges = displayDietary.map(diet => {
      const emoji = dietaryEmojis[diet] || '🍽️';
      const label = this.formatDietaryLabel(diet);
      return `<span class="badge-mini dietary-badge-mini" title="${label}">${emoji}</span>`;
    }).join('');
    
    if (remainingCount > 0) {
      badges += `<span class="badge-mini dietary-more" title="+${remainingCount} more">+${remainingCount}</span>`;
    }
    
    return badges;
  }
  
  // Format dietary label for display
  formatDietaryLabel(diet) {
    const labels = {
      'vegetarian': 'Vegetarian',
      'vegan': 'Vegan', 
      'pescatarian': 'Pescatarian',
      'keto': 'Keto',
      'lowCarb': 'Low-Carb',
      'highProtein': 'High-Protein',
      'glutenFree': 'Gluten-Free',
      'dairyFree': 'Dairy-Free',
      'nutFree': 'Nut-Free',
      'lowSodium': 'Low-Sodium',
      'lowSugar': 'Low-Sugar',
      'mediterraneanDiet': 'Mediterranean Diet'
    };
    return labels[diet] || diet;
  }
  
  // Format dietary info for recipe display
  formatDietaryInfo(dietary) {
    if (!dietary || typeof dietary !== 'object') {
      return 'None';
    }
    
    const dietaryEmojis = {
      'vegetarian': '🥗',
      'vegan': '🌱',
      'pescatarian': '🐟',
      'keto': '🥑',
      'lowCarb': '🥩',
      'highProtein': '💪',
      'glutenFree': '🌾',
      'dairyFree': '🥛',
      'nutFree': '🥜',
      'lowSodium': '🧂',
      'lowSugar': '🍯',
      'mediterraneanDiet': '🫒'
    };
    
    const activeDietary = Object.entries(dietary)
      .filter(([key, value]) => value === true)
      .map(([key]) => key);
    
    if (activeDietary.length === 0) {
      return 'None';
    }
    
    // Show max 2 dietary items with emojis
    const displayItems = activeDietary.slice(0, 2);
    const remainingCount = activeDietary.length - displayItems.length;
    
    let result = displayItems.map(diet => {
      const emoji = dietaryEmojis[diet] || '🍽️';
      const label = this.formatDietaryLabel(diet);
      return `${emoji} ${label}`;
    }).join('<br>');
    
    if (remainingCount > 0) {
      result += `<br>+${remainingCount} more`;
    }
    
    return result;
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
    // Check if instructions is already an array (modern format)
    let steps = [];
    if (recipe.instructions && Array.isArray(recipe.instructions)) {
      // Use the array directly - already split into steps
      steps = recipe.instructions.filter(step => step && step.trim() && step.length > 10);
    } else if (recipe.strInstructions) {
      // Fallback: parse string instructions
      const instructions = recipe.strInstructions;
      steps = instructions.split(/(?:\d+\.|Step \d+:|\n\n)/)
        .map(step => step.trim())
        .filter(step => step.length > 10);
    }
    
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
                <p style="color: var(--color-muted); font-size: 1.1rem; margin: 0;">${recipe.strInstructions || (Array.isArray(recipe.instructions) ? recipe.instructions.join(' ') : 'No instructions available')}</p>
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
      console.log('🗑️ Attempting to delete all recipes...');
      console.log('📡 Making DELETE request to: /admin/recipes/delete-all');
      console.log('🔑 Using token:', this.token ? 'Present' : 'Missing');
      
      const response = await fetch('/admin/recipes/delete-all', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('📊 Delete response data:', data);
      
      if (data.success) {
        alert(`✅ Success! Deleted ${data.deletedCount || 'all'} recipes from the database.`);
        
        // Clear any cached data
        this.recipes = [];
        this.filteredRecipes = [];
        
        // Force hard reload with cache bust to ensure fresh data
        console.log('🔄 Force reloading page to clear all caches...');
        window.location.reload(true); // Hard reload, bypass cache
      } else {
        alert(`❌ Error: ${data.message || 'Failed to delete recipes'}`);
      }
    } catch (error) {
      console.error('❌ Error deleting all recipes:', error);
      alert(`❌ Network error: ${error.message}`);
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

  // ============================================
  // COVERAGE MATRIX METHODS
  // ============================================

  async loadCoverageMatrix() {
    console.log('📊 Loading coverage matrix...');
    
    // Always reload recipes to get fresh data
    await this.loadRecipes();
    
    const CATEGORIES = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
    const DIETARY = ['Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Low-Carb', 
                     'High-Protein', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 
                     'Low-Sodium', 'Low-Sugar', 'Mediterranean Diet'];
    
    const DIFFICULTY = ['Easy', 'Medium', 'Hard'];
    
    // Build matrices
    this.buildCategoryDietaryMatrix(CATEGORIES, DIETARY);
    this.buildCategoryDifficultyMatrix(CATEGORIES, DIFFICULTY);
    this.buildCategoryCuisineMatrix(CATEGORIES);
    this.buildDietaryCuisineMatrix(DIETARY);
    this.buildDishTypeCategoryMatrix(CATEGORIES);
  }

  buildCategoryDietaryMatrix(categories, dietaryOptions) {
    const container = document.getElementById('categoryDietaryMatrix');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `150px repeat(${dietaryOptions.length}, 1fr)`;
    
    // Header row
    let headerHTML = '<div class="matrix-cell header"></div>';
    dietaryOptions.forEach(opt => {
      headerHTML += `<div class="matrix-cell header">${opt}</div>`;
    });
    container.innerHTML = headerHTML;
    
    // Data rows
    categories.forEach(category => {
      let rowHTML = `<div class="matrix-cell header">${category}</div>`;
      
      dietaryOptions.forEach(dietary => {
        const count = this.countRecipes({ category, dietary });
        const colorClass = count === 0 ? 'zero' : count <= 5 ? 'low' : 'good';
        
        rowHTML += `
          <div class="matrix-cell ${colorClass}" 
               data-category="${category}" 
               data-dietary="${dietary}"
               data-count="${count}">
              <div class="matrix-cell-count">${count}</div>
              <div class="matrix-cell-label">recipes</div>
          </div>
        `;
      });
      
      container.innerHTML += rowHTML;
    });
    
    // Add click handlers
    container.querySelectorAll('.matrix-cell:not(.header)').forEach(cell => {
      cell.addEventListener('click', () => this.showMatrixDetail(cell));
    });
  }

  buildCategoryDifficultyMatrix(categories, difficultyLevels) {
    const container = document.getElementById('categoryDifficultyMatrix');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `150px repeat(${difficultyLevels.length}, 1fr)`;
    
    // Header row
    let headerHTML = '<div class="matrix-cell header"></div>';
    difficultyLevels.forEach(diff => {
      const emoji = diff === 'Easy' ? '😊' : diff === 'Medium' ? '🤔' : '💪';
      headerHTML += `<div class="matrix-cell header">${emoji} ${diff}</div>`;
    });
    container.innerHTML = headerHTML;
    
    // Data rows
    categories.forEach(category => {
      let rowHTML = `<div class="matrix-cell header">${category}</div>`;
      
      difficultyLevels.forEach(difficulty => {
        const count = this.countRecipes({ category, difficulty });
        const colorClass = count === 0 ? 'zero' : count <= 5 ? 'low' : 'good';
        
        rowHTML += `
          <div class="matrix-cell ${colorClass}" 
               data-category="${category}" 
               data-difficulty="${difficulty}"
               data-count="${count}">
              <div class="matrix-cell-count">${count}</div>
              <div class="matrix-cell-label">recipes</div>
          </div>
        `;
      });
      
      container.innerHTML += rowHTML;
    });
    
    // Add click handlers
    container.querySelectorAll('.matrix-cell:not(.header)').forEach(cell => {
      cell.addEventListener('click', () => this.showMatrixDetail(cell));
    });
  }

  buildCategoryCuisineMatrix(categories) {
    const cuisines = [...new Set(this.recipes.map(r => r.strArea).filter(Boolean))].sort();
    const container = document.getElementById('categoryCuisineMatrix');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `150px repeat(${Math.min(cuisines.length, 10)}, 1fr)`;
    
    // Limit to top 10 most common cuisines
    const cuisineCounts = {};
    this.recipes.forEach(r => {
      if (r.strArea) cuisineCounts[r.strArea] = (cuisineCounts[r.strArea] || 0) + 1;
    });
    const topCuisines = Object.entries(cuisineCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cuisine]) => cuisine);
    
    // Header row
    let headerHTML = '<div class="matrix-cell header"></div>';
    topCuisines.forEach(cuisine => {
      headerHTML += `<div class="matrix-cell header">${cuisine}</div>`;
    });
    container.innerHTML = headerHTML;
    
    // Data rows
    categories.forEach(category => {
      let rowHTML = `<div class="matrix-cell header">${category}</div>`;
      
      topCuisines.forEach(cuisine => {
        const count = this.countRecipes({ category, cuisine });
        const colorClass = count === 0 ? 'zero' : count <= 5 ? 'low' : 'good';
        
        rowHTML += `
          <div class="matrix-cell ${colorClass}" 
               data-category="${category}" 
               data-cuisine="${cuisine}"
               data-count="${count}">
              <div class="matrix-cell-count">${count}</div>
              <div class="matrix-cell-label">recipes</div>
          </div>
        `;
      });
      
      container.innerHTML += rowHTML;
    });
    
    // Add click handlers
    container.querySelectorAll('.matrix-cell:not(.header)').forEach(cell => {
      cell.addEventListener('click', () => this.showMatrixDetail(cell));
    });
  }

  buildDietaryCuisineMatrix(dietaryOptions) {
    const cuisines = [...new Set(this.recipes.map(r => r.strArea).filter(Boolean))].sort();
    const container = document.getElementById('dietaryCuisineMatrix');
    container.innerHTML = '';
    
    // Limit to top 10 most common cuisines
    const cuisineCounts = {};
    this.recipes.forEach(r => {
      if (r.strArea) cuisineCounts[r.strArea] = (cuisineCounts[r.strArea] || 0) + 1;
    });
    const topCuisines = Object.entries(cuisineCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cuisine]) => cuisine);
    
    container.style.gridTemplateColumns = `150px repeat(${Math.min(topCuisines.length, 10)}, 1fr)`;
    
    // Header row
    let headerHTML = '<div class="matrix-cell header"></div>';
    topCuisines.forEach(cuisine => {
      headerHTML += `<div class="matrix-cell header">${cuisine}</div>`;
    });
    container.innerHTML = headerHTML;
    
    // Data rows
    dietaryOptions.forEach(dietary => {
      let rowHTML = `<div class="matrix-cell header">${dietary}</div>`;
      
      topCuisines.forEach(cuisine => {
        const count = this.countRecipes({ dietary, cuisine });
        const colorClass = count === 0 ? 'zero' : count <= 5 ? 'low' : 'good';
        
        rowHTML += `
          <div class="matrix-cell ${colorClass}" 
               data-dietary="${dietary}" 
               data-cuisine="${cuisine}"
               data-count="${count}">
              <div class="matrix-cell-count">${count}</div>
              <div class="matrix-cell-label">recipes</div>
          </div>
        `;
      });
      
      container.innerHTML += rowHTML;
    });
    
    // Add click handlers
    container.querySelectorAll('.matrix-cell:not(.header)').forEach(cell => {
      cell.addEventListener('click', () => this.showMatrixDetail(cell));
    });
  }

  buildDishTypeCategoryMatrix(categories) {
    const dishTypes = [...new Set(this.recipes.map(r => r.dishType).filter(Boolean))].sort();
    const container = document.getElementById('dishTypeCategoryMatrix');
    container.innerHTML = '';
    
    // Limit to top 10 most common dish types
    const dishTypeCounts = {};
    this.recipes.forEach(r => {
      if (r.dishType) dishTypeCounts[r.dishType] = (dishTypeCounts[r.dishType] || 0) + 1;
    });
    const topDishTypes = Object.entries(dishTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([dishType]) => dishType);
    
    container.style.gridTemplateColumns = `150px repeat(${Math.min(topDishTypes.length, 10)}, 1fr)`;
    
    // Header row
    let headerHTML = '<div class="matrix-cell header"></div>';
    topDishTypes.forEach(dishType => {
      headerHTML += `<div class="matrix-cell header">${dishType}</div>`;
    });
    container.innerHTML = headerHTML;
    
    // Data rows
    categories.forEach(category => {
      let rowHTML = `<div class="matrix-cell header">${category}</div>`;
      
      topDishTypes.forEach(dishType => {
        const count = this.countRecipes({ category, dishType });
        const colorClass = count === 0 ? 'zero' : count <= 5 ? 'low' : 'good';
        
        rowHTML += `
          <div class="matrix-cell ${colorClass}" 
               data-category="${category}" 
               data-dishtype="${dishType}"
               data-count="${count}">
              <div class="matrix-cell-count">${count}</div>
              <div class="matrix-cell-label">recipes</div>
          </div>
        `;
      });
      
      container.innerHTML += rowHTML;
    });
    
    // Add click handlers
    container.querySelectorAll('.matrix-cell:not(.header)').forEach(cell => {
      cell.addEventListener('click', () => this.showMatrixDetail(cell));
    });
  }

  countRecipes(filters) {
    return this.recipes.filter(recipe => {
      if (filters.category && recipe.strCategory !== filters.category) return false;
      if (filters.cuisine && recipe.strArea !== filters.cuisine) return false;
      if (filters.dishType && recipe.dishType !== filters.dishType) return false;
      if (filters.difficulty && recipe.difficulty !== filters.difficulty) return false;
      if (filters.dietary) {
        // Convert dietary option to camelCase key (e.g. "Gluten-Free" -> "glutenFree")
        const dietaryKey = filters.dietary.charAt(0).toLowerCase() + 
                          filters.dietary.slice(1).replace(/[- ]/g, '');
        if (!recipe.dietary || recipe.dietary[dietaryKey] !== true) return false;
      }
      return true;
    }).length;
  }

  showMatrixDetail(cell) {
    const category = cell.dataset.category;
    const dietary = cell.dataset.dietary;
    const cuisine = cell.dataset.cuisine;
    const dishType = cell.dataset.dishtype;
    const difficulty = cell.dataset.difficulty;
    const count = parseInt(cell.dataset.count);
    
    // Build filter object
    const filters = {};
    if (category) filters.category = category;
    if (dietary) filters.dietary = dietary;
    if (cuisine) filters.cuisine = cuisine;
    if (dishType) filters.dishType = dishType;
    if (difficulty) filters.difficulty = difficulty;
    
    // Get matching recipes
    const matchingRecipes = this.recipes.filter(recipe => {
      if (filters.category && recipe.strCategory !== filters.category) return false;
      if (filters.cuisine && recipe.strArea !== filters.cuisine) return false;
      if (filters.dishType && recipe.dishType !== filters.dishType) return false;
      if (filters.difficulty && recipe.difficulty !== filters.difficulty) return false;
      if (filters.dietary) {
        // Convert dietary option to camelCase key (e.g. "Gluten-Free" -> "glutenFree")
        const dietaryKey = filters.dietary.charAt(0).toLowerCase() + 
                          filters.dietary.slice(1).replace(/[- ]/g, '');
        if (!recipe.dietary || recipe.dietary[dietaryKey] !== true) return false;
      }
      return true;
    });
    
    // Show modal
    const modal = document.getElementById('matrixModal');
    const title = document.getElementById('matrixModalTitle');
    const recipesList = document.getElementById('matrixModalRecipes');
    
    const filterText = Object.entries(filters).map(([k, v]) => v).join(' + ');
    title.textContent = `${filterText} (${count} recipes)`;
    
    if (matchingRecipes.length === 0) {
      recipesList.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 2rem;">No recipes found for this combination.</p>';
    } else {
      recipesList.innerHTML = matchingRecipes.map(r => `
        <div class="matrix-recipe-item">
          <span>${r.strMeal}</span>
          <button class="btn btn-sm" onclick="adminPanel.editRecipe('${r.idMeal}')">View</button>
        </div>
      `).join('');
    }
    
    // Setup generate button
    const generateBtn = document.getElementById('generateForCombo');
    generateBtn.onclick = () => {
      modal.style.display = 'none';
      this.switchSection('generate');
      
      // Disable random mode to show custom filters
      const randomModeCheckbox = document.getElementById('randomMode');
      const customFiltersSection = document.getElementById('customFiltersSection');
      if (randomModeCheckbox && customFiltersSection) {
        randomModeCheckbox.checked = false;
        customFiltersSection.style.display = 'block';
      }
      
      // Pre-select the filter buttons for this combo
      if (filters.category) {
        const categoryBtn = document.querySelector(`[data-category="${filters.category}"]`);
        if (categoryBtn) categoryBtn.click();
      }
      if (filters.dietary) {
        const dietaryBtn = document.querySelector(`[data-dietary="${filters.dietary}"]`);
        if (dietaryBtn) dietaryBtn.click();
      }
      if (filters.cuisine) {
        const cuisineBtn = document.querySelector(`[data-cuisine="${filters.cuisine}"]`);
        if (cuisineBtn) cuisineBtn.click();
      }
      if (filters.dishType) {
        const dishTypeBtn = document.querySelector(`[data-dishtype="${filters.dishType}"]`);
        if (dishTypeBtn) dishTypeBtn.click();
      }
    };
    
    modal.style.display = 'flex';
    
    // Close modal handler
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };
    
    // Close on outside click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    };
  }

  // ============================================
  // PAGINATION METHODS
  // ============================================

  setupPaginationHandlers() {
    // This will be called after pagination controls are rendered
    // We'll attach event listeners dynamically in updatePagination()
  }

  updatePagination() {
    const paginationControls = document.getElementById('paginationControls');
    if (!paginationControls) {
      console.warn('⚠️ Pagination controls not found');
      return;
    }

    // ✅ Calculate pagination based on filtered results or total recipes
    let totalCount, totalPages;
    
    if (this.hasActiveFilters()) {
      // Client-side pagination for filtered results
      totalCount = this.filteredRecipes.length;
      totalPages = Math.ceil(totalCount / this.recipesPerPage);
      console.log(`📄 Client-side pagination: ${totalCount} filtered recipes, ${totalPages} pages`);
    } else {
      // Server-side pagination for all recipes
      totalCount = this.totalRecipes || this.recipes.length;
      totalPages = this.totalPages || Math.ceil(totalCount / this.recipesPerPage);
      console.log(`📄 Server-side pagination: ${totalCount} total recipes, ${totalPages} pages`);
    }

    // ✅ Hide pagination if everything fits on one page
    if (totalPages <= 1) {
      paginationControls.style.display = 'none';
      return;
    }

    paginationControls.style.display = 'flex';

    // Update pagination info text
    const start = (this.currentPage - 1) * this.recipesPerPage + 1;
    const end = Math.min(this.currentPage * this.recipesPerPage, totalCount);
    const paginationInfo = paginationControls.querySelector('.pagination-info');
    if (paginationInfo) {
      paginationInfo.textContent = `${start}-${end} of ${totalCount}`;
    }

    // Update pagination buttons
    const buttonsContainer = paginationControls.querySelector('.pagination-buttons');
    if (!buttonsContainer) return;

    // Build pagination buttons HTML
    let buttonsHTML = '';

    // First page button
    buttonsHTML += `<button class="btn btn-pagination ${this.currentPage === 1 ? 'disabled' : ''}" data-page="1" ${this.currentPage === 1 ? 'disabled' : ''}>«</button>`;
    
    // Previous page button
    buttonsHTML += `<button class="btn btn-pagination ${this.currentPage === 1 ? 'disabled' : ''}" data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''}>‹</button>`;

    // Page number buttons (show current page and 2 on each side)
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(totalPages, this.currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      buttonsHTML += `<button class="btn btn-pagination ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    // Next page button
    buttonsHTML += `<button class="btn btn-pagination ${this.currentPage === totalPages ? 'disabled' : ''}" data-page="${this.currentPage + 1}" ${this.currentPage === totalPages ? 'disabled' : ''}>›</button>`;
    
    // Last page button
    buttonsHTML += `<button class="btn btn-pagination ${this.currentPage === totalPages ? 'disabled' : ''}" data-page="${totalPages}" ${this.currentPage === totalPages ? 'disabled' : ''}>»</button>`;

    buttonsContainer.innerHTML = buttonsHTML;

    // Attach click handlers to all pagination buttons
    buttonsContainer.querySelectorAll('.btn-pagination:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        if (!isNaN(page) && page !== this.currentPage) {
          this.goToPage(page);
        }
      });
    });
  }

  hidePagination() {
    const paginationControls = document.getElementById('paginationControls');
    if (paginationControls) {
      paginationControls.style.display = 'none';
    }
  }

  async goToPage(page) {
    // ✅ Determine total pages based on filter state
    const totalPages = this.hasActiveFilters() 
      ? Math.ceil(this.filteredRecipes.length / this.recipesPerPage)
      : this.totalPages;
    
    if (page < 1 || page > totalPages) {
      console.warn(`⚠️ Invalid page number: ${page}`);
      return;
    }
    
    console.log(`📄 Navigating to page ${page}`);
    this.currentPage = page;
    
    if (this.hasActiveFilters()) {
      // ✅ Client-side pagination: Just re-render without fetching
      console.log('🔄 Client-side pagination: Re-rendering filtered results');
      this.renderRecipesTable();
      this.updatePagination();
    } else {
      // ✅ Server-side pagination: Fetch new page from backend
      console.log('🌐 Server-side pagination: Fetching from backend');
      await this.loadRecipes(page);
    }
    
    // Scroll to top of recipes table
    const recipesSection = document.getElementById('allRecipes');
    if (recipesSection) {
      recipesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

// Initialize admin panel
const adminPanel = new AdminPanel();