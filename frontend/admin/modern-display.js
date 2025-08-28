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
  
  // Parse instructions into steps
  const instructions = recipe.strInstructions || '';
  const steps = instructions
    .split(/Step \d+:|^\d+\.|^\d+\)/gm)
    .filter(step => step.trim())
    .map((step, index) => ({
      number: index + 1,
      text: step.replace(/^[:.]/, '').trim()
    }));
  
  // If no clear steps, just split by sentences
  if (steps.length <= 1 && instructions) {
    const sentences = instructions.match(/[^.!?]+[.!?]+/g) || [instructions];
    steps.length = 0;
    sentences.forEach((sentence, index) => {
      steps.push({
        number: index + 1,
        text: sentence.trim()
      });
    });
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
      
      <!-- Stats Bar -->
      <div class="recipe-stats-bar">
        <div class="stat-badge">
          <span class="stat-badge-icon">⏱️</span>
          <div class="stat-badge-content">
            <span class="stat-badge-label">Prep</span>
            <span class="stat-badge-value">${recipe.prepTime || recipe.strPrepTime || '15 min'}</span>
          </div>
        </div>
        <div class="stat-badge">
          <span class="stat-badge-icon">🔥</span>
          <div class="stat-badge-content">
            <span class="stat-badge-label">Cook</span>
            <span class="stat-badge-value">${recipe.cookTime || recipe.strCookTime || '30 min'}</span>
          </div>
        </div>
        <div class="stat-badge">
          <span class="stat-badge-icon">⏰</span>
          <div class="stat-badge-content">
            <span class="stat-badge-label">Total</span>
            <span class="stat-badge-value">${recipe.totalTime || recipe.strTotalTime || '45 min'}</span>
          </div>
        </div>
        <div class="stat-badge">
          <span class="stat-badge-icon">🍽️</span>
          <div class="stat-badge-content">
            <span class="stat-badge-label">Serves</span>
            <span class="stat-badge-value">${recipe.servings || recipe.strServings || '4'}</span>
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
            <span class="stat-badge-value">${recipe.yield || 'Serves 4'}</span>
          </div>
        </div>
      </div>
      
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
      
      ${equipmentList.length > 0 ? `
      <!-- Equipment Section -->
      <div class="equipment-section-modern">
        <div class="ingredients-grid-header">
          <span class="ingredients-grid-title">🔧 Equipment</span>
        </div>
        <div class="equipment-grid">
          ${equipmentList.map(item => `
            <span class="equipment-tag">
              <i class="fas fa-utensils"></i> ${item}
            </span>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- Instructions -->
      <div class="instructions-modern">
        <div class="ingredients-grid-header">
          <span class="ingredients-grid-title">📝 Instructions</span>
        </div>
        ${steps.map(step => `
          <div class="instruction-step">
            <div class="step-number">${step.number}</div>
            <div class="step-content">${step.text}</div>
          </div>
        `).join('')}
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
  
  // TODO: Call your image generation API here
  // For now, just simulate with placeholder
  setTimeout(() => {
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
  }, 2000);
}
