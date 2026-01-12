/**
 * ApiManager - Handles all API communication
 * Single Responsibility: API calls and data fetching
 */

class ApiManager {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get random recipe
   */
  async getRandomRecipe(filters = null) {
    console.log('\n🎲 ═══════════════════════════════════════════');
    console.log('🔵 CLIENT: Random Recipe Request');
    console.log('⏰ Timestamp:', new Date().toISOString());

    try {
      const params = new URLSearchParams();
      params.append('t', Date.now()); // Cache busting

      if (filters) {
        if (filters.get('c')) params.append('c', filters.get('c'));
        if (filters.get('a')) params.append('a', filters.get('a'));
        if (filters.get('d')) params.append('d', filters.get('d'));
        if (filters.get('diet')) params.append('diet', filters.get('diet'));
      }

      const apiUrl = `/api/json/v1/1/random.php?${params.toString()}`;

      console.log('📡 Fetching from:', apiUrl);
      if (filters) {
        console.log('🔍 With filters:', Object.fromEntries(filters.entries()));
      }

      const startTime = performance.now();
      const response = await fetch(apiUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const endTime = performance.now();

      console.log('📥 Response received in', Math.round(endTime - startTime), 'ms');
      console.log('📊 Response status:', response.status, response.statusText);

      const data = await response.json();
      console.log('📦 Response data:', data);

      if (data.meals && data.meals[0]) {
        const recipe = data.meals[0];
        console.log('✅ Recipe received:', recipe.strMeal);
        console.log('   Category:', recipe.strCategory);
        console.log('   Area:', recipe.strArea);
        console.log('   ID:', recipe.idMeal);
        console.log('   Dish Type:', recipe.dishType || 'Not set');
        console.log('═══════════════════════════════════════════\n');
        return [recipe];
      }

      console.error('❌ No meals in response');
      console.log('═══════════════════════════════════════════\n');
      return null;

    } catch (error) {
      console.error('❌ API Error:', error);
      console.log('═══════════════════════════════════════════\n');
      throw error;
    }
  }

  /**
   * Get recipe by ID
   */
  async getRecipeById(recipeId) {
    try {
      const response = await fetch(`/api/json/v1/1/lookup.php?i=${recipeId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching recipe:', error);
      throw error;
    }
  }

  /**
   * Search recipes by category
   */
  async searchByCategory(category) {
    try {
      const response = await fetch(`/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`);
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error(`Error searching by category ${category}:`, error);
      return [];
    }
  }

  /**
   * Search recipes by cuisine
   */
  async searchByCuisine(cuisine) {
    try {
      const response = await fetch(`/api/json/v1/1/filter.php?a=${encodeURIComponent(cuisine)}`);
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error(`Error searching by cuisine ${cuisine}:`, error);
      return [];
    }
  }

  /**
   * Get multiple random recipes
   */
  async getMultipleRandom(count = 10) {
    try {
      const recipes = [];
      for (let i = 0; i < count; i++) {
        const response = await fetch(`/api/json/v1/1/random.php?t=${Date.now() + i}`);
        const data = await response.json();
        if (data.meals && data.meals[0]) {
          recipes.push(data.meals[0]);
        }
      }
      return recipes;
    } catch (error) {
      console.error('Error getting random recipes:', error);
      return [];
    }
  }

  /**
   * Test an endpoint
   */
  async testEndpoint(url) {
    try {
      const testUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      return { success: response.ok, data, status: response.status };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check API health
   */
  async checkHealth() {
    try {
      const response = await fetch('/health');
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.warn('⚠️ API health check failed:', error.message);
      return false;
    }
  }
}

// Export for use in other modules
window.ApiManager = ApiManager;

