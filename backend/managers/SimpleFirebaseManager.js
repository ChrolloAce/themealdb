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
      // First try to find by idMeal (custom field)
      const recipesRef = collection(this.db, this.collections.recipes);
      const q = query(recipesRef, where('idMeal', '==', id), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      
      // Fallback: try as Firebase document ID
      const docRef = doc(this.db, this.collections.recipes, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.log(`❌ Recipe not found by idMeal or doc ID: ${id}`);
        return null;
      }
      
      return { id: docSnap.id, ...docSnap.data() };
    } catch (error) {
      console.error('❌ Error getting recipe from Firebase:', error);
      throw error;
    }
  }

  // Get all recipes
  async getAllRecipes(limitCount = 200) {
    try {
      const recipesRef = collection(this.db, this.collections.recipes);
      
      // For truly random selection, we need to get more recipes
      // If limitCount is high, get ALL recipes without limit for best randomness
      let q;
      if (limitCount >= 100) {
        // Get ALL recipes for maximum randomness
        q = query(recipesRef);
        console.log('🎲 Getting ALL recipes for maximum randomness');
      } else {
        // Use limit for smaller requests
        q = query(recipesRef, limit(limitCount));
        console.log(`🎲 Getting ${limitCount} recipes`);
      }
      
      const querySnapshot = await getDocs(q);
      
      const recipes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📊 Retrieved ${recipes.length} total recipes from Firebase`);
      
      // Remove duplicates based on idMeal or strMeal
      const uniqueRecipes = [];
      const seenIds = new Set();
      const seenNames = new Set();
      
      for (const recipe of recipes) {
        const id = recipe.idMeal || recipe.id;
        const name = recipe.strMeal?.toLowerCase();
        
        // Skip if we've seen this ID or name before
        if (seenIds.has(id) || seenNames.has(name)) {
          console.log(`🗑️ Removing duplicate: ${recipe.strMeal} (ID: ${id})`);
          continue;
        }
        
        seenIds.add(id);
        if (name) seenNames.add(name);
        uniqueRecipes.push(recipe);
      }
      
      if (uniqueRecipes.length < recipes.length) {
        console.log(`♻️ Deduplicated: ${recipes.length} → ${uniqueRecipes.length} unique recipes`);
      }
      
      // Advanced shuffling algorithm for better randomness (shuffle the unique recipes)
      for (let i = uniqueRecipes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniqueRecipes[i], uniqueRecipes[j]] = [uniqueRecipes[j], uniqueRecipes[i]];
      }
      
      // Additional shuffle for extra randomness
      const shuffleTimes = Math.floor(Math.random() * 3) + 1;
      for (let shuffle = 0; shuffle < shuffleTimes; shuffle++) {
        for (let i = uniqueRecipes.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [uniqueRecipes[i], uniqueRecipes[j]] = [uniqueRecipes[j], uniqueRecipes[i]];
        }
      }
      
      console.log(`🔀 Applied ${shuffleTimes + 1} rounds of shuffling to ${uniqueRecipes.length} unique recipes`);
      
      return uniqueRecipes;
    } catch (error) {
      console.error('❌ Error getting recipes from Firebase:', error);
      throw error;
    }
  }

  // Update a recipe
  async updateRecipe(id, updateData) {
    try {
      updateData.dateModified = new Date().toISOString();
      
      // First try to find by idMeal
      const recipesRef = collection(this.db, this.collections.recipes);
      const q = query(recipesRef, where('idMeal', '==', id), limit(1));
      const querySnapshot = await getDocs(q);
      
      let docId = id; // Default to using id as document ID
      
      if (!querySnapshot.empty) {
        // Found by idMeal, use the Firebase document ID
        docId = querySnapshot.docs[0].id;
        console.log(`✅ Found recipe by idMeal: ${id}, Firebase doc ID: ${docId}`);
      }
      
      const docRef = doc(this.db, this.collections.recipes, docId);
      await updateDoc(docRef, updateData);
      console.log('✅ Recipe updated in Firebase:', docId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating recipe in Firebase:', error);
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
      
      // Seed essential categories (meal types)
      const categories = [
        'Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'
      ];
      
      const categoriesRef = collection(this.db, this.collections.categories);
      const categoriesSnapshot = await getDocs(categoriesRef);
      
      if (categoriesSnapshot.empty) {
        for (const category of categories) {
          await addDoc(categoriesRef, {
            strCategory: category,
            strCategoryDescription: `Delicious ${category.toLowerCase()} recipes and meals`
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

  // Delete a recipe by idMeal
  async deleteRecipe(idMeal) {
    try {
      console.log(`🗑️ Deleting recipe with idMeal: ${idMeal}`);
      
      const recipesRef = collection(this.db, this.collections.recipes);
      const q = query(recipesRef, where('idMeal', '==', idMeal));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log(`❌ Recipe with idMeal ${idMeal} not found`);
        return { success: false, message: 'Recipe not found' };
      }
      
      // Delete the recipe document
      const recipeDoc = querySnapshot.docs[0];
      await deleteDoc(doc(this.db, this.collections.recipes, recipeDoc.id));
      
      console.log(`✅ Recipe ${idMeal} deleted successfully`);
      return { success: true, message: 'Recipe deleted successfully' };
    } catch (error) {
      console.error(`❌ Error deleting recipe ${idMeal}:`, error);
      return { success: false, message: 'Failed to delete recipe', error: error.message };
    }
  }

  // Delete all recipes
  async deleteAllRecipes() {
    try {
      console.log('🗑️ Deleting ALL recipes from Firebase...');
      
      const recipesRef = collection(this.db, this.collections.recipes);
      const querySnapshot = await getDocs(recipesRef);
      
      if (querySnapshot.empty) {
        console.log('📝 No recipes found to delete');
        return { success: true, deletedCount: 0, message: 'No recipes found to delete' };
      }
      
      let deletedCount = 0;
      const batchSize = 10; // Delete in batches to avoid overwhelming Firebase
      
      // Process recipes in batches
      const docs = querySnapshot.docs;
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = docs.slice(i, i + batchSize);
        
        // Delete batch
        await Promise.all(
          batch.map(async (recipeDoc) => {
            try {
              await deleteDoc(doc(this.db, this.collections.recipes, recipeDoc.id));
              deletedCount++;
              console.log(`✅ Deleted recipe: ${recipeDoc.data().strMeal || recipeDoc.id}`);
            } catch (error) {
              console.error(`❌ Failed to delete recipe ${recipeDoc.id}:`, error);
            }
          })
        );
      }
      
      console.log(`🎉 Successfully deleted ${deletedCount} recipes from Firebase`);
      return { 
        success: true, 
        deletedCount: deletedCount, 
        message: `Successfully deleted ${deletedCount} recipes` 
      };
    } catch (error) {
      console.error('❌ Error deleting all recipes:', error);
      return { 
        success: false, 
        deletedCount: 0, 
        message: 'Failed to delete all recipes', 
        error: error.message 
      };
    }
  }

  async close() {
    console.log('🔥 Simple Firebase connection remains open (managed automatically)');
  }
}

module.exports = SimpleFirebaseManager;