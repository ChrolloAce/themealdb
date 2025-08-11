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
    this.navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchSection(e.target.dataset.section);
      });
    });
    
    // Forms
    this.generateForm.addEventListener('submit', this.handleGenerateRecipe.bind(this));
    document.getElementById('previewBtn').addEventListener('click', this.previewRecipe.bind(this));
    
    this.ideasForm.addEventListener('submit', this.handleGenerateIdeas.bind(this));
    
    // Batch templates
    document.querySelectorAll('[data-template]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.loadBatchTemplate(e.target.dataset.template);
      });
    });
    
    this.batchForm.addEventListener('submit', this.handleBatchGenerate.bind(this));
    
    // Recipe management
    document.getElementById('refreshRecipes').addEventListener('click', this.loadRecipes.bind(this));
    
    // Setup recipe action listeners (will be called after loadRecipes)
    this.setupRecipeActionListeners();
  }

  // Authentication with PIN system
  async handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    // If only password is entered, treat it as PIN
    const finalUsername = username || 'admin';
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
    this.navButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    
    // Update sections
    this.sections.forEach(section => section.classList.remove('active'));
    document.getElementById(sectionName).classList.add('active');
    
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

  // Recipe Generation
  async handleGenerateRecipe(e) {
    e.preventDefault();
    
    const params = this.getGenerateFormData();
    const saveRecipe = true;
    
    this.showLoading(this.generateResult, '🧠 AI is crafting professional recipe... 🎨 Creating ultra-detailed photography prompt... 📸 Generating ULTRA-HIGH QUALITY image with DALL-E 3...');
    
    try {
      const endpoint = saveRecipe ? '/admin/recipes/create-with-ai' : '/admin/ai/generate-recipe';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(params)
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.displayRecipeResult(data.recipe, data.imageUrl, false, data.imageQuality);
        const message = data.imageQuality === 'ultra-hd' ? 
          '🎉 Recipe generated with ULTRA-HIGH QUALITY photorealistic AI image!' : 
          'Recipe generated and saved successfully!';
        this.showSuccess(this.generateResult, message);
      } else {
        console.error('❌ Recipe generation failed:', data);
        this.showError(this.generateResult, data.message || 'Generation failed');
      }
    } catch (error) {
      console.error('❌ Network/Parse error:', error);
      this.showError(this.generateResult, `Network error: ${error.message}`);
    }
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

  getGenerateFormData() {
    const dietaryRestrictions = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.value)
      .filter(value => !['generateImage'].includes(value));
    
    return {
      cuisine: document.getElementById('cuisine').value,
      category: document.getElementById('category').value,
      mainIngredient: document.getElementById('mainIngredient').value,
      difficulty: document.getElementById('difficulty').value,
      cookingTime: document.getElementById('cookingTime').value,
      servings: parseInt(document.getElementById('servings').value),
      theme: document.getElementById('theme').value,
      dietaryRestrictions,
      generateImage: document.getElementById('generateImage').checked
    };
  }

  displayRecipeResult(recipe, imageUrl = null, isPreview = false, imageQuality = null) {
    const ingredients = this.getRecipeIngredients(recipe);
    
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
      <div class="recipe-preview comprehensive-recipe">
        ${imageUrl ? `
          <div style="position: relative; margin-bottom: 1rem;">
            <img src="${imageUrl}" alt="${recipe.strMeal}" style="width: 100%; max-width: 400px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
            ${qualityBadge}
          </div>
        ` : ''}
        
        <!-- Recipe Header -->
        <div class="recipe-header">
          <h3>${recipe.strMeal}</h3>
          ${recipe.shortDescription ? `<p class="recipe-description">${recipe.shortDescription}</p>` : ''}
          
          <div class="recipe-badges">
            ${parseDietaryLabels(recipe.dietaryLabels).map(label => 
              `<span class="badge dietary-badge">${label}</span>`
            ).join('')}
            ${parseAllergens(recipe.allergenFlags).map(allergen => 
              `<span class="badge allergen-badge">⚠️ ${allergen}</span>`
            ).join('')}
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="recipe-stats-grid">
          <div class="stat-item">
            <strong>⏱️ Prep</strong><br>${recipe.prepTimeMinutes || 'N/A'} min
          </div>
          <div class="stat-item">
            <strong>🔥 Cook</strong><br>${recipe.cookTimeMinutes || 'N/A'} min
          </div>
          <div class="stat-item">
            <strong>⏰ Total</strong><br>${recipe.totalTimeMinutes || 'N/A'} min
          </div>
          <div class="stat-item">
            <strong>🍽️ Serves</strong><br>${recipe.numberOfServings || '4'}
          </div>
          <div class="stat-item">
            <strong>📊 Difficulty</strong><br>${recipe.difficulty || 'Medium'}
          </div>
          <div class="stat-item">
            <strong>🥘 Yield</strong><br>${recipe.recipeYield || 'N/A'}
          </div>
        </div>

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
      recipesList.innerHTML = data.recipes.map(recipe => `
        <div class="recipe-item">
          <div class="recipe-info">
            <h4>${recipe.strMeal}</h4>
            <p>${recipe.strCategory} • ${recipe.strArea} • ${new Date(recipe.dateModified).toLocaleDateString()}</p>
          </div>
          <div class="recipe-actions">
            <button class="btn btn-outline improve-recipe-btn" data-recipe-id="${recipe.idMeal}">
              🤖 Improve
            </button>
            <button class="btn btn-danger delete-recipe-btn" data-recipe-id="${recipe.idMeal}">
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
    document.querySelectorAll('.improve-recipe-btn, .delete-recipe-btn').forEach(btn => {
      btn.replaceWith(btn.cloneNode(true));
    });
    
    // Add improve recipe listeners
    document.querySelectorAll('.improve-recipe-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const recipeId = e.target.getAttribute('data-recipe-id');
        this.improveRecipe(recipeId);
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
}

// Initialize admin panel
const adminPanel = new AdminPanel();