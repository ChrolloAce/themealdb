/**
 * RecipeDisplayManager - Manages recipe display coordination
 * Single Responsibility: Display coordination and state management
 */

class RecipeDisplayManager {
  constructor() {
    this.resultsContainer = document.getElementById('recipe-results');
    this.testResultsContainer = document.getElementById('test-results');
  }

  /**
   * Display recipe search results as cards
   */
  displayRecipeCards(recipes) {
    if (!this.resultsContainer) return;

    console.log('🖼️ displayRecipeResults called with', recipes.length, 'recipes');
    if (recipes.length > 0) {
        console.log('📊 First recipe data:', recipes[0]);
        console.log('   nutrition:', recipes[0].nutrition);
        console.log('   strEquipment:', recipes[0].strEquipment);
        console.log('   equipmentRequired:', recipes[0].equipmentRequired);
        console.log('   dishType:', recipes[0].dishType);
    }

    if (!recipes || recipes.length === 0) {
      this.showEmptyState();
      return;
    }

    // Remove duplicates
    const uniqueRecipes = recipes.filter((recipe, index, self) =>
      index === self.findIndex(r => r.idMeal === recipe.idMeal)
    );

    const cardsHTML = uniqueRecipes.map(recipe => RecipeCardBuilder.createPreviewCard(recipe)).join('');

    this.resultsContainer.innerHTML = `
      <div style="text-align: center; margin-bottom: 2rem;">
        <h3 style="color: #1e293b; margin-bottom: 0.5rem;">🎯 Found ${uniqueRecipes.length} Recipe${uniqueRecipes.length !== 1 ? 's' : ''}</h3>
        <p style="color: #64748b;">Click any recipe to view full details</p>
      </div>
      <div class="recipe-grid">
        ${cardsHTML}
      </div>
    `;
  }

  /**
   * Display API test results
   */
  displayApiResults(data, testUrl) {
    if (!this.testResultsContainer) return;

    const isRecipeData = data.meals && Array.isArray(data.meals);
    const hasRecipes = data.meals && data.meals.length > 0;

    if (isRecipeData && hasRecipes) {
      this.displayRecipeApiResults(data, testUrl);
    } else {
      this.displayGenericApiResults(data, testUrl);
    }
  }

  /**
   * Display recipe-specific API results
   */
  displayRecipeApiResults(data, testUrl) {
    const cardsHTML = data.meals.map((recipe, index) =>
      RecipeCardBuilder.createDetailedCard(recipe, index)
    ).join('');

    this.testResultsContainer.innerHTML = `
      <div class="api-results-header">
        <h3>📊 API Response (${data.meals.length} recipe${data.meals.length > 1 ? 's' : ''})</h3>
        <p><strong>Endpoint:</strong> <code>${testUrl}</code></p>
      </div>
      <div class="recipes-display">
        ${cardsHTML}
      </div>
      <div class="full-json-toggle">
        <button class="toggle-btn toggle-full-json">📋 Show Full API Response</button>
        <pre id="full-json" class="json-data" style="display:none;">${JSON.stringify(data, null, 2)}</pre>
      </div>
    `;

    this.attachToggleListeners();
  }

  /**
   * Show empty state
   */
  showEmptyState() {
    this.resultsContainer.innerHTML = `
      <div class="recipe-results empty">
        <h3>🔍 No Recipes Found</h3>
        <p>No recipes match your current filters. Try adjusting your selection.</p>
        <div style="margin-top: 1rem;">
          <button class="action-btn clear-btn" data-action="clear">🗑️ Clear Filters</button>
          <button class="action-btn random-btn" data-action="random">🎲 Random Recipe</button>
        </div>
      </div>
    `;
  }

  /**
   * Display generic API results (non-recipe)
   */
  displayGenericApiResults(data, testUrl) {
    this.testResultsContainer.innerHTML = `
      <div class="api-results-header">
        <h3>📊 API Response</h3>
        <p><strong>Endpoint:</strong> <code>${testUrl}</code></p>
      </div>
      <pre class="json-data">${JSON.stringify(data, null, 2)}</pre>
    `;
  }

  /**
   * Attach toggle event listeners for JSON displays
   */
  attachToggleListeners() {
    // Image error handling
    document.querySelectorAll('.recipe-img').forEach(img => {
      img.addEventListener('error', function () {
        this.style.display = 'none';
        const errorDiv = this.nextElementSibling;
        if (errorDiv) errorDiv.style.display = 'block';
      });
    });

    // Recipe JSON toggles
    document.querySelectorAll('.toggle-recipe-json').forEach(btn => {
      btn.addEventListener('click', function () {
        const index = this.getAttribute('data-recipe-index');
        const jsonElement = document.getElementById(`json-${index}`);
        const isVisible = jsonElement.style.display !== 'none';

        jsonElement.style.display = isVisible ? 'none' : 'block';
        this.textContent = isVisible ? '📄 Show JSON Data' : '📄 Hide JSON Data';
      });
    });

    // Full JSON toggle
    document.querySelectorAll('.toggle-full-json').forEach(btn => {
      btn.addEventListener('click', function () {
        const jsonElement = document.getElementById('full-json');
        const isVisible = jsonElement.style.display !== 'none';

        jsonElement.style.display = isVisible ? 'none' : 'block';
        this.textContent = isVisible ? '📋 Show Full API Response' : '📋 Hide Full API Response';
      });
    });
  }

  /**
   * Show loading state
   */
  showLoading(message = '🔍 Searching for recipes...') {
    if (this.resultsContainer) {
      this.resultsContainer.innerHTML = `<div class="recipe-results loading">${message}</div>`;
    }
  }

  /**
   * Show error state
   */
  showError(title, message, retryAction = 'search') {
    if (!this.resultsContainer) return;

    this.resultsContainer.innerHTML = `
      <div class="recipe-results empty">
        <h3>${title}</h3>
        <p>${message}</p>
        <button class="action-btn search-btn" data-action="${retryAction}">🔄 Retry</button>
      </div>
    `;
  }
}

// Export for use in other modules
window.RecipeDisplayManager = RecipeDisplayManager;

