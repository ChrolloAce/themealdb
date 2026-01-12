// Modern Recipe Display Function
function displayModernRecipe(recipe, imageUrl = null) {
  // Get ingredients properly
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = recipe[`strIngredient${i}`];
    const measure = recipe[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push({
        name: ingredient.trim(),
        amount: measure ? measure.trim() : ''
      });
    }
  }
  
  // Parse instructions into steps - handle multiple formats
  const instructions = recipe.strInstructions || '';
  let steps = [];
  
  // Try to split by "Step X:" pattern first
  const stepPattern = /Step \d+:/gi;
  if (stepPattern.test(instructions)) {
    const stepParts = instructions.split(/Step \d+:/gi).filter(s => s.trim());
    steps = stepParts.map((step, index) => ({
      number: index + 1,
      text: step.trim()
    }));
  } 
  // Try numbered patterns like "1." or "1)"
  else if (/^\d+[.)]/m.test(instructions)) {
    const numberedParts = instructions.split(/^\d+[.)]/m).filter(s => s.trim());
    steps = numberedParts.map((step, index) => ({
      number: index + 1,
      text: step.trim()
    }));
  }
  // If no clear pattern, split by periods but keep meaningful chunks
  else if (instructions) {
    // Split by periods but try to keep logical groupings
    const sentences = instructions.split(/\.\s+/);
    const logicalSteps = [];
    let currentStep = '';
    
    sentences.forEach(sentence => {
      currentStep += sentence + '. ';
      // Create a new step every 2-3 sentences or at logical breaks
      if (currentStep.length > 150 || 
          sentence.toLowerCase().includes('serve') || 
          sentence.toLowerCase().includes('enjoy') ||
          sentence.toLowerCase().includes('meanwhile')) {
        if (currentStep.trim()) {
          logicalSteps.push(currentStep.trim());
          currentStep = '';
        }
      }
    });
    
    // Add any remaining content
    if (currentStep.trim()) {
      logicalSteps.push(currentStep.trim());
    }
    
    steps = logicalSteps.map((step, index) => ({
      number: index + 1,
      text: step
    }));
  }
  
  // Ensure we have at least one step
  if (steps.length === 0) {
    steps = [{
      number: 1,
      text: instructions || 'Follow standard cooking procedures for this recipe.'
    }];
  }
  
  // Parse equipment
  const equipment = recipe.equipment || recipe.strEquipment || '';
  const equipmentList = typeof equipment === 'string' 
    ? equipment.split(',').map(e => e.trim()).filter(e => e)
    : Array.isArray(equipment) ? equipment : [];
  
  return `
    <div class="recipe-display-modern">
      <!-- Recipe Header -->
      <div class="recipe-header-modern">
        <h1 class="recipe-title-modern">${recipe.strMeal || 'Untitled Recipe'}</h1>
        ${imageUrl ? `
          <img src="${imageUrl}" alt="${recipe.strMeal}" style="width: 100%; max-width: 600px; border-radius: 12px; margin-top: 1rem;">
        ` : ''}
      </div>
      
      ${recipe.additionalImages && recipe.additionalImages.length > 1 ? `
        <!-- Multiple Images Gallery -->
        <div class="additional-images-section">
          <h3 class="section-title"><i class="fas fa-images"></i> Recipe Gallery (${recipe.additionalImages.length} images)</h3>
          <div class="images-gallery">
            ${recipe.additionalImages.map((url, index) => `
              <div class="gallery-image-card">
                <img src="${url}" alt="${recipe.strMeal} ${index + 1}" onclick="viewImage('${url}')" style="cursor: pointer;">
                <div class="image-overlay">
                  <button class="image-action-btn" onclick="event.stopPropagation(); downloadImage('${url}', '${recipe.strMeal}_${index + 1}')" title="Download">
                    <i class="fas fa-download"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- Recipe Description -->
      ${recipe.strDescription ? `
        <div class="recipe-description">
          <p class="description-text">${recipe.strDescription}</p>
        </div>
      ` : ''}
      
      <!-- Stats Bar -->
      <div class="recipe-stats-bar">
        <div class="stat-badge">
          <span class="stat-badge-icon">⏱️</span>
          <div class="stat-badge-content">
            <span class="stat-badge-label">Prep</span>
            <span class="stat-badge-value">${recipe.prepTime ? recipe.prepTime + ' min' : recipe.strPrepTime || '15 min'}</span>
          </div>
        </div>
        <div class="stat-badge">
          <span class="stat-badge-icon">🔥</span>
          <div class="stat-badge-content">
            <span class="stat-badge-label">Cook</span>
            <span class="stat-badge-value">${recipe.cookTime ? recipe.cookTime + ' min' : recipe.strCookTime || '30 min'}</span>
          </div>
        </div>
        <div class="stat-badge">
          <span class="stat-badge-icon">⏰</span>
          <div class="stat-badge-content">
            <span class="stat-badge-label">Total</span>
            <span class="stat-badge-value">${recipe.totalTime ? recipe.totalTime + ' min' : recipe.strTotalTime || '45 min'}</span>
          </div>
        </div>
        <div class="stat-badge">
          <span class="stat-badge-icon">🍽️</span>
          <div class="stat-badge-content">
            <span class="stat-badge-label">Serves</span>
            <span class="stat-badge-value">${recipe.numberOfServings || recipe.servings || recipe.strServings || '4'}</span>
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
            <span class="stat-badge-value">${recipe.yield || 'Serves ' + (recipe.numberOfServings || '4')}</span>
          </div>
        </div>
      </div>
      
      <!-- Nutritional Information -->
      ${recipe.nutrition ? `
        <div class="nutrition-section">
          <div class="ingredients-grid-header">
            <span class="ingredients-grid-title">📊 Nutritional Information (Per Serving)</span>
          </div>
          <div class="nutrition-grid">
            <div class="nutrition-card primary">
              <div class="nutrition-icon">🔥</div>
              <div class="nutrition-details">
                <div class="nutrition-value">${recipe.nutrition.caloriesPerServing || 0}</div>
                <div class="nutrition-label">Calories</div>
              </div>
            </div>
            <div class="nutrition-card">
              <div class="nutrition-icon">🥩</div>
              <div class="nutrition-details">
                <div class="nutrition-value">${recipe.nutrition.protein || 0}g</div>
                <div class="nutrition-label">Protein</div>
              </div>
            </div>
            <div class="nutrition-card">
              <div class="nutrition-icon">🍞</div>
              <div class="nutrition-details">
                <div class="nutrition-value">${recipe.nutrition.carbs || 0}g</div>
                <div class="nutrition-label">Carbs</div>
              </div>
            </div>
            <div class="nutrition-card">
              <div class="nutrition-icon">🥑</div>
              <div class="nutrition-details">
                <div class="nutrition-value">${recipe.nutrition.fat || 0}g</div>
                <div class="nutrition-label">Fat</div>
              </div>
            </div>
            <div class="nutrition-card">
              <div class="nutrition-icon">🌾</div>
              <div class="nutrition-details">
                <div class="nutrition-value">${recipe.nutrition.fiber || 0}g</div>
                <div class="nutrition-label">Fiber</div>
              </div>
            </div>
            <div class="nutrition-card">
              <div class="nutrition-icon">🍯</div>
              <div class="nutrition-details">
                <div class="nutrition-value">${recipe.nutrition.sugar || 0}g</div>
                <div class="nutrition-label">Sugar</div>
              </div>
            </div>
            <div class="nutrition-card">
              <div class="nutrition-icon">🧂</div>
              <div class="nutrition-details">
                <div class="nutrition-value">${recipe.nutrition.sodium || 0}mg</div>
                <div class="nutrition-label">Sodium</div>
              </div>
            </div>
            <div class="nutrition-card">
              <div class="nutrition-icon">🍳</div>
              <div class="nutrition-details">
                <div class="nutrition-value">${recipe.nutrition.cholesterol || 0}mg</div>
                <div class="nutrition-label">Cholesterol</div>
              </div>
            </div>
          </div>
          
          <!-- Vitamins & Minerals -->
          <div class="vitamins-section">
            <h4 class="vitamins-title">💊 Vitamins & Minerals (% Daily Value)</h4>
            <div class="vitamins-grid">
              <div class="vitamin-item">
                <span class="vitamin-name">Vitamin A</span>
                <div class="vitamin-bar">
                  <div class="vitamin-fill" style="width: ${Math.min(recipe.nutrition.vitaminA || 0, 100)}%"></div>
                </div>
                <span class="vitamin-value">${recipe.nutrition.vitaminA || 0}%</span>
              </div>
              <div class="vitamin-item">
                <span class="vitamin-name">Vitamin C</span>
                <div class="vitamin-bar">
                  <div class="vitamin-fill" style="width: ${Math.min(recipe.nutrition.vitaminC || 0, 100)}%"></div>
                </div>
                <span class="vitamin-value">${recipe.nutrition.vitaminC || 0}%</span>
              </div>
              <div class="vitamin-item">
                <span class="vitamin-name">Iron</span>
                <div class="vitamin-bar">
                  <div class="vitamin-fill" style="width: ${Math.min(recipe.nutrition.iron || 0, 100)}%"></div>
                </div>
                <span class="vitamin-value">${recipe.nutrition.iron || 0}%</span>
              </div>
              <div class="vitamin-item">
                <span class="vitamin-name">Calcium</span>
                <div class="vitamin-bar">
                  <div class="vitamin-fill" style="width: ${Math.min(recipe.nutrition.calcium || 0, 100)}%"></div>
                </div>
                <span class="vitamin-value">${recipe.nutrition.calcium || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      ` : ''}
      
      <!-- Dietary Information -->
      ${recipe.dietary ? `
        <div class="dietary-section">
          <div class="ingredients-grid-header">
            <span class="ingredients-grid-title">🥗 Dietary Information</span>
          </div>
          <div class="dietary-badges">
            ${recipe.dietary.vegetarian ? '<span class="dietary-badge vegetarian">🌱 Vegetarian</span>' : ''}
            ${recipe.dietary.vegan ? '<span class="dietary-badge vegan">🌿 Vegan</span>' : ''}
            ${recipe.dietary.glutenFree ? '<span class="dietary-badge gluten-free">🌾 Gluten-Free</span>' : ''}
            ${recipe.dietary.dairyFree ? '<span class="dietary-badge dairy-free">🥛 Dairy-Free</span>' : ''}
            ${recipe.dietary.keto ? '<span class="dietary-badge keto">🥓 Keto</span>' : ''}
            ${recipe.dietary.paleo ? '<span class="dietary-badge paleo">🦴 Paleo</span>' : ''}
            ${recipe.allergenFlags && recipe.allergenFlags.length > 0 ? 
              recipe.allergenFlags.map(allergen => 
                `<span class="dietary-badge allergen">⚠️ Contains ${allergen}</span>`
              ).join('') : ''}
          </div>
        </div>
      ` : ''}
      
      <!-- Recipe Categories -->
      ${(recipe.mealType || recipe.occasion || recipe.seasonality) ? `
        <div class="categories-section">
          <div class="ingredients-grid-header">
            <span class="ingredients-grid-title">🏷️ Categories & Tags</span>
          </div>
          <div class="categories-grid">
            ${recipe.mealType && recipe.mealType.length > 0 ? `
              <div class="category-group">
                <h4 class="category-title">🍽️ Meal Type</h4>
                <div class="category-tags">
                  ${Array.isArray(recipe.mealType) ? 
                    recipe.mealType.map(type => `<span class="category-tag meal-type">${type}</span>`).join('') :
                    `<span class="category-tag meal-type">${recipe.mealType}</span>`}
                </div>
              </div>
            ` : ''}
            ${recipe.occasion && recipe.occasion.length > 0 ? `
              <div class="category-group">
                <h4 class="category-title">🎉 Occasion</h4>
                <div class="category-tags">
                  ${Array.isArray(recipe.occasion) ? 
                    recipe.occasion.map(occ => `<span class="category-tag occasion">${occ}</span>`).join('') :
                    `<span class="category-tag occasion">${recipe.occasion}</span>`}
                </div>
              </div>
            ` : ''}
            ${recipe.seasonality && recipe.seasonality.length > 0 ? `
              <div class="category-group">
                <h4 class="category-title">🌸 Season</h4>
                <div class="category-tags">
                  ${Array.isArray(recipe.seasonality) ? 
                    recipe.seasonality.map(season => `<span class="category-tag season">${season}</span>`).join('') :
                    `<span class="category-tag season">${recipe.seasonality}</span>`}
                </div>
              </div>
            ` : ''}
            ${recipe.skillsRequired && recipe.skillsRequired.length > 0 ? `
              <div class="category-group">
                <h4 class="category-title">👨‍🍳 Skills Required</h4>
                <div class="category-tags">
                  ${Array.isArray(recipe.skillsRequired) ? 
                    recipe.skillsRequired.map(skill => `<span class="category-tag skill">${skill}</span>`).join('') :
                    `<span class="category-tag skill">${recipe.skillsRequired}</span>`}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}
      
      <!-- Ingredients Grid -->
      <div class="ingredients-grid-modern">
        <div class="ingredients-grid-header">
          <span class="ingredients-grid-title">🥘 Ingredients</span>
        </div>
        <div class="ingredients-container">
          ${ingredients.map(ing => `
            <div class="ingredient-card">
              <div class="ingredient-icon">🥄</div>
              <div class="ingredient-details">
                <div class="ingredient-name">${ing.name}</div>
                <div class="ingredient-amount">${ing.amount}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Cooking Instruments Section -->
      <div class="ingredients-grid-modern">
        <div class="ingredients-grid-header">
          <span class="ingredients-grid-title">🔧 Cooking Instruments</span>
        </div>
        <div class="ingredients-container">
          ${equipmentList.length > 0 ? equipmentList.map(item => {
            // Try to determine the type of equipment for better icons
            let icon = '🔧';
            if (item.toLowerCase().includes('knife')) icon = '🔪';
            else if (item.toLowerCase().includes('pan') || item.toLowerCase().includes('skillet')) icon = '🍳';
            else if (item.toLowerCase().includes('pot')) icon = '🍲';
            else if (item.toLowerCase().includes('bowl')) icon = '🥣';
            else if (item.toLowerCase().includes('spoon') || item.toLowerCase().includes('whisk')) icon = '🥄';
            else if (item.toLowerCase().includes('board')) icon = '📋';
            else if (item.toLowerCase().includes('oven')) icon = '🔥';
            else if (item.toLowerCase().includes('thermometer')) icon = '🌡️';
            
            return `
              <div class="ingredient-card">
                <div class="ingredient-icon">${icon}</div>
                <div class="ingredient-details">
                  <div class="ingredient-name">${item}</div>
                  <div class="ingredient-amount">Required</div>
                </div>
              </div>
            `;
          }).join('') : `
            <div class="ingredient-card">
              <div class="ingredient-icon">🔧</div>
              <div class="ingredient-details">
                <div class="ingredient-name">Basic kitchen tools</div>
                <div class="ingredient-amount">Standard equipment</div>
              </div>
            </div>
          `}
        </div>
      </div>
      
      <!-- Detailed Instructions -->
      <div class="instructions-modern">
        <div class="ingredients-grid-header">
          <span class="ingredients-grid-title">👨‍🍳 Detailed Cooking Instructions</span>
        </div>
        <div class="instructions-intro">
          <p class="prep-note">📌 Read through all instructions before starting. Have all ingredients measured and equipment ready.</p>
        </div>
        ${steps.map(step => `
          <div class="instruction-step">
            <div class="step-number">${step.number}</div>
            <div class="step-content">
              <div class="step-text">${step.text}</div>
              ${step.text.match(/\d+°[CF]|\d+ degrees/i) ? 
                '<span class="step-tip">🌡️ Temperature specified</span>' : ''}
              ${step.text.match(/\d+ minutes?|\d+ hours?/i) ? 
                '<span class="step-tip">⏱️ Timing is important</span>' : ''}
            </div>
          </div>
        `).join('')}
        <div class="instructions-footer">
          <p class="serving-note">🍽️ Serve immediately for best results. Enjoy your homemade ${recipe.strMeal || 'dish'}!</p>
        </div>
      </div>
      
      <!-- Image Generation Section -->
      <div class="image-generation-modern">
        <div class="image-gen-header">
          <h3 class="image-gen-title">🎨 Generate Recipe Images</h3>
          <div class="batch-controls">
            <label>Number of images:</label>
            <input type="number" class="batch-input" id="batchImageCount" value="4" min="1" max="10">
            <button class="btn-generate-images" onclick="generateBatchImages('${recipe.strMeal}')">
              <i class="fas fa-images"></i>
              Generate Images
            </button>
          </div>
        </div>
        <div id="generatedImagesGrid" class="generated-images-grid"></div>
      </div>
    </div>
  `;
}

// Function to generate batch images
async function generateBatchImages(recipeName) {
  const count = parseInt(document.getElementById('batchImageCount').value) || 4;
  const grid = document.getElementById('generatedImagesGrid');
  
  // Show loading state
  grid.innerHTML = `
    <div class="image-generating">
      <div class="generating-spinner"></div>
      <div class="generating-text">Generating ${count} images...</div>
    </div>
  `;
  
  try {
    // Call the image generation API
    const response = await fetch('/admin/recipes/generate-images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.adminPanel?.token || ''}`
      },
      body: JSON.stringify({
        recipeName: recipeName,
        count: count
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.images) {
      grid.innerHTML = data.images.map((url, index) => `
        <div class="generated-image-card">
          <img src="${url}" alt="${recipeName} ${index + 1}">
          <div class="image-overlay">
            <div class="image-actions">
              <button class="image-action-btn" title="Download" onclick="downloadImage('${url}', '${recipeName}_${index + 1}')">
                <i class="fas fa-download"></i>
              </button>
              <button class="image-action-btn" title="View" onclick="viewImage('${url}')">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>
        </div>
      `).join('');
    } else {
      // Fallback to placeholder images
      const images = [];
      for (let i = 0; i < count; i++) {
        images.push(`https://via.placeholder.com/400x400?text=Recipe+Image+${i+1}`);
      }
      
      grid.innerHTML = images.map((url, index) => `
        <div class="generated-image-card">
          <img src="${url}" alt="${recipeName} ${index + 1}">
          <div class="image-overlay">
            <div class="image-actions">
              <button class="image-action-btn" title="Download">
                <i class="fas fa-download"></i>
              </button>
              <button class="image-action-btn" title="View">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Failed to generate images:', error);
    grid.innerHTML = '<div class="error-message">Failed to generate images. Please try again.</div>';
  }
}

// Helper functions for image actions
function downloadImage(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename + '.jpg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function viewImage(url) {
  window.open(url, '_blank');
}
