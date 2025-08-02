const admin = require('firebase-admin');

class FirebaseDatabaseManager {
  constructor() {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      // Initialize with environment variables
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID || "fooddb-d274c",
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || "fooddb-d274c"
      });
    }

    this.db = admin.firestore();
    this.collections = {
      recipes: 'recipes',
      categories: 'categories', 
      areas: 'areas',
      ingredients: 'ingredients'
    };
    
    console.log('🔥 Firebase Firestore Database Manager initialized');
  }

  async initialize() {
    try {
      // Test connection
      await this.db.collection('test').doc('connection').set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'connected'
      });
      await this.db.collection('test').doc('connection').delete();
      
      await this.seedInitialData();
      console.log('✅ Firebase Firestore Database initialized successfully');
    } catch (error) {
      console.error('❌ Firebase Firestore Database initialization failed:', error);
      throw error;
    }
  }

  // Firestore operations - compatible with existing database interface
  async get(query, params = []) {
    // This is a simplified version - in practice you'd parse the SQL-like query
    // For now, we'll handle the most common cases
    if (query.includes('COUNT(*)')) {
      const collection = this.extractCollection(query);
      const snapshot = await this.db.collection(collection).get();
      return { count: snapshot.size };
    }
    
    return null;
  }

  async all(query, params = []) {
    // Parse basic queries - this is simplified
    const collection = this.extractCollection(query);
    const snapshot = await this.db.collection(collection).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async run(query, params = []) {
    // For compatibility with existing code
    return { lastID: null, changes: 1 };
  }

  // Firebase-specific methods
  async addRecipe(recipeData) {
    try {
      // Generate ID for compatibility
      const recipeId = Date.now().toString();
      recipeData.idMeal = recipeId;
      recipeData.dateModified = admin.firestore.FieldValue.serverTimestamp();
      
      const docRef = await this.db.collection(this.collections.recipes).add(recipeData);
      console.log('✅ Recipe added to Firestore:', docRef.id);
      
      return {
        success: true,
        id: docRef.id,
        idMeal: recipeId,
        ...recipeData
      };
    } catch (error) {
      console.error('❌ Error adding recipe to Firestore:', error);
      throw error;
    }
  }

  async getRecipe(id) {
    try {
      const doc = await this.db.collection(this.collections.recipes).doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('❌ Error getting recipe from Firestore:', error);
      throw error;
    }
  }

  async getAllRecipes(limit = 50) {
    try {
      const snapshot = await this.db.collection(this.collections.recipes)
        .limit(limit)
        .orderBy('dateModified', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error getting recipes from Firestore:', error);
      throw error;
    }
  }

  async updateRecipe(id, updateData) {
    try {
      updateData.dateModified = admin.firestore.FieldValue.serverTimestamp();
      await this.db.collection(this.collections.recipes).doc(id).update(updateData);
      console.log('✅ Recipe updated in Firestore:', id);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating recipe in Firestore:', error);
      throw error;
    }
  }

  async deleteRecipe(id) {
    try {
      await this.db.collection(this.collections.recipes).doc(id).delete();
      console.log('✅ Recipe deleted from Firestore:', id);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting recipe from Firestore:', error);
      throw error;
    }
  }

  async searchRecipes(searchTerm) {
    try {
      // Firestore doesn't support full-text search natively
      // This is a basic implementation - in production you'd use Algolia or similar
      const snapshot = await this.db.collection(this.collections.recipes).get();
      
      const results = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(recipe => 
          recipe.strMeal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.strCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.strArea?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      return results;
    } catch (error) {
      console.error('❌ Error searching recipes in Firestore:', error);
      throw error;
    }
  }

  async getRecipesByCategory(category) {
    try {
      const snapshot = await this.db.collection(this.collections.recipes)
        .where('strCategory', '==', category)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error getting recipes by category:', error);
      throw error;
    }
  }

  async getRecipesByArea(area) {
    try {
      const snapshot = await this.db.collection(this.collections.recipes)
        .where('strArea', '==', area)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error getting recipes by area:', error);
      throw error;
    }
  }

  async getCategories() {
    try {
      const snapshot = await this.db.collection(this.collections.categories).get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error getting categories:', error);
      throw error;
    }
  }

  async getAreas() {
    try {
      const snapshot = await this.db.collection(this.collections.areas).get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error getting areas:', error);
      throw error;
    }
  }

  // Helper method to extract collection name from SQL-like queries
  extractCollection(query) {
    if (query.toLowerCase().includes('recipes')) return this.collections.recipes;
    if (query.toLowerCase().includes('categories')) return this.collections.categories;
    if (query.toLowerCase().includes('areas')) return this.collections.areas;
    if (query.toLowerCase().includes('ingredients')) return this.collections.ingredients;
    return this.collections.recipes; // default
  }

  async seedInitialData() {
    try {
      // Check if we already have data (no default seed items)
      console.log('🔥 Firebase database ready - no default seeding (as requested)');
      
      // Seed essential categories only
      const categories = [
        'Beef', 'Chicken', 'Dessert', 'Lamb', 'Miscellaneous', 'Pasta', 'Pork', 
        'Seafood', 'Side', 'Starter', 'Vegan', 'Vegetarian', 'Breakfast', 'Goat'
      ];
      
      const categoriesSnapshot = await this.db.collection(this.collections.categories).get();
      if (categoriesSnapshot.empty) {
        for (const category of categories) {
          await this.db.collection(this.collections.categories).add({
            strCategory: category,
            strCategoryDescription: `${category} recipes`
          });
        }
        console.log('✅ Categories seeded');
      }

      // Seed essential areas only
      const areas = [
        'American', 'British', 'Canadian', 'Chinese', 'Croatian', 'Dutch', 'Egyptian',
        'French', 'Greek', 'Indian', 'Irish', 'Italian', 'Jamaican', 'Japanese',
        'Kenyan', 'Malaysian', 'Mexican', 'Moroccan', 'Polish', 'Portuguese',
        'Russian', 'Spanish', 'Thai', 'Tunisian', 'Turkish', 'Unknown', 'Vietnamese'
      ];
      
      const areasSnapshot = await this.db.collection(this.collections.areas).get();
      if (areasSnapshot.empty) {
        for (const area of areas) {
          await this.db.collection(this.collections.areas).add({
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

  async close() {
    // Firebase connections are managed automatically
    console.log('🔥 Firebase connection remains open (managed automatically)');
  }
}

module.exports = FirebaseDatabaseManager;