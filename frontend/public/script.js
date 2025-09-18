// API testing functionality
async function testEndpoint(url) {
    const resultsDiv = document.getElementById('test-results');
    resultsDiv.innerHTML = '<pre class="loading">Loading...</pre>';
    
    try {
        // Handle relative URLs by making them absolute
        const testUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
        
        const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Enhanced display with recipe visualization
            displayApiResults(data, testUrl);
        } else {
            resultsDiv.innerHTML = `<pre class="error">Error ${response.status}: ${JSON.stringify(data, null, 2)}</pre>`;
        }
    } catch (error) {
        resultsDiv.innerHTML = `<pre class="error">Network Error: ${error.message}</pre>`;
    }
}

// Enhanced API results display with image support
function displayApiResults(data, testUrl) {
    const resultsDiv = document.getElementById('test-results');
    
    // Check if this is recipe data
    const isRecipeData = data.meals && Array.isArray(data.meals);
    const isSingleRecipe = data.meals && data.meals.length === 1;
    const hasRecipes = data.meals && data.meals.length > 0;
    
    if (isRecipeData && hasRecipes) {
        // Display enhanced recipe view
        let html = `
            <div class="api-results-header">
                <h3>📊 API Response (${data.meals.length} recipe${data.meals.length > 1 ? 's' : ''})</h3>
                <p><strong>Endpoint:</strong> <code>${testUrl}</code></p>
            </div>
            <div class="recipes-display">
        `;
        
        data.meals.forEach((recipe, index) => {
            const ingredients = getRecipeIngredients(recipe);
            
            html += `
                <div class="recipe-card">
                    <div class="recipe-header">
                        <h4>${recipe.strMeal}</h4>
                        <span class="recipe-meta">${recipe.strCategory} • ${recipe.strArea}</span>
                    </div>
                    
                    ${recipe.strMealThumb ? `
                        <div class="recipe-image">
                            <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" class="recipe-img">
                            <div class="image-error" style="display:none;">
                                <span>🖼️ Image not available</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="recipe-details">
                        ${ingredients.length > 0 ? `
                            <div class="ingredients-section">
                                <h5>📝 Ingredients (${ingredients.length})</h5>
                                <div class="ingredients-list">
                                    ${ingredients.map(ing => `<span class="ingredient-tag">${ing}</span>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${recipe.strEquipment ? `
                            <div class="equipment-section">
                                <h5>🍳 Required Equipment</h5>
                                <p class="equipment-text">${recipe.strEquipment}</p>
                            </div>
                        ` : ''}
                        
                        ${recipe.strInstructions ? `
                            <div class="instructions-section">
                                <h5>📋 Instructions</h5>
                                <p class="instructions-text">${recipe.strInstructions.substring(0, 200)}${recipe.strInstructions.length > 200 ? '...' : ''}</p>
                            </div>
                        ` : ''}
                        
                        ${recipe.strTags ? `
                            <div class="tags-section">
                                <h5>🏷️ Tags</h5>
                                <div class="tags-list">
                                    ${recipe.strTags.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="json-toggle">
                        <button class="toggle-btn toggle-recipe-json" data-recipe-index="${index}">
                            📄 Show JSON Data
                        </button>
                        <pre id="json-${index}" class="json-data" style="display:none;">${JSON.stringify(recipe, null, 2)}</pre>
                    </div>
                </div>
            `;
        });
        
        html += `
            </div>
            <div class="full-json-toggle">
                <button class="toggle-btn toggle-full-json">
                    📋 Show Full API Response
                </button>
                <pre id="full-json" class="json-data" style="display:none;">${JSON.stringify(data, null, 2)}</pre>
            </div>
        `;
        
        resultsDiv.innerHTML = html;
        
        // Add error handling for images after DOM is updated
        document.querySelectorAll('.recipe-img').forEach(img => {
            img.addEventListener('error', function() {
                this.style.display = 'none';
                this.nextElementSibling.style.display = 'block';
            });
        });
        
        // Add event listeners for toggle buttons
        document.querySelectorAll('.toggle-recipe-json').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = this.getAttribute('data-recipe-index');
                toggleJson(index);
            });
        });
        
        document.querySelectorAll('.toggle-full-json').forEach(btn => {
            btn.addEventListener('click', toggleFullJson);
        });
    } else {
        // Display regular JSON for non-recipe data
        resultsDiv.innerHTML = `
            <div class="api-results-header">
                <h3>📊 API Response</h3>
                <p><strong>Endpoint:</strong> <code>${testUrl}</code></p>
            </div>
            <pre class="json-data">${JSON.stringify(data, null, 2)}</pre>
        `;
    }
}

// Helper function to extract ingredients from recipe
function getRecipeIngredients(recipe) {
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

// Toggle individual recipe JSON display
function toggleJson(index) {
    const jsonElement = document.getElementById(`json-${index}`);
    const button = jsonElement.previousElementSibling;
    
    if (jsonElement.style.display === 'none') {
        jsonElement.style.display = 'block';
        button.textContent = '📄 Hide JSON Data';
    } else {
        jsonElement.style.display = 'none';
        button.textContent = '📄 Show JSON Data';
    }
}

// Toggle full API response JSON
function toggleFullJson() {
    const jsonElement = document.getElementById('full-json');
    const button = jsonElement.previousElementSibling;
    
    if (jsonElement.style.display === 'none') {
        jsonElement.style.display = 'block';
        button.textContent = '📋 Hide Full API Response';
    } else {
        jsonElement.style.display = 'none';
        button.textContent = '📋 Show Full API Response';
    }
}

async function testCustomEndpoint() {
    const url = document.getElementById('api-url').value;
    if (!url) {
        document.getElementById('test-results').innerHTML = '<pre class="error">Please enter an API endpoint</pre>';
        return;
    }
    
    // Add loading indicator
    const resultsDiv = document.getElementById('test-results');
    resultsDiv.innerHTML = '<pre class="loading"><div class="spinner"></div> Testing endpoint...</pre>';
    
    await testEndpoint(url);
}

// Example data for different response types
const examples = {
    search: {
        meals: [
            {
                idMeal: "52771",
                strMeal: "Spicy Arrabiata Penne",
                strCategory: "Vegetarian",
                strArea: "Italian",
                strInstructions: "Bring a large pot of water to a boil. Add kosher salt to the boiling water, then add the pasta. Cook according to the package instructions, about 10 to 12 minutes...",
                strMealThumb: "/images/meals/52771.jpg",
                strTags: "Pasta,Curry",
                strYoutube: "https://www.youtube.com/watch?v=1IszT_guI08",
                strIngredient1: "penne rigate",
                strMeasure1: "1 pound",
                strIngredient2: "olive oil",
                strMeasure2: "1/4 cup",
                strIngredient3: "garlic",
                strMeasure3: "3 cloves"
            }
        ]
    },
    meal: {
        meals: [
            {
                idMeal: "52771",
                strMeal: "Spicy Arrabiata Penne",
                strDrinkAlternate: null,
                strCategory: "Vegetarian",
                strArea: "Italian",
                strInstructions: "Bring a large pot of water to a boil. Add kosher salt to the boiling water, then add the pasta. Cook according to the package instructions, about 10 to 12 minutes. Reserve a cup of the pasta water and drain the pasta. Add the pasta back to the pot and add a splash of the reserved pasta water...",
                strMealThumb: "/images/meals/52771.jpg",
                strTags: "Pasta,Curry",
                strYoutube: "https://www.youtube.com/watch?v=1IszT_guI08",
                strIngredient1: "penne rigate",
                strMeasure1: "1 pound",
                strIngredient2: "olive oil",
                strMeasure2: "1/4 cup",
                strIngredient3: "garlic",
                strMeasure3: "3 cloves",
                strIngredient4: "chopped tomatoes",
                strMeasure4: "1 tin",
                strIngredient5: "red chile flakes",
                strMeasure5: "1/2 teaspoon",
                strIngredient6: "italian seasoning",
                strMeasure6: "1/2 teaspoon",
                strIngredient7: "basil",
                strMeasure7: "6 leaves",
                strIngredient8: "Parmigiano-Reggiano",
                strMeasure8: "spinkling",
                strEquipment: "Large pot, Colander, Large skillet, Wooden spoon, Cheese grater, Serving bowls",
                dateModified: "2024-01-15T10:30:00Z"
            }
        ]
    },
    categories: {
        categories: [
            {
                idCategory: "1",
                strCategory: "Beef",
                strCategoryThumb: "/images/categories/beef.png",
                strCategoryDescription: "Beef is the culinary name for meat from cattle, particularly skeletal muscle. Humans have been eating beef since prehistoric times."
            },
            {
                idCategory: "2",
                strCategory: "Chicken",
                strCategoryThumb: "/images/categories/chicken.png",
                strCategoryDescription: "The chicken is a type of domesticated fowl, a subspecies of the red junglefowl. It is one of the most common and widespread domestic animals."
            },
            {
                idCategory: "3",
                strCategory: "Dessert",
                strCategoryThumb: "/images/categories/dessert.png",
                strCategoryDescription: "Dessert is a course that concludes a meal. The course usually consists of sweet foods, such as confections dishes or fruit."
            }
        ]
    }
};

function showExample(type) {
    // Show example JSON
    const exampleJson = document.getElementById('example-json');
    if (examples[type]) {
        exampleJson.textContent = JSON.stringify(examples[type], null, 2);
    }
}

// Recipe filtering state
const recipeFilters = {
    categories: new Set(),
    dishTypes: new Set(),
    cuisines: new Set(),
    dietary: new Set()
};

// Initialize with search example and setup event listeners
document.addEventListener('DOMContentLoaded', () => {
    showExample('search');
    setupEventListeners();
    setupRecipeExplorer();
});

function setupEventListeners() {
    // Setup test button event listeners
    document.querySelectorAll('.test-btn[data-endpoint]').forEach(button => {
        button.addEventListener('click', (e) => {
            const endpoint = e.target.getAttribute('data-endpoint');
            testEndpoint(endpoint);
        });
    });
    
    // Setup example button event listeners
    document.querySelectorAll('.example-btn[data-example]').forEach(button => {
        button.addEventListener('click', (e) => {
            const exampleType = e.target.getAttribute('data-example');
            showExample(exampleType);
            
            // Update active button
            document.querySelectorAll('.example-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
    
    // Setup custom test button
    const customTestBtn = document.getElementById('test-custom-btn');
    if (customTestBtn) {
        customTestBtn.addEventListener('click', testCustomEndpoint);
    }
}

// Health check on page load
async function checkApiHealth() {
    try {
        const response = await fetch('/health');
        const data = await response.json();
        
        if (data.status === 'healthy') {
            console.log('✅ API is healthy');
        }
    } catch (error) {
        console.warn('⚠️ API health check failed:', error.message);
    }
}

// Run health check when page loads
checkApiHealth();

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to test custom endpoint
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        testCustomEndpoint();
    }
});

// Auto-focus API input on page load
document.addEventListener('DOMContentLoaded', () => {
    const apiInput = document.getElementById('api-url');
    if (apiInput) {
        apiInput.focus();
    }
});

// Recipe Explorer Functionality
function setupRecipeExplorer() {
    // Setup filter button event listeners
    setupFilterButtons();
    
    // Setup action button event listeners
    setupActionButtons();
    
    // Initialize empty state
    updateActiveFiltersDisplay();
}

function setupFilterButtons() {
    // Category filters
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleFilter('categories', btn.dataset.category, btn));
    });
    
    // Dish type filters
    document.querySelectorAll('.dish-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleFilter('dishTypes', btn.dataset.dish, btn));
    });
    
    // Cuisine filters
    document.querySelectorAll('.cuisine-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleFilter('cuisines', btn.dataset.cuisine, btn));
    });
    
    // Dietary filters
    document.querySelectorAll('.dietary-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleFilter('dietary', btn.dataset.dietary, btn));
    });
}

