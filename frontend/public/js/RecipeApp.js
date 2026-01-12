/**
 * RecipeApp - Main application coordinator
 * Single Responsibility: Coordinate all managers and handle user actions
 */

class RecipeApp {
  constructor() {
    this.apiManager = new ApiManager();
    this.filterManager = new FilterManager();
    this.displayManager = new RecipeDisplayManager();
    
    this.initialize();
  }

  /**
   * Initialize the application
   */
  async initialize() {
    console.log('🚀 RecipeApp initializing...');
    
    this.setupEventListeners();
    await this.checkApiHealth();
    
    console.log('✅ RecipeApp initialized');
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Filter buttons
    this.filterManager.setupEventListeners();

    // Action buttons
    this.setupActionButtons();

    // Dynamic event delegation
    this.setupDynamicEvents();

    // API test buttons
    this.setupTestButtons();

    // Example buttons
    this.setupExampleButtons();

    // Custom test button
    const customTestBtn = document.getElementById('test-custom-btn');
    if (customTestBtn) {
      customTestBtn.addEventListener('click', () => this.testCustomEndpoint());
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.testCustomEndpoint();
      }
    });
  }

  /**
   * Setup action buttons (clear, find, random)
   */
  setupActionButtons() {
    const clearBtn = document.getElementById('clear-filters-btn');
    const findBtn = document.getElementById('find-recipes-btn');
    const randomBtn = document.getElementById('random-recipe-btn');

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearFilters());
    }

    if (findBtn) {
      findBtn.addEventListener('click', () => this.findRecipes());
    }

    if (randomBtn) {
      randomBtn.addEventListener('click', () => this.getRandomRecipe());
    }
  }

  /**
   * Setup dynamic event delegation for generated buttons
   */
  setupDynamicEvents() {
    document.body.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.getAttribute('data-action');
      e.preventDefault();

      switch (action) {
        case 'random':
          this.getRandomRecipe();
          break;
        case 'search':
          this.findRecipes();
          break;
        case 'clear':
          this.clearFilters();
          break;
        case 'view-details':
          const recipeId = target.getAttribute('data-recipe-id');
          if (recipeId) {
            this.viewRecipeDetails(recipeId);
          }
          break;
      }
    });
  }

  /**
   * Setup API test buttons
   */
  setupTestButtons() {
    document.querySelectorAll('.test-btn[data-endpoint]').forEach(button => {
      button.addEventListener('click', (e) => {
        const endpoint = e.target.getAttribute('data-endpoint');
        this.testEndpoint(endpoint);
      });
    });
  }

  /**
   * Setup example buttons
   */
  setupExampleButtons() {
    document.querySelectorAll('.example-btn[data-example]').forEach(button => {
      button.addEventListener('click', (e) => {
        const exampleType = e.target.getAttribute('data-example');
        this.showExample(exampleType);

        document.querySelectorAll('.example-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
      });
    });
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.filterManager.clearAll();
    
    const resultsContainer = document.getElementById('recipe-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = '';
    }
  }

  /**
   * Find recipes based on active filters
   */
  async findRecipes() {
    console.log('🔍 Finding recipes with active filters...');
    
    this.displayManager.showLoading('🔍 Searching for recipes...');

    try {
      const filters = this.filterManager.filters;

      // Check if any filters are active
      if (!this.filterManager.hasActiveFilters()) {
        this.displayManager.showError(
          '🔍 No Filters Selected',
          'Please select at least one filter to find recipes.',
          'random'
        );
        return;
      }

      let recipes = [];

      // Search by category
      if (filters.categories.size > 0) {
        for (const category of filters.categories) {
          const categoryRecipes = await this.apiManager.searchByCategory(category);
          recipes = recipes.concat(categoryRecipes);
        }
      }

      // Search by cuisine
      if (filters.cuisines.size > 0 && recipes.length === 0) {
        for (const cuisine of filters.cuisines) {
          const cuisineRecipes = await this.apiManager.searchByCuisine(cuisine);
          recipes = recipes.concat(cuisineRecipes);
        }
      }

      // If no specific searches, get random recipes
      if (recipes.length === 0) {
        recipes = await this.apiManager.getMultipleRandom(10);
      }

      // Client-side filtering
      const filteredRecipes = this.applyClientSideFilters(recipes);

      this.displayManager.displayRecipeCards(filteredRecipes);

    } catch (error) {
      console.error('Error finding recipes:', error);
      this.displayManager.showError(
        '❌ Search Error',
        'Failed to search for recipes. Please try again.',
        'search'
      );
    }
  }

  /**
   * Get random recipe
   */
  async getRandomRecipe() {
    const hasFilters = this.filterManager.hasActiveFilters();
    const loadingMessage = hasFilters
      ? '🎲 Getting random recipe matching your filters...'
      : '🎲 Getting random recipe from all recipes...';

    this.displayManager.showLoading(loadingMessage);

    try {
      const filterParams = hasFilters ? this.filterManager.toApiParams() : null;
      const recipes = await this.apiManager.getRandomRecipe(filterParams);

      if (!recipes) {
        if (hasFilters) {
          this.displayManager.showError(
            '🔍 No Recipes Match Your Filters',
            'No random recipes found matching your current filters. Try clearing some filters or using different criteria.',
            'clear'
          );
        } else {
          throw new Error('No recipe returned');
        }
        return;
      }

      this.displayManager.displayRecipeCards(recipes);

    } catch (error) {
      console.error('Error getting random recipe:', error);
      this.displayManager.showError(
        '❌ Error',
        'Failed to get random recipe. Please try again.',
        'random'
      );
    }
  }

  /**
   * View recipe details
   */
  async viewRecipeDetails(recipeId) {
    try {
      const data = await this.apiManager.getRecipeById(recipeId);

      if (data.meals && data.meals[0]) {
        this.displayManager.displayApiResults(data, `/api/json/v1/1/lookup.php?i=${recipeId}`);

        const resultsDiv = document.getElementById('recipe-results');
        if (resultsDiv) {
          resultsDiv.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } catch (error) {
      console.error('Error loading recipe details:', error);
      alert('Failed to load recipe details. Please try again.');
    }
  }

  /**
   * Apply client-side filters
   */
  applyClientSideFilters(recipes) {
    const filters = this.filterManager.filters;

    return recipes.filter(recipe => {
      // Check category
      if (filters.categories.size > 0) {
        const recipeCategory = recipe.strCategory || '';
        const matchesCategory = Array.from(filters.categories).some(category =>
          recipeCategory.toLowerCase().includes(category.toLowerCase()) ||
          category.toLowerCase().includes(recipeCategory.toLowerCase())
        );
        if (!matchesCategory) return false;
      }

      // Check cuisine
      if (filters.cuisines.size > 0) {
        const recipeCuisine = recipe.strArea || '';
        const matchesCuisine = Array.from(filters.cuisines).some(cuisine =>
          recipeCuisine.toLowerCase().includes(cuisine.toLowerCase()) ||
          cuisine.toLowerCase().includes(recipeCuisine.toLowerCase())
        );
        if (!matchesCuisine) return false;
      }

      // Check dish type
      if (filters.dishTypes.size > 0) {
        const recipeTags = (recipe.strTags || '').toLowerCase();
        const recipeName = (recipe.strMeal || '').toLowerCase();

        const matchesDishType = Array.from(filters.dishTypes).some(dishType => {
          const dishLower = dishType.toLowerCase();
          return recipeTags.includes(dishLower) || recipeName.includes(dishLower);
        });
        if (!matchesDishType) return false;
      }

      // Check dietary
      if (filters.dietary.size > 0) {
        const recipeTags = (recipe.strTags || '').toLowerCase();
        const recipeName = (recipe.strMeal || '').toLowerCase();

        const matchesDietary = Array.from(filters.dietary).some(dietary => {
          const dietaryLower = dietary.toLowerCase();
          return recipeTags.includes(dietaryLower) || recipeName.includes(dietaryLower);
        });
        if (!matchesDietary) return false;
      }

      return true;
    });
  }

  /**
   * Test an endpoint
   */
  async testEndpoint(url) {
    const resultsDiv = this.displayManager.testResultsContainer;
    if (!resultsDiv) return;

    resultsDiv.innerHTML = '<pre class="loading">Loading...</pre>';

    const result = await this.apiManager.testEndpoint(url);

    if (result.success) {
      this.displayManager.displayApiResults(result.data, url);
    } else {
      resultsDiv.innerHTML = `<pre class="error">Error: ${result.error || `Status ${result.status}`}</pre>`;
    }
  }

  /**
   * Test custom endpoint
   */
  async testCustomEndpoint() {
    const urlInput = document.getElementById('api-url');
    if (!urlInput || !urlInput.value) {
      const resultsDiv = this.displayManager.testResultsContainer;
      if (resultsDiv) {
        resultsDiv.innerHTML = '<pre class="error">Please enter an API endpoint</pre>';
      }
      return;
    }

    await this.testEndpoint(urlInput.value);
  }

  /**
   * Show example JSON
   */
  showExample(type) {
    const exampleJson = document.getElementById('example-json');
    if (!exampleJson) return;

    const examples = {
      search: { meals: [{ idMeal: "52771", strMeal: "Spicy Arrabiata Penne", strCategory: "Vegetarian", strArea: "Italian" }] },
      meal: { meals: [{ idMeal: "52771", strMeal: "Spicy Arrabiata Penne", strCategory: "Vegetarian" }] },
      categories: { categories: [{ idCategory: "1", strCategory: "Beef" }] }
    };

    if (examples[type]) {
      exampleJson.textContent = JSON.stringify(examples[type], null, 2);
    }
  }

  /**
   * Check API health on startup
   */
  async checkApiHealth() {
    const isHealthy = await this.apiManager.checkHealth();
    if (isHealthy) {
      console.log('✅ API is healthy');
    } else {
      console.warn('⚠️ API health check failed');
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.recipeApp = new RecipeApp();
  window.recipeApp.showExample('search'); // Show initial example
});

