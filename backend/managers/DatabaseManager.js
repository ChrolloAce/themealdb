const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseManager {
  constructor() {
    // Try to use Simple Firebase (no service account bullshit needed!)
    // Just needs the project to exist and have open security rules
    try {
      console.log('🔥 Attempting to use Simple Firebase (no service account needed)');
      const SimpleFirebaseManager = require('./SimpleFirebaseManager');
      return new SimpleFirebaseManager();
    } catch (error) {
      console.warn('⚠️ Simple Firebase failed, falling back to SQLite:', error.message);
      // Continue with SQLite fallback below
    }
    
    // Fallback to in-memory SQLite for serverless (Vercel) without Firebase
    const isServerless = process.env.VERCEL || process.env.NODE_ENV === 'production';
    this.dbPath = isServerless ? ':memory:' : (process.env.DB_PATH || './data/recipes.db');
    this.db = null;
    console.log(`📊 SQLite Database mode: ${isServerless ? 'In-Memory (Serverless)' : 'File-based (Local)'}`);
    console.log('💡 To use persistent Firebase storage, set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL environment variables');
  }

  async initialize() {
    try {
      await this.connect();
      await this.createTables();
      await this.seedInitialData();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(new Error(`Database connection failed: ${err.message}`));
        } else {
          console.log('📊 Connected to SQLite database');
          resolve();
        }
      });
    });
  }

  async createTables() {
    const queries = [
      this.getRecipesTableQuery(),
      this.getCategoriesTableQuery(),
      this.getAreasTableQuery(),
      this.getIngredientsTableQuery(),
      this.getIndexQueries()
    ].flat();

    for (const query of queries) {
      await this.run(query);
    }
    
    // Run migrations for schema updates
    await this.runMigrations();
  }
  
  async runMigrations() {
    try {
      // Check if strEquipment column exists, if not add it
      const columns = await this.getTableColumns('recipes');
      const hasEquipment = columns.some(col => col.name === 'strEquipment');
      
      if (!hasEquipment) {
        console.log('🔧 Adding strEquipment column to recipes table...');
        await this.run('ALTER TABLE recipes ADD COLUMN strEquipment TEXT');
        console.log('✅ Equipment column added successfully');
      }
    } catch (error) {
      console.log('ℹ️ Migration skipped (likely new database):', error.message);
    }
  }
  
  async getTableColumns(tableName) {
    return new Promise((resolve, reject) => {
      this.db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getRecipesTableQuery() {
    return `
      CREATE TABLE IF NOT EXISTS recipes (
        idMeal INTEGER PRIMARY KEY AUTOINCREMENT,
        strMeal TEXT NOT NULL,
        strDrinkAlternate TEXT,
        strCategory TEXT NOT NULL,
        strArea TEXT NOT NULL,
        strInstructions TEXT NOT NULL,
        strMealThumb TEXT,
        strTags TEXT,
        strYoutube TEXT,
        strSource TEXT,
        strImageSource TEXT,
        strCreativeCommonsConfirmed TEXT,
        dateModified TEXT DEFAULT CURRENT_TIMESTAMP,
        strIngredient1 TEXT, strMeasure1 TEXT,
        strIngredient2 TEXT, strMeasure2 TEXT,
        strIngredient3 TEXT, strMeasure3 TEXT,
        strIngredient4 TEXT, strMeasure4 TEXT,
        strIngredient5 TEXT, strMeasure5 TEXT,
        strIngredient6 TEXT, strMeasure6 TEXT,
        strIngredient7 TEXT, strMeasure7 TEXT,
        strIngredient8 TEXT, strMeasure8 TEXT,
        strIngredient9 TEXT, strMeasure9 TEXT,
        strIngredient10 TEXT, strMeasure10 TEXT,
        strIngredient11 TEXT, strMeasure11 TEXT,
        strIngredient12 TEXT, strMeasure12 TEXT,
        strIngredient13 TEXT, strMeasure13 TEXT,
        strIngredient14 TEXT, strMeasure14 TEXT,
        strIngredient15 TEXT, strMeasure15 TEXT,
        strIngredient16 TEXT, strMeasure16 TEXT,
        strIngredient17 TEXT, strMeasure17 TEXT,
        strIngredient18 TEXT, strMeasure18 TEXT,
        strIngredient19 TEXT, strMeasure19 TEXT,
        strIngredient20 TEXT, strMeasure20 TEXT,
        strEquipment TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }

  getCategoriesTableQuery() {
    return `
      CREATE TABLE IF NOT EXISTS categories (
        idCategory INTEGER PRIMARY KEY AUTOINCREMENT,
        strCategory TEXT UNIQUE NOT NULL,
        strCategoryThumb TEXT,
        strCategoryDescription TEXT
      )
    `;
  }

  getAreasTableQuery() {
    return `
      CREATE TABLE IF NOT EXISTS areas (
        idArea INTEGER PRIMARY KEY AUTOINCREMENT,
        strArea TEXT UNIQUE NOT NULL
      )
    `;
  }

  getIngredientsTableQuery() {
    return `
      CREATE TABLE IF NOT EXISTS ingredients (
        idIngredient INTEGER PRIMARY KEY AUTOINCREMENT,
        strIngredient TEXT UNIQUE NOT NULL,
        strDescription TEXT,
        strType TEXT
      )
    `;
  }

  getIndexQueries() {
    return [
      'CREATE INDEX IF NOT EXISTS idx_recipes_meal ON recipes(strMeal)',
      'CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(strCategory)',
      'CREATE INDEX IF NOT EXISTS idx_recipes_area ON recipes(strArea)',
      'CREATE INDEX IF NOT EXISTS idx_recipes_ingredient1 ON recipes(strIngredient1)',
      'CREATE INDEX IF NOT EXISTS idx_recipes_ingredient2 ON recipes(strIngredient2)',
      'CREATE INDEX IF NOT EXISTS idx_recipes_ingredient3 ON recipes(strIngredient3)'
    ];
  }

  async seedInitialData() {
    // Check if data already exists
    const count = await this.get('SELECT COUNT(*) as count FROM categories');
    if (count.count > 0) return;

    // Seed categories (meal types)
    const categories = [
      'Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'
    ];

    const areas = [
      'American', 'British', 'Canadian', 'Chinese', 'Croatian', 'Dutch', 
      'Egyptian', 'French', 'Greek', 'Indian', 'Irish', 'Italian', 
      'Jamaican', 'Japanese', 'Kenyan', 'Malaysian', 'Mexican', 'Moroccan', 
      'Polish', 'Portuguese', 'Russian', 'Spanish', 'Thai', 'Tunisian', 
      'Turkish', 'Unknown', 'Vietnamese'
    ];

    // Insert categories
    for (const category of categories) {
      await this.run(
        'INSERT OR IGNORE INTO categories (strCategory) VALUES (?)',
        [category]
      );
    }

    // Insert areas
    for (const area of areas) {
      await this.run(
        'INSERT OR IGNORE INTO areas (strArea) VALUES (?)',
        [area]
      );
    }

    console.log('🌱 Seeded initial categories and areas');
  }

  // Generic database operations
  async run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('📊 Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = DatabaseManager;