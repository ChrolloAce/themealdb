const { Pool } = require('pg');

class PostgresDatabaseManager {
  constructor() {
    this.connectionString = process.env.DATABASE_URL;
    this.pool = null;
    
    if (!this.connectionString) {
      throw new Error('DATABASE_URL environment variable is required for PostgreSQL connection');
    }
    
    console.log('🐘 PostgreSQL Database Manager initialized');
  }

  async initialize() {
    try {
      await this.connect();
      await this.createTables();
      await this.seedInitialData();
      console.log('✅ PostgreSQL Database initialized successfully');
    } catch (error) {
      console.error('❌ PostgreSQL Database initialization failed:', error);
      throw error;
    }
  }

  async connect() {
    this.pool = new Pool({
      connectionString: this.connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // Test connection
    const client = await this.pool.connect();
    console.log('📊 Connected to PostgreSQL database');
    client.release();
  }

  async createTables() {
    const queries = [
      this.getRecipesTableQuery(),
      this.getCategoriesTableQuery(),
      this.getAreasTableQuery(),
      this.getIngredientsTableQuery()
    ];

    for (const query of queries) {
      await this.query(query);
    }
  }

  // Execute query with parameters
  async query(text, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  // Get single row
  async get(query, params = []) {
    const result = await this.query(query, params);
    return result.rows[0] || null;
  }

  // Get all rows
  async all(query, params = []) {
    const result = await this.query(query, params);
    return result.rows;
  }

  // Run query (for INSERT/UPDATE/DELETE)
  async run(query, params = []) {
    const result = await this.query(query, params);
    return {
      lastID: result.rows[0]?.id || null,
      changes: result.rowCount
    };
  }

  // PostgreSQL table definitions
  getRecipesTableQuery() {
    return `
      CREATE TABLE IF NOT EXISTS recipes (
        idMeal SERIAL PRIMARY KEY,
        strMeal VARCHAR(255) NOT NULL,
        strDrinkAlternate VARCHAR(255),
        strCategory VARCHAR(100),
        strArea VARCHAR(100),
        strInstructions TEXT,
        strMealThumb VARCHAR(500),
        strTags VARCHAR(500),
        strYoutube VARCHAR(500),
        strIngredient1 VARCHAR(255), strMeasure1 VARCHAR(100),
        strIngredient2 VARCHAR(255), strMeasure2 VARCHAR(100),
        strIngredient3 VARCHAR(255), strMeasure3 VARCHAR(100),
        strIngredient4 VARCHAR(255), strMeasure4 VARCHAR(100),
        strIngredient5 VARCHAR(255), strMeasure5 VARCHAR(100),
        strIngredient6 VARCHAR(255), strMeasure6 VARCHAR(100),
        strIngredient7 VARCHAR(255), strMeasure7 VARCHAR(100),
        strIngredient8 VARCHAR(255), strMeasure8 VARCHAR(100),
        strIngredient9 VARCHAR(255), strMeasure9 VARCHAR(100),
        strIngredient10 VARCHAR(255), strMeasure10 VARCHAR(100),
        strIngredient11 VARCHAR(255), strMeasure11 VARCHAR(100),
        strIngredient12 VARCHAR(255), strMeasure12 VARCHAR(100),
        strIngredient13 VARCHAR(255), strMeasure13 VARCHAR(100),
        strIngredient14 VARCHAR(255), strMeasure14 VARCHAR(100),
        strIngredient15 VARCHAR(255), strMeasure15 VARCHAR(100),
        strIngredient16 VARCHAR(255), strMeasure16 VARCHAR(100),
        strIngredient17 VARCHAR(255), strMeasure17 VARCHAR(100),
        strIngredient18 VARCHAR(255), strMeasure18 VARCHAR(100),
        strIngredient19 VARCHAR(255), strMeasure19 VARCHAR(100),
        strIngredient20 VARCHAR(255), strMeasure20 VARCHAR(100),
        strSource VARCHAR(500),
        strImageSource VARCHAR(500),
        strCreativeCommonsConfirmed VARCHAR(10),
        dateModified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }

  getCategoriesTableQuery() {
    return `
      CREATE TABLE IF NOT EXISTS categories (
        idCategory SERIAL PRIMARY KEY,
        strCategory VARCHAR(100) UNIQUE NOT NULL,
        strCategoryThumb VARCHAR(500),
        strCategoryDescription TEXT
      )
    `;
  }

  getAreasTableQuery() {
    return `
      CREATE TABLE IF NOT EXISTS areas (
        idArea SERIAL PRIMARY KEY,
        strArea VARCHAR(100) UNIQUE NOT NULL
      )
    `;
  }

  getIngredientsTableQuery() {
    return `
      CREATE TABLE IF NOT EXISTS ingredients (
        idIngredient SERIAL PRIMARY KEY,
        strIngredient VARCHAR(255) UNIQUE NOT NULL,
        strDescription TEXT,
        strType VARCHAR(100)
      )
    `;
  }

  async seedInitialData() {
    // Check if we already have data
    const recipeCount = await this.get('SELECT COUNT(*) as count FROM recipes');
    if (recipeCount && recipeCount.count > 0) {
      console.log('📊 Database already has data, skipping seed');
      return;
    }

    console.log('🌱 Seeding initial data...');
    
    // Seed categories (meal types)
    const categories = [
      'Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'
    ];
    
    for (const category of categories) {
      await this.query(
        'INSERT INTO categories (strCategory) VALUES ($1) ON CONFLICT (strCategory) DO NOTHING',
        [category]
      );
    }

    // Seed areas
    const areas = [
      'American', 'British', 'Canadian', 'Chinese', 'Croatian', 'Dutch', 'Egyptian',
      'French', 'Greek', 'Indian', 'Irish', 'Italian', 'Jamaican', 'Japanese',
      'Kenyan', 'Malaysian', 'Mexican', 'Moroccan', 'Polish', 'Portuguese',
      'Russian', 'Spanish', 'Thai', 'Tunisian', 'Turkish', 'Unknown', 'Vietnamese'
    ];
    
    for (const area of areas) {
      await this.query(
        'INSERT INTO areas (strArea) VALUES ($1) ON CONFLICT (strArea) DO NOTHING',
        [area]
      );
    }

    console.log('✅ Initial data seeded successfully');
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('📊 PostgreSQL connection pool closed');
    }
  }
}

module.exports = PostgresDatabaseManager;