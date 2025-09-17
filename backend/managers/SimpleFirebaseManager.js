// Simple Firebase Manager - NO service account bullshit needed!
// Uses the regular Firebase web SDK, not the admin SDK

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy, limit } = require('firebase/firestore');

class SimpleFirebaseManager {
  constructor() {
    // Simple Firebase config - NO service account needed!
    const firebaseConfig = {
      apiKey: "AIzaSyBLoZwcUJzLLeAbp2ITuedA3ZbCmWPZAAI",
      authDomain: "fooddb-d274c.firebaseapp.com",
      projectId: "fooddb-d274c",
      storageBucket: "fooddb-d274c.firebasestorage.app",
      messagingSenderId: "282379145030",
      appId: "1:282379145030:web:4274bb60d94eb138f0df47"
    };

    // Initialize Firebase with simple web SDK
    this.app = initializeApp(firebaseConfig);
    this.db = getFirestore(this.app);
    
    this.collections = {
      recipes: 'recipes',
      categories: 'categories', 
      areas: 'areas',
      ingredients: 'ingredients'
    };
    
    console.log('🔥 Simple Firebase Manager initialized (no service account needed!)');
  }

  async initialize() {
    try {
      // Test connection by trying to read from a collection
      const recipesRef = collection(this.db, this.collections.recipes);
      await getDocs(query(recipesRef, limit(1)));
      
      await this.seedInitialData();
      console.log('✅ Simple Firebase Database initialized successfully');
    } catch (error) {
      console.error('❌ Simple Firebase Database initialization failed:', error);
      throw error;
    }
  }

  // Add a recipe
  async addRecipe(recipeData) {
    try {
      // Generate ID for compatibility
      const recipeId = Date.now().toString();
      recipeData.idMeal = recipeId;
      recipeData.dateModified = new Date().toISOString();
      
      const docRef = await addDoc(collection(this.db, this.collections.recipes), recipeData);
      console.log('✅ Recipe added to Firebase:', docRef.id);
      
      return {
        success: true,
        id: docRef.id,
        idMeal: recipeId,
        ...recipeData
      };
    } catch (error) {
      console.error('❌ Error adding recipe to Firebase:', error);
      throw error;
    }
  }

  // Get a single recipe
  async getRecipe(id) {
    try {
      const docRef = doc(this.db, this.collections.recipes, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return { id: docSnap.id, ...docSnap.data() };
    } catch (error) {
      console.error('❌ Error getting recipe from Firebase:', error);
      throw error;
    }
  }

  // Get all recipes
  async getAllRecipes(limitCount = 50) {
    try {
      const recipesRef = collection(this.db, this.collections.recipes);
      const q = query(recipesRef, orderBy('dateModified', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error getting recipes from Firebase:', error);
      throw error;
    }
  }

  // Update a recipe
  async updateRecipe(id, updateData) {
    try {
      updateData.dateModified = new Date().toISOString();
      const docRef = doc(this.db, this.collections.recipes, id);
      await updateDoc(docRef, updateData);
      console.log('✅ Recipe updated in Firebase:', id);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating recipe in Firebase:', error);
      throw error;
    }
  }

  // Delete a recipe
  async deleteRecipe(id) {
    try {
      const docRef = doc(this.db, this.collections.recipes, id);
      await deleteDoc(docRef);
      console.log('✅ Recipe deleted from Firebase:', id);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting recipe from Firebase:', error);
      throw error;
    }
  }

  // Search recipes
  async searchRecipes(searchTerm) {
    try {
      // Get all recipes and filter client-side (simple but works)
      const recipesRef = collection(this.db, this.collections.recipes);
      const querySnapshot = await getDocs(recipesRef);
      
      const results = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(recipe => 
          recipe.strMeal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.strCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.strArea?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      return results;
    } catch (error) {
      console.error('❌ Error searching recipes in Firebase:', error);
      throw error;
    }
  }

  // Get recipes by category
  async getRecipesByCategory(category) {
    try {
      const recipesRef = collection(this.db, this.collections.recipes);
      const q = query(recipesRef, where('strCategory', '==', category));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error getting recipes by category:', error);
      throw error;
    }
  }

  // Get recipes by area
  async getRecipesByArea(area) {
    try {
      const recipesRef = collection(this.db, this.collections.recipes);
      const q = query(recipesRef, where('strArea', '==', area));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error getting recipes by area:', error);
      throw error;
    }
  }

  // Get recipes by ingredient (client-side filtering)
  async getRecipesByIngredient(ingredient) {
    try {
      // Get all recipes and filter client-side
      const recipesRef = collection(this.db, this.collections.recipes);
      const querySnapshot = await getDocs(recipesRef);
      
      const results = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(recipe => {
          // Check all ingredient fields (strIngredient1 through strIngredient20)
          for (let i = 1; i <= 20; i++) {
            const ingredientField = recipe[`strIngredient${i}`];
            if (ingredientField && 
                ingredientField.toLowerCase().includes(ingredient.toLowerCase())) {
              return true;
            }
          }
          return false;
        });
      
      return results;
    } catch (error) {
      console.error('❌ Error getting recipes by ingredient:', error);
      throw error;
    }
  }

  // Get recipe by idMeal (for API compatibility)
  async getRecipeByIdMeal(idMeal) {
    try {
      // Get all recipes and find by idMeal
      const recipesRef = collection(this.db, this.collections.recipes);
      const querySnapshot = await getDocs(recipesRef);
      
      const result = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .find(recipe => recipe.idMeal === idMeal || recipe.idMeal === idMeal.toString());
      
      return result || null;
    } catch (error) {
      console.error('❌ Error getting recipe by idMeal:', error);
      throw error;
    }
  }

  // Get categories
  async getCategories() {
    try {
      const categoriesRef = collection(this.db, this.collections.categories);
      const querySnapshot = await getDocs(categoriesRef);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error getting categories:', error);
      throw error;
    }
  }

  // Get areas
  async getAreas() {
    try {
      const areasRef = collection(this.db, this.collections.areas);
      const querySnapshot = await getDocs(areasRef);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error getting areas:', error);
      throw error;
    }
  }

  // Seed initial data
  async seedInitialData() {
    try {
      console.log('🔥 Simple Firebase database ready - seeding basic data');
      
      // Seed essential categories
      const categories = [
        'Beef', 'Chicken', 'Dessert', 'Lamb', 'Miscellaneous', 'Pasta', 'Pork', 
        'Seafood', 'Side', 'Starter', 'Vegan', 'Vegetarian', 'Breakfast', 'Goat'
      ];
      
      const categoriesRef = collection(this.db, this.collections.categories);
      const categoriesSnapshot = await getDocs(categoriesRef);
      
      if (categoriesSnapshot.empty) {
        for (const category of categories) {
          await addDoc(categoriesRef, {
            strCategory: category,
            strCategoryDescription: `${category} recipes`
          });
        }
        console.log('✅ Categories seeded');
      }

      // Seed essential areas
      const areas = [
        'American', 'British', 'Canadian', 'Chinese', 'Croatian', 'Dutch', 'Egyptian',
        'French', 'Greek', 'Indian', 'Irish', 'Italian', 'Jamaican', 'Japanese',
        'Kenyan', 'Malaysian', 'Mexican', 'Moroccan', 'Polish', 'Portuguese',
        'Russian', 'Spanish', 'Thai', 'Tunisian', 'Turkish', 'Unknown', 'Vietnamese'
      ];
      
      const areasRef = collection(this.db, this.collections.areas);
      const areasSnapshot = await getDocs(areasRef);
      
      if (areasSnapshot.empty) {
        for (const area of areas) {
          await addDoc(areasRef, {
            strArea: area
          });
        }
        console.log('✅ Areas seeded');
      }

    } catch (error) {
      console.error('❌ Error seeding initial data:', error);
      // Don't throw - this is not critical
    }
  }

  // Compatibility methods for existing code
  async get(query, params = []) {
    if (query.includes('COUNT(*)')) {
      const collectionName = this.extractCollection(query);
      const snapshot = await getDocs(collection(this.db, collectionName));
      return { count: snapshot.size };
    }
    
    // Handle single recipe lookup by idMeal
    if (query.includes('WHERE idMeal = ?') && params.length > 0) {
      return await this.getRecipeByIdMeal(params[0]);
    }
    
    return null;
  }

  async all(query, params = []) {
    const collectionName = this.extractCollection(query);
    const snapshot = await getDocs(collection(this.db, collectionName));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async run(query, params = []) {
    return { lastID: null, changes: 1 };
  }

  extractCollection(query) {
    if (query.toLowerCase().includes('recipes')) return this.collections.recipes;
    if (query.toLowerCase().includes('categories')) return this.collections.categories;
    if (query.toLowerCase().includes('areas')) return this.collections.areas;
    if (query.toLowerCase().includes('ingredients')) return this.collections.ingredients;
    return this.collections.recipes;
  }

  async close() {
    console.log('🔥 Simple Firebase connection remains open (managed automatically)');
  }
}

module.exports = SimpleFirebaseManager;