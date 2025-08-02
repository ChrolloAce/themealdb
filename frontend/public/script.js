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

// Initialize with search example and setup event listeners
document.addEventListener('DOMContentLoaded', () => {
    showExample('search');
    setupEventListeners();
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