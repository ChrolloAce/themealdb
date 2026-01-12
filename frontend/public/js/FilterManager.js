/**
 * FilterManager - Manages recipe filtering state and UI
 * Single Responsibility: Handle filter selection and state
 */

class FilterManager {
  constructor() {
    this.filters = {
      categories: new Set(),
      dishTypes: new Set(),
      cuisines: new Set(),
      dietary: new Set()
    };

    this.activeFiltersContainer = document.getElementById('active-filters-list');
  }

  /**
   * Toggle a filter on/off
   */
  toggleFilter(filterType, value, buttonElement) {
    const filterSet = this.filters[filterType];

    if (filterSet.has(value)) {
      filterSet.delete(value);
      buttonElement.classList.remove('active');
      console.log(`🗑️ Removed filter: ${filterType} = ${value}`);
    } else {
      filterSet.add(value);
      buttonElement.classList.add('active');
      console.log(`✅ Added filter: ${filterType} = ${value}`);
    }

    this.updateDisplay();
  }

  /**
   * Clear all filters
   */
  clearAll() {
    console.log('🗑️ Clearing all filters');

    this.filters.categories.clear();
    this.filters.dishTypes.clear();
    this.filters.cuisines.clear();
    this.filters.dietary.clear();

    document.querySelectorAll('.filter-btn.active').forEach(btn => {
      btn.classList.remove('active');
    });

    this.updateDisplay();
  }

  /**
   * Remove a specific filter
   */
  removeFilter(filterType, value) {
    const filterSet = this.filters[filterType];
    filterSet.delete(value);

    // Update button state
    const dataAttr = this.getDataAttributeName(filterType);
    const button = document.querySelector(`[data-${dataAttr}="${value}"]`);
    if (button) {
      button.classList.remove('active');
    }

    this.updateDisplay();
  }

  /**
   * Get data attribute name for filter type
   */
  getDataAttributeName(filterType) {
    const mapping = {
      categories: 'category',
      dishTypes: 'dish',
      cuisines: 'cuisine',
      dietary: 'dietary'
    };
    return mapping[filterType] || filterType;
  }

  /**
   * Update active filters display
   */
  updateDisplay() {
    if (!this.activeFiltersContainer) return;

    this.activeFiltersContainer.innerHTML = '';

    const allFilters = this.getAllFilters();

    if (allFilters.length === 0) {
      this.showNoFilters();
      return;
    }

    allFilters.forEach(filter => {
      const tag = this.createFilterTag(filter);
      this.activeFiltersContainer.appendChild(tag);
    });
  }

  /**
   * Get all active filters as array
   */
  getAllFilters() {
    const allFilters = [];

    this.filters.categories.forEach(category => {
      allFilters.push({ type: 'categories', value: category, label: `🍽️ ${category}` });
    });

    this.filters.dishTypes.forEach(dish => {
      allFilters.push({ type: 'dishTypes', value: dish, label: `🍳 ${dish}` });
    });

    this.filters.cuisines.forEach(cuisine => {
      allFilters.push({ type: 'cuisines', value: cuisine, label: `🌍 ${cuisine}` });
    });

    this.filters.dietary.forEach(dietary => {
      allFilters.push({ type: 'dietary', value: dietary, label: `🥗 ${dietary}` });
    });

    return allFilters;
  }

  /**
   * Create filter tag element
   */
  createFilterTag(filter) {
    const tag = document.createElement('div');
    tag.className = 'active-filter-tag';
    tag.innerHTML = `
      ${filter.label}
      <button class="remove-filter" data-type="${filter.type}" data-value="${filter.value}">×</button>
    `;

    const removeBtn = tag.querySelector('.remove-filter');
    removeBtn.addEventListener('click', () => {
      this.removeFilter(filter.type, filter.value);
    });

    return tag;
  }

  /**
   * Show "no filters" state
   */
  showNoFilters() {
    const noneTag = document.createElement('span');
    noneTag.textContent = 'None';
    noneTag.style.color = '#94a3b8';
    noneTag.style.fontStyle = 'italic';
    this.activeFiltersContainer.appendChild(noneTag);
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters() {
    return this.filters.categories.size > 0 ||
           this.filters.dishTypes.size > 0 ||
           this.filters.cuisines.size > 0 ||
           this.filters.dietary.size > 0;
  }

  /**
   * Get filters as API parameters
   */
  toApiParams() {
    const params = new URLSearchParams();

    // Add cache-busting timestamp
    params.append('t', Date.now());

    // Add category filter
    if (this.filters.categories.size > 0) {
      const category = Array.from(this.filters.categories)[0];
      params.append('c', category);
    }

    // Add cuisine filter
    if (this.filters.cuisines.size > 0) {
      const cuisine = Array.from(this.filters.cuisines)[0];
      params.append('a', cuisine);
    }

    // Add dish type filter
    if (this.filters.dishTypes.size > 0) {
      const dishType = Array.from(this.filters.dishTypes)[0];
      params.append('d', dishType);
    }

    // Add dietary filter
    if (this.filters.dietary.size > 0) {
      const dietary = Array.from(this.filters.dietary)[0];
      params.append('diet', dietary);
    }

    return params;
  }

  /**
   * Setup filter button event listeners
   */
  setupEventListeners() {
    // Category filters
    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', () =>
        this.toggleFilter('categories', btn.dataset.category, btn)
      );
    });

    // Dish type filters
    document.querySelectorAll('.dish-btn').forEach(btn => {
      btn.addEventListener('click', () =>
        this.toggleFilter('dishTypes', btn.dataset.dish, btn)
      );
    });

    // Cuisine filters
    document.querySelectorAll('.cuisine-btn').forEach(btn => {
      btn.addEventListener('click', () =>
        this.toggleFilter('cuisines', btn.dataset.cuisine, btn)
      );
    });

    // Dietary filters
    document.querySelectorAll('.dietary-btn').forEach(btn => {
      btn.addEventListener('click', () =>
        this.toggleFilter('dietary', btn.dataset.dietary, btn)
      );
    });
  }
}

// Export for use in other modules
window.FilterManager = FilterManager;

