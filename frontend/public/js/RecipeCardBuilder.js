/**
 * RecipeCardBuilder - Builds HTML for recipe cards
 * Single Responsibility: HTML generation for recipe UI elements
 */

class RecipeCardBuilder {
  /**
   * Create a recipe preview card
   */
  static createPreviewCard(recipe) {
    const ingredients = RecipeCardBuilder.getIngredients(recipe);
    const tags = recipe.strTags ? recipe.strTags.split(',').map(tag => tag.trim()) : [];

    return `
      <div class="recipe-result-card" data-recipe-id="${recipe.idMeal}" data-action="view-details">
        ${RecipeCardBuilder.createCardImage(recipe)}
        ${RecipeCardBuilder.createCardContent(recipe, ingredients, tags)}
      </div>
    `;
  }

  /**
   * Create detailed recipe card for API results
   */
  static createDetailedCard(recipe, index) {
    const ingredients = RecipeCardBuilder.getIngredients(recipe);

    return `
      <div class="recipe-card">
        <div class="recipe-header">
          <h4>${recipe.strMeal}</h4>
          <span class="recipe-meta">${recipe.strCategory} • ${recipe.strArea}</span>
        </div>

        ${RecipeCardBuilder.createRecipeImage(recipe)}
        <div class="recipe-details">
          ${RecipeCardBuilder.createIngredientsSection(ingredients)}
          ${RecipeCardBuilder.createEquipmentSection(recipe)}
          ${RecipeCardBuilder.createNutritionSection(recipe)}
          ${RecipeCardBuilder.createInstructionsSection(recipe)}
          ${RecipeCardBuilder.createTagsSection(recipe)}
        </div>

        <div class="json-toggle">
          <button class="toggle-btn toggle-recipe-json" data-recipe-index="${index}">
            📄 Show JSON Data
          </button>
          <pre id="json-${index}" class="json-data" style="display:none;">${JSON.stringify(recipe, null, 2)}</pre>
        </div>
      </div>
    `;
  }

  /**
   * Create card image (small)
   */
  static createCardImage(recipe) {
    if (recipe.strMealThumb) {
      return `
        <div class="recipe-result-image">
          <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" loading="lazy">
        </div>
      `;
    }
    return `
      <div class="recipe-result-image">
        <div style="height: 200px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #64748b;">
          🍽️ No Image
        </div>
      </div>
    `;
  }

  /**
   * Create recipe image (large)
   */
  static createRecipeImage(recipe) {
    if (!recipe.strMealThumb) return '';

    return `
      <div class="recipe-image">
        <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" class="recipe-img">
        <div class="image-error" style="display:none;">
          <span>🖼️ Image not available</span>
        </div>
      </div>
    `;
  }

  /**
   * Create card content
   */
  static createCardContent(recipe, ingredients, tags) {
    return `
      <div class="recipe-result-content">
        <h3 class="recipe-result-title">${recipe.strMeal}</h3>
        ${RecipeCardBuilder.createMetaBadges(recipe, ingredients)}
        ${RecipeCardBuilder.createNutritionQuick(recipe)}
        ${RecipeCardBuilder.createEquipmentQuick(recipe)}
        ${RecipeCardBuilder.createDescription(recipe)}
        ${RecipeCardBuilder.createTagsList(tags)}
      </div>
    `;
  }

  /**
   * Create meta badges
   */
  static createMetaBadges(recipe, ingredients) {
    const badges = [];

    if (recipe.strCategory) {
      badges.push(`<span class="recipe-result-badge">${recipe.strCategory}</span>`);
    }

    if (recipe.strArea) {
      badges.push(`<span class="recipe-result-badge">${recipe.strArea}</span>`);
    }

    badges.push(`<span class="recipe-result-badge">${ingredients.length} ingredients</span>`);

    if (recipe.nutrition && recipe.nutrition.caloriesPerServing > 0) {
      badges.push(`<span class="recipe-result-badge calories-badge">🔥 ${recipe.nutrition.caloriesPerServing} cal</span>`);
    }

    return `<div class="recipe-result-meta">${badges.join('')}</div>`;
  }

  /**
   * Create nutrition quick preview
   */
  static createNutritionQuick(recipe) {
    if (!recipe.nutrition || recipe.nutrition.caloriesPerServing <= 0) {
      return '';
    }

    return `
      <div class="nutrition-quick">
        <span class="nutrition-quick-item"><strong>${recipe.nutrition.protein}g</strong> protein</span>
        <span class="nutrition-quick-item"><strong>${recipe.nutrition.carbs}g</strong> carbs</span>
        <span class="nutrition-quick-item"><strong>${recipe.nutrition.fat}g</strong> fat</span>
      </div>
    `;
  }

  /**
   * Create equipment quick preview
   */
  static createEquipmentQuick(recipe) {
    if (!recipe.strEquipment) return '';

    const equipment = recipe.strEquipment.split(',').slice(0, 3).join(', ');
    const hasMore = recipe.strEquipment.split(',').length > 3;

    return `
      <div class="equipment-quick">
        <span style="font-size: 0.85rem; color: #64748b;">
          🍳 Equipment: ${equipment}${hasMore ? '...' : ''}
        </span>
      </div>
    `;
  }

  /**
   * Create description
   */
  static createDescription(recipe) {
    if (!recipe.strInstructions) return '';

    const truncated = recipe.strInstructions.substring(0, 120);
    const needsEllipsis = recipe.strInstructions.length > 120;

    return `<p class="recipe-result-description">${truncated}${needsEllipsis ? '...' : ''}</p>`;
  }

  /**
   * Create tags list
   */
  static createTagsList(tags) {
    if (tags.length === 0) return '';

    const visibleTags = tags.slice(0, 4).map(tag =>
      `<span class="recipe-result-tag">${tag}</span>`
    ).join('');

    const moreTag = tags.length > 4
      ? `<span class="recipe-result-tag">+${tags.length - 4} more</span>`
      : '';

    return `
      <div class="recipe-result-tags">
        ${visibleTags}
        ${moreTag}
      </div>
    `;
  }

  /**
   * Create ingredients section
   */
  static createIngredientsSection(ingredients) {
    if (ingredients.length === 0) return '';

    const tags = ingredients.map(ing =>
      `<span class="ingredient-tag">${ing}</span>`
    ).join('');

    return `
      <div class="ingredients-section">
        <h5>📝 Ingredients (${ingredients.length})</h5>
        <div class="ingredients-list">${tags}</div>
      </div>
    `;
  }

  /**
   * Create equipment section
   */
  static createEquipmentSection(recipe) {
    if (!recipe.strEquipment && (!recipe.equipmentRequired || recipe.equipmentRequired.length === 0)) {
      return '';
    }

    const hasArray = recipe.equipmentRequired && Array.isArray(recipe.equipmentRequired) && recipe.equipmentRequired.length > 0;

    if (hasArray) {
      const tags = recipe.equipmentRequired.map(eq =>
        `<span class="equipment-tag">${eq}</span>`
      ).join('');

      return `
        <div class="equipment-section">
          <h5>🍳 Required Equipment</h5>
          <div class="equipment-list">${tags}</div>
        </div>
      `;
    }

    return `
      <div class="equipment-section">
        <h5>🍳 Required Equipment</h5>
        <p class="equipment-text">${recipe.strEquipment}</p>
      </div>
    `;
  }

  /**
   * Create nutrition section
   */
  static createNutritionSection(recipe) {
    if (!recipe.nutrition || !recipe.nutrition.caloriesPerServing || recipe.nutrition.caloriesPerServing <= 0) {
      return '';
    }

    const n = recipe.nutrition;

    const items = [
      { label: 'Calories', value: `${n.caloriesPerServing} kcal` },
      { label: 'Protein', value: `${n.protein}g` },
      { label: 'Carbs', value: `${n.carbs}g` },
      { label: 'Fat', value: `${n.fat}g` }
    ];

    if (n.fiber) items.push({ label: 'Fiber', value: `${n.fiber}g` });
    if (n.sodium) items.push({ label: 'Sodium', value: `${n.sodium}mg` });

    const itemsHTML = items.map(item => `
      <div class="nutrition-item">
        <span class="nutrition-label">${item.label}</span>
        <span class="nutrition-value">${item.value}</span>
      </div>
    `).join('');

    return `
      <div class="nutrition-section">
        <h5>💪 Nutrition (per serving)</h5>
        <div class="nutrition-grid">${itemsHTML}</div>
      </div>
    `;
  }

  /**
   * Create instructions section
   */
  static createInstructionsSection(recipe) {
    if (!recipe.strInstructions) return '';

    const truncated = recipe.strInstructions.substring(0, 200);
    const needsEllipsis = recipe.strInstructions.length > 200;

    return `
      <div class="instructions-section">
        <h5>📋 Instructions</h5>
        <p class="instructions-text">${truncated}${needsEllipsis ? '...' : ''}</p>
      </div>
    `;
  }

  /**
   * Create tags section
   */
  static createTagsSection(recipe) {
    if (!recipe.strTags) return '';

    const tags = recipe.strTags.split(',').map(tag =>
      `<span class="tag">${tag.trim()}</span>`
    ).join('');

    return `
      <div class="tags-section">
        <h5>🏷️ Tags</h5>
        <div class="tags-list">${tags}</div>
      </div>
    `;
  }

  /**
   * Extract ingredients from recipe (MODERN FORMAT)
   */
  static getIngredients(recipe) {
    const ingredients = [];
    
    // ✅ Try modern ingredientsDetailed format first
    if (recipe.ingredientsDetailed && Array.isArray(recipe.ingredientsDetailed)) {
      recipe.ingredientsDetailed.forEach(ing => {
        // Handle "to taste" measurements specially
        if (ing.unit && ing.unit.toLowerCase().includes('to taste')) {
          ingredients.push(`${ing.name} to taste`);
        } else {
          const measure = `${ing.quantity || ''} ${ing.unit || ''}`.trim();
          ingredients.push(`${measure} ${ing.name}`.trim());
        }
      });
      return ingredients;
    }
    
    // ❌ Fallback to old strIngredient1-20 format (during migration only)
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipe[`strIngredient${i}`];
      const measure = recipe[`strMeasure${i}`];
      if (ingredient && ingredient.trim()) {
        // Handle "to taste" measurements specially
        if (measure && measure.toLowerCase().includes('to taste')) {
          ingredients.push(`${ingredient} to taste`.trim());
        } else {
          ingredients.push(`${measure || ''} ${ingredient}`.trim());
        }
      }
    }
    return ingredients;
  }
}

// Export for use in other modules
window.RecipeCardBuilder = RecipeCardBuilder;

