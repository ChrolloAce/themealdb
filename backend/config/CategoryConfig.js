/**
 * CategoryConfig.js
 * Centralized configuration for recipe categories
 */

class CategoryConfig {
  constructor() {
    // Primary meal type categories (what should be in strCategory)
    this.mealCategories = [
      'Breakfast',
      'Brunch',
      'Lunch',
      'Dinner',
      'Snack',
      'Dessert'
    ];

    // Dish types (what should be in dishType field)
    this.dishTypes = [
      'Appetizer',
      'Soup',
      'Salad',
      'Main Course',
      'Side Dish',
      'Dessert',
      'Beverage',
      'Snack',
      'Sandwich',
      'Pasta',
      'Rice Dish',
      'Seafood',
      'Beef',
      'Chicken',
      'Pork',
      'Lamb',
      'Vegetarian',
      'Vegan'
    ];

    // Mapping of old categories to new meal categories
    this.categoryMapping = {
      // Protein-based categories -> Dinner/Lunch
      'Beef': 'Dinner',
      'Chicken': 'Dinner',
      'Seafood': 'Dinner',
      'Pork': 'Dinner',
      'Lamb': 'Dinner',
      'Goat': 'Dinner',
      
      // Meal types
      'Breakfast': 'Breakfast',
      'Dessert': 'Dessert',
      'Starter': 'Lunch',
      'Side': 'Lunch',
      
      // Dish types -> appropriate meal category
      'Pasta': 'Dinner',
      'Main Dish': 'Dinner',
      'Main Course': 'Dinner',
      'Appetizer': 'Lunch',
      'Soup': 'Lunch',
      'Salad': 'Lunch',
      'Sandwich': 'Lunch',
      'Beverage': 'Snack',
      
      // Dietary types -> Lunch/Dinner
      'Vegetarian': 'Lunch',
      'Vegan': 'Lunch',
      
      // Default
      'Miscellaneous': 'Dinner'
    };

    // Dish type mapping (for the dishType field)
    this.dishTypeMapping = {
      'Beef': 'Main Course',
      'Chicken': 'Main Course',
      'Seafood': 'Seafood',
      'Pork': 'Main Course',
      'Lamb': 'Main Course',
      'Goat': 'Main Course',
      'Pasta': 'Pasta',
      'Main Dish': 'Main Course',
      'Main Course': 'Main Course',
      'Appetizer': 'Appetizer',
      'Starter': 'Appetizer',
      'Side': 'Side Dish',
      'Soup': 'Soup',
      'Salad': 'Salad',
      'Sandwich': 'Sandwich',
      'Dessert': 'Dessert',
      'Beverage': 'Beverage',
      'Vegetarian': 'Vegetarian',
      'Vegan': 'Vegan',
      'Breakfast': 'Breakfast',
      'Miscellaneous': 'Main Course'
    };
  }

  /**
   * Get the correct meal category for a given old category
   */
  getMealCategory(oldCategory) {
    if (!oldCategory) return 'Dinner';
    return this.categoryMapping[oldCategory] || 'Dinner';
  }

  /**
   * Get the correct dish type for a given old category
   */
  getDishType(oldCategory) {
    if (!oldCategory) return 'Main Course';
    return this.dishTypeMapping[oldCategory] || 'Main Course';
  }

  /**
   * Check if a category is a valid meal category
   */
  isValidMealCategory(category) {
    return this.mealCategories.includes(category);
  }

  /**
   * Get all valid meal categories
   */
  getMealCategories() {
    return [...this.mealCategories];
  }

  /**
   * Get all valid dish types
   */
  getDishTypes() {
    return [...this.dishTypes];
  }
}

module.exports = new CategoryConfig();