function setupActionButtons() {
    const clearBtn = document.getElementById('clear-filters-btn');
    const findBtn = document.getElementById('find-recipes-btn');
    const randomBtn = document.getElementById('random-recipe-btn');
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllFilters);
    }
    
    if (findBtn) {
        findBtn.addEventListener('click', findRecipes);
    }
    
    if (randomBtn) {
        randomBtn.addEventListener('click', getRandomRecipe);
    }
}

function toggleFilter(filterType, value, buttonElement) {
    const filterSet = recipeFilters[filterType];
    
    if (filterSet.has(value)) {
        // Remove filter
        filterSet.delete(value);
        buttonElement.classList.remove('active');
    } else {
        // Add filter
        filterSet.add(value);
        buttonElement.classList.add('active');
    }
    
    updateActiveFiltersDisplay();
}

function updateActiveFiltersDisplay() {
    const activeFiltersContainer = document.getElementById('active-filters-list');
    if (!activeFiltersContainer) return;
    
    // Clear existing tags
    activeFiltersContainer.innerHTML = '';
    
    // Add filter tags for each active filter
    const allFilters = [];
    
    // Add category filters
    recipeFilters.categories.forEach(category => {
        allFilters.push({ type: 'categories', value: category, label: `🍽️ ${category}` });
    });
    
    // Add dish type filters
    recipeFilters.dishTypes.forEach(dish => {
        allFilters.push({ type: 'dishTypes', value: dish, label: `🍳 ${dish}` });
    });
    
    // Add cuisine filters
    recipeFilters.cuisines.forEach(cuisine => {
        allFilters.push({ type: 'cuisines', value: cuisine, label: `🌍 ${cuisine}` });
    });
    
    // Add dietary filters
    recipeFilters.dietary.forEach(dietary => {
        allFilters.push({ type: 'dietary', value: dietary, label: `🥗 ${dietary}` });
    });
    
    // Create filter tags
    allFilters.forEach(filter => {
        const tag = document.createElement('div');
        tag.className = 'active-filter-tag';
        tag.innerHTML = `
            ${filter.label}
            <button class="remove-filter" data-type="${filter.type}" data-value="${filter.value}">×</button>
        `;
        activeFiltersContainer.appendChild(tag);
        
        // Add remove event listener
        const removeBtn = tag.querySelector('.remove-filter');
        removeBtn.addEventListener('click', () => {
            removeFilter(filter.type, filter.value);
        });
    });
    
    // Show "None" if no filters active
    if (allFilters.length === 0) {
        const noneTag = document.createElement('span');
        noneTag.textContent = 'None';
        noneTag.style.color = '#94a3b8';
        noneTag.style.fontStyle = 'italic';
        activeFiltersContainer.appendChild(noneTag);
    }
}

function removeFilter(filterType, value) {
    const filterSet = recipeFilters[filterType];
    filterSet.delete(value);
    
    // Update button state
    const button = document.querySelector(`[data-${filterType.replace('dishTypes', 'dish').replace('cuisines', 'cuisine').replace('categories', 'category').replace('dietary', 'dietary')}="${value}"]`);
    if (button) {
        button.classList.remove('active');
    }
    
    updateActiveFiltersDisplay();
}

function clearAllFilters() {
    // Clear all filter sets
    recipeFilters.categories.clear();
    recipeFilters.dishTypes.clear();
    recipeFilters.cuisines.clear();
    recipeFilters.dietary.clear();
    
    // Remove active class from all filter buttons
    document.querySelectorAll('.filter-btn.active').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Update display
    updateActiveFiltersDisplay();
    
    // Clear results
    const resultsContainer = document.getElementById('recipe-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
    }
}

async function findRecipes() {
    const resultsContainer = document.getElementById('recipe-results');
    if (!resultsContainer) return;
    
    // Show loading state
    resultsContainer.innerHTML = '<div class="recipe-results loading">🔍 Searching for recipes...</div>';
    
    try {
        // Build search parameters based on active filters
        const searchParams = buildSearchParams();
        
        // If no filters, show message
        if (searchParams.length === 0) {
            resultsContainer.innerHTML = `
                <div class="recipe-results empty">
                    <h3>🔍 No Filters Selected</h3>
                    <p>Please select at least one filter to find recipes.</p>
                    <button class="action-btn random-btn" onclick="getRandomRecipe()">🎲 Get Random Recipe Instead</button>
                </div>
            `;
            return;
        }
        
        // Try different search strategies
        let recipes = [];
        
        // Strategy 1: Search by category if selected
        if (recipeFilters.categories.size > 0) {
            for (const category of recipeFilters.categories) {
                const categoryRecipes = await searchRecipesByCategory(category);
                recipes = recipes.concat(categoryRecipes);
            }
        }
        
        // Strategy 2: Search by cuisine if selected
        if (recipeFilters.cuisines.size > 0 && recipes.length === 0) {
            for (const cuisine of recipeFilters.cuisines) {
                const cuisineRecipes = await searchRecipesByCuisine(cuisine);
                recipes = recipes.concat(cuisineRecipes);
            }
        }
        
        // Strategy 3: General search if no specific filters
        if (recipes.length === 0) {
            recipes = await searchRecipesGeneral();
        }
        
        // Filter results based on all active filters
        const filteredRecipes = filterRecipesByAllCriteria(recipes);
        
        displayRecipeResults(filteredRecipes);
        
    } catch (error) {
        console.error('Error finding recipes:', error);
        resultsContainer.innerHTML = `
            <div class="recipe-results empty">
                <h3>❌ Search Error</h3>
                <p>Failed to search for recipes. Please try again.</p>
                <button class="action-btn search-btn" onclick="findRecipes()">🔄 Retry Search</button>
            </div>
        `;
    }
}

function buildSearchParams() {
    const params = [];
    
    recipeFilters.categories.forEach(category => params.push(`category:${category}`));
    recipeFilters.dishTypes.forEach(dish => params.push(`dish:${dish}`));
    recipeFilters.cuisines.forEach(cuisine => params.push(`cuisine:${cuisine}`));
    recipeFilters.dietary.forEach(dietary => params.push(`dietary:${dietary}`));
    
    return params;
}

async function searchRecipesByCategory(category) {
    try {
        const response = await fetch(`/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`);
        const data = await response.json();
        return data.meals || [];
    } catch (error) {
        console.error(`Error searching by category ${category}:`, error);
        return [];
    }
}

async function searchRecipesByCuisine(cuisine) {
    try {
        const response = await fetch(`/api/json/v1/1/filter.php?a=${encodeURIComponent(cuisine)}`);
        const data = await response.json();
        return data.meals || [];
    } catch (error) {
        console.error(`Error searching by cuisine ${cuisine}:`, error);
        return [];
    }
}

async function searchRecipesGeneral() {
    try {
        // Get multiple random recipes for variety
        const recipes = [];
        for (let i = 0; i < 10; i++) {
            const response = await fetch('/api/json/v1/1/random.php');
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

function filterRecipesByAllCriteria(recipes) {
    return recipes.filter(recipe => {
        // Check category filters
        if (recipeFilters.categories.size > 0) {
            const recipeCategory = recipe.strCategory || '';
            const matchesCategory = Array.from(recipeFilters.categories).some(category => 
                recipeCategory.toLowerCase().includes(category.toLowerCase()) ||
                category.toLowerCase().includes(recipeCategory.toLowerCase())
            );
            if (!matchesCategory) return false;
        }
        
        // Check cuisine filters
        if (recipeFilters.cuisines.size > 0) {
            const recipeCuisine = recipe.strArea || '';
            const matchesCuisine = Array.from(recipeFilters.cuisines).some(cuisine => 
                recipeCuisine.toLowerCase().includes(cuisine.toLowerCase()) ||
                cuisine.toLowerCase().includes(recipeCuisine.toLowerCase())
            );
            if (!matchesCuisine) return false;
        }
        
        // Check dish type filters (based on tags or name)
        if (recipeFilters.dishTypes.size > 0) {
            const recipeTags = (recipe.strTags || '').toLowerCase();
            const recipeName = (recipe.strMeal || '').toLowerCase();
            const recipeInstructions = (recipe.strInstructions || '').toLowerCase();
            
            const matchesDishType = Array.from(recipeFilters.dishTypes).some(dishType => {
                const dishLower = dishType.toLowerCase();
                return recipeTags.includes(dishLower) || 
                       recipeName.includes(dishLower) ||
                       recipeInstructions.includes(dishLower) ||
                       dishType.toLowerCase().includes(recipe.strCategory?.toLowerCase() || '');
            });
            if (!matchesDishType) return false;
        }
        
        // Check dietary filters (based on tags, ingredients, or name)
        if (recipeFilters.dietary.size > 0) {
            const recipeTags = (recipe.strTags || '').toLowerCase();
            const recipeName = (recipe.strMeal || '').toLowerCase();
            const ingredients = getRecipeIngredients(recipe).join(' ').toLowerCase();
            
            const matchesDietary = Array.from(recipeFilters.dietary).some(dietary => {
                const dietaryLower = dietary.toLowerCase();
                
                // Check for dietary keywords
                if (dietaryLower.includes('vegetarian') && 
                    (recipeTags.includes('vegetarian') || recipeName.includes('vegetarian') || 
                     !ingredients.includes('meat') && !ingredients.includes('chicken') && !ingredients.includes('beef'))) {
                    return true;
                }
                
                if (dietaryLower.includes('vegan') && 
                    (recipeTags.includes('vegan') || recipeName.includes('vegan'))) {
                    return true;
                }
                
                if (dietaryLower.includes('gluten') && 
                    (recipeTags.includes('gluten') || recipeName.includes('gluten'))) {
                    return true;
                }
                
                return recipeTags.includes(dietaryLower) || recipeName.includes(dietaryLower);
            });
            if (!matchesDietary) return false;
        }
        
        return true;
    });
}

function displayRecipeResults(recipes) {
    const resultsContainer = document.getElementById('recipe-results');
    if (!resultsContainer) return;
    
    if (!recipes || recipes.length === 0) {
        resultsContainer.innerHTML = `
            <div class="recipe-results empty">
                <h3>🔍 No Recipes Found</h3>
                <p>No recipes match your current filters. Try adjusting your selection.</p>
                <div style="margin-top: 1rem;">
                    <button class="action-btn clear-btn" onclick="clearAllFilters()">🗑️ Clear Filters</button>
                    <button class="action-btn random-btn" onclick="getRandomRecipe()">🎲 Random Recipe</button>
                </div>
            </div>
        `;
        return;
    }
    
    // Remove duplicates based on recipe ID
    const uniqueRecipes = recipes.filter((recipe, index, self) => 
        index === self.findIndex(r => r.idMeal === recipe.idMeal)
    );
    
    const recipesHtml = uniqueRecipes.map(recipe => {
        const ingredients = getRecipeIngredients(recipe);
        const tags = recipe.strTags ? recipe.strTags.split(',').map(tag => tag.trim()) : [];
        
        return `
            <div class="recipe-result-card" onclick="viewRecipeDetails('${recipe.idMeal}')">
                <div class="recipe-result-image">
                    ${recipe.strMealThumb ? 
                        `<img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" loading="lazy">` : 
                        '<div style="height: 200px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #64748b;">🍽️ No Image</div>'
                    }
                </div>
                <div class="recipe-result-content">
                    <h3 class="recipe-result-title">${recipe.strMeal}</h3>
                    <div class="recipe-result-meta">
                        ${recipe.strCategory ? `<span class="recipe-result-badge">${recipe.strCategory}</span>` : ''}
                        ${recipe.strArea ? `<span class="recipe-result-badge">${recipe.strArea}</span>` : ''}
                        <span class="recipe-result-badge">${ingredients.length} ingredients</span>
                    </div>
                    ${recipe.strInstructions ? 
                        `<p class="recipe-result-description">${recipe.strInstructions.substring(0, 120)}${recipe.strInstructions.length > 120 ? '...' : ''}</p>` : 
                        ''
                    }
                    ${tags.length > 0 ? `
                        <div class="recipe-result-tags">
                            ${tags.slice(0, 4).map(tag => `<span class="recipe-result-tag">${tag}</span>`).join('')}
                            ${tags.length > 4 ? `<span class="recipe-result-tag">+${tags.length - 4} more</span>` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    resultsContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem;">
            <h3 style="color: #1e293b; margin-bottom: 0.5rem;">🎯 Found ${uniqueRecipes.length} Recipe${uniqueRecipes.length !== 1 ? 's' : ''}</h3>
            <p style="color: #64748b;">Click any recipe to view full details</p>
        </div>
        <div class="recipe-grid">
            ${recipesHtml}
        </div>
    `;
}

async function getRandomRecipe() {
    const resultsContainer = document.getElementById('recipe-results');
    if (!resultsContainer) return;
    
    // Show loading state
    resultsContainer.innerHTML = '<div class="recipe-results loading">🎲 Getting random recipe...</div>';
    
    try {
        const response = await fetch('/api/json/v1/1/random.php');
        const data = await response.json();
        
        if (data.meals && data.meals[0]) {
            displayRecipeResults([data.meals[0]]);
        } else {
            throw new Error('No recipe returned');
        }
    } catch (error) {
        console.error('Error getting random recipe:', error);
        resultsContainer.innerHTML = `
            <div class="recipe-results empty">
                <h3>❌ Error</h3>
                <p>Failed to get random recipe. Please try again.</p>
                <button class="action-btn random-btn" onclick="getRandomRecipe()">🔄 Try Again</button>
            </div>
        `;
    }
}

async function viewRecipeDetails(recipeId) {
    try {
        const response = await fetch(`/api/json/v1/1/lookup.php?i=${recipeId}`);
        const data = await response.json();
        
        if (data.meals && data.meals[0]) {
            // Use existing enhanced display function
            const resultsDiv = document.getElementById('recipe-results');
            displayApiResults(data, `/api/json/v1/1/lookup.php?i=${recipeId}`);
            
            // Scroll to results
            resultsDiv.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Error loading recipe details:', error);
        alert('Failed to load recipe details. Please try again.');
    }
}