#!/usr/bin/env node

/**
 * fix-categories.js
 * Script to fix recipe categories in the database
 * Run with: node fix-categories.js [--dry-run]
 */

require('dotenv').config();
const FixCategoriesMigration = require('./backend/migrations/FixCategoriesMigration');

async function main() {
  console.log('🚀 Recipe Category Fixer');
  console.log('========================\n');
  
  // Check for dry run flag
  const isDryRun = process.argv.includes('--dry-run');
  
  try {
    // Determine which database to use
    let databaseManager;
    
    if (process.env.USE_FIREBASE === 'true') {
      console.log('📦 Using Firebase database...\n');
      const SimpleFirebaseManager = require('./backend/managers/SimpleFirebaseManager');
      databaseManager = new SimpleFirebaseManager();
      await databaseManager.initialize();
    } else if (process.env.DATABASE_URL) {
      console.log('📦 Using PostgreSQL database...\n');
      const PostgresDatabaseManager = require('./backend/managers/PostgresDatabaseManager');
      databaseManager = new PostgresDatabaseManager();
      await databaseManager.initialize();
    } else {
      console.log('📦 Using SQLite database...\n');
      const DatabaseManager = require('./backend/managers/DatabaseManager');
      databaseManager = new DatabaseManager();
      await databaseManager.initialize();
    }
    
    // Create and run migration
    const migration = new FixCategoriesMigration(databaseManager);
    
    if (isDryRun) {
      await migration.dryRun();
    } else {
      const result = await migration.run();
      
      if (result.updated > 0) {
        console.log('\n✨ Categories have been successfully fixed!');
        console.log('🎉 Your recipes now use proper meal categories.');
      }
    }
    
    // Close database connection
    if (databaseManager.close) {
      await databaseManager.close();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
