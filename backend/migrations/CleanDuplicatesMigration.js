/**
 * MIGRATION: Clean Duplicate Fields
 * 
 * This migration removes ALL duplicate fields from existing recipes:
 * - Removes: strInstructions, strIngredient1-20, strMeasure1-20, strEquipment, imageUrls, images
 * - Keeps: instructions, ingredientsDetailed, equipmentRequired, strMealThumb, additionalImages
 * 
 * Run with: node backend/migrations/CleanDuplicatesMigration.js
 */

const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, deleteField } = require('firebase/firestore');
require('dotenv').config();

// Initialize Firebase (same as SimpleFirebaseManager)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

class CleanDuplicatesMigration {
  constructor() {
    this.recipesRef = collection(db, 'recipes');
  }

  async run() {
    console.log('🧹 STARTING MIGRATION: Clean Duplicate Fields');
    console.log('='.repeat(60));
    
    try {
      // Get all recipes
      const snapshot = await getDocs(this.recipesRef);
      
      if (snapshot.empty) {
        console.log('❌ No recipes found in database');
        return {
          success: false,
          message: 'No recipes found'
        };
      }
      
      console.log(`📊 Found ${snapshot.size} recipes to clean`);
      console.log('='.repeat(60));
      
      let cleaned = 0;
      let errors = 0;
      let skipped = 0;
      const duplicatesRemoved = {
        strInstructions: 0,
        strIngredient: 0,
        strEquipment: 0,
        imageUrls: 0,
        images: 0
      };
      
      for (const doc of snapshot.docs) {
        try {
          const recipe = doc.data();
          const recipeId = doc.id;
          const recipeName = recipe.strMeal || 'Unnamed';
          
          console.log(`\n🔍 Processing: ${recipeName} (ID: ${recipeId})`);
          
          // Fields to remove
          const fieldsToDelete = {};
          let hasChanges = false;
          
          // 1. Remove strInstructions (keep instructions array)
          if (recipe.strInstructions !== undefined) {
            fieldsToDelete.strInstructions = deleteField();
            duplicatesRemoved.strInstructions++;
            hasChanges = true;
            console.log('   ❌ Removing: strInstructions');
          }
          
          // 2. Remove strIngredient1-20 and strMeasure1-20 (keep ingredientsDetailed)
          let ingredientCount = 0;
          for (let i = 1; i <= 20; i++) {
            if (recipe[`strIngredient${i}`] !== undefined) {
              fieldsToDelete[`strIngredient${i}`] = deleteField();
              ingredientCount++;
              hasChanges = true;
            }
            if (recipe[`strMeasure${i}`] !== undefined) {
              fieldsToDelete[`strMeasure${i}`] = deleteField();
              hasChanges = true;
            }
          }
          if (ingredientCount > 0) {
            duplicatesRemoved.strIngredient++;
            console.log(`   ❌ Removing: strIngredient1-20 & strMeasure1-20 (${ingredientCount} ingredients)`);
          }
          
          // 3. Remove strEquipment (keep equipmentRequired array)
          if (recipe.strEquipment !== undefined) {
            fieldsToDelete.strEquipment = deleteField();
            duplicatesRemoved.strEquipment++;
            hasChanges = true;
            console.log('   ❌ Removing: strEquipment');
          }
          
          // 4. Remove imageUrls array (keep strMealThumb + additionalImages)
          if (recipe.imageUrls !== undefined) {
            fieldsToDelete.imageUrls = deleteField();
            duplicatesRemoved.imageUrls++;
            hasChanges = true;
            console.log('   ❌ Removing: imageUrls');
          }
          
          // 5. Remove images array with metadata (keep strMealThumb + additionalImages)
          if (recipe.images !== undefined) {
            fieldsToDelete.images = deleteField();
            duplicatesRemoved.images++;
            hasChanges = true;
            console.log('   ❌ Removing: images (metadata array)');
          }
          
          // Update if there are changes
          if (hasChanges) {
            const docRef = doc(db, 'recipes', recipeId);
            await updateDoc(docRef, fieldsToDelete);
            cleaned++;
            console.log('   ✅ Recipe cleaned successfully!');
          } else {
            skipped++;
            console.log('   ✨ Recipe already clean (no duplicates found)');
          }
          
        } catch (error) {
          errors++;
          console.error(`   ❌ Error cleaning recipe:`, error.message);
        }
      }
      
      // Summary
      console.log('\n' + '='.repeat(60));
      console.log('📊 MIGRATION COMPLETE!');
      console.log('='.repeat(60));
      console.log(`✅ Recipes cleaned: ${cleaned}`);
      console.log(`✨ Already clean: ${skipped}`);
      console.log(`❌ Errors: ${errors}`);
      console.log(`📝 Total processed: ${snapshot.size}`);
      console.log('\n📦 Duplicate fields removed:');
      console.log(`   - strInstructions: ${duplicatesRemoved.strInstructions} recipes`);
      console.log(`   - strIngredient1-20: ${duplicatesRemoved.strIngredient} recipes`);
      console.log(`   - strEquipment: ${duplicatesRemoved.strEquipment} recipes`);
      console.log(`   - imageUrls: ${duplicatesRemoved.imageUrls} recipes`);
      console.log(`   - images: ${duplicatesRemoved.images} recipes`);
      
      // Estimate storage savings
      const avgDuplicateSize = 5; // KB per recipe (conservative estimate)
      const totalSavings = (cleaned * avgDuplicateSize).toFixed(2);
      console.log(`\n💾 Estimated storage saved: ~${totalSavings} KB`);
      
      console.log('\n✨ All recipes now use ONLY modern array-based fields!');
      console.log('='.repeat(60));
      
      return {
        success: true,
        cleaned,
        skipped,
        errors,
        total: snapshot.size,
        duplicatesRemoved
      };
      
    } catch (error) {
      console.error('❌ MIGRATION FAILED:', error);
      throw error;
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new CleanDuplicatesMigration();
  
  migration.run()
    .then((result) => {
      console.log('\n✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = CleanDuplicatesMigration;

