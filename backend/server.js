const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

// Enable Firebase Anonymous authentication for development and production
process.env.FIREBASE_ALLOW_ANONYMOUS = 'true';
console.log('🔓 Firebase Anonymous authentication enabled');

const DatabaseManager = require('./managers/DatabaseManager');
const ApiRoutes = require('./routes/ApiRoutes');
const AdminRoutes = require('./routes/AdminRoutes');
const rateLimitMiddleware = require('./middleware/rateLimitMiddleware');
const errorHandler = require('./middleware/errorHandler');
const RecipeManager = require('./managers/RecipeManager');
const { DataSeeder } = require('./utils/sampleData');

class FoodDBServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.databaseManager = new DatabaseManager();
  }

  async initialize() {
    try {
      // Initialize database
      await this.databaseManager.initialize();
      
      // Seed sample data if database is empty
      const recipeManager = new RecipeManager(this.databaseManager);
      const seeder = new DataSeeder(recipeManager);
      await seeder.seedIfEmpty();
      
      // Setup middleware
      this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      // Setup error handling
      this.setupErrorHandling();
      
      console.log('FoodDB Server initialized successfully');
    } catch (error) {
      console.error('Failed to initialize server:', error);
      process.exit(1);
    }
  }

  setupMiddleware() {
    // Trust proxy for Vercel deployment
    this.app.set('trust proxy', 1);
    
    // Security middleware with CSP fix
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"]
        }
      }
    }));
    this.app.use(cors());

    // Add API-specific headers for Vercel security compatibility and mobile app support
    this.app.use('/api', (req, res, next) => {
      // Headers to bypass Vercel Security Checkpoint
      res.setHeader('X-API-Route', 'true');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=300');
      // res.setHeader('X-Vercel-Bypass-Challenge', '1'); // Removed - was causing deployment failures
      res.setHeader('X-Robots-Tag', 'noindex');
      res.setHeader('Vary', 'User-Agent, Accept');
      
      // Additional headers to identify as legitimate API
      res.setHeader('X-API-Version', '1.0');
      res.setHeader('X-Service-Type', 'REST-API');
      res.setHeader('Content-Type', 'application/json');
      
      next();
    });
    
    // Rate limiting
    this.app.use(rateLimitMiddleware);
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
    
    // Static files
    this.app.use('/images', express.static(path.join(__dirname, '../uploads/images')));
    this.app.use('/admin-assets', express.static(path.join(__dirname, '../frontend/admin')));
    this.app.use(express.static(path.join(__dirname, '../frontend/public')));
  }

  setupRoutes() {
    // API routes
    const apiRoutes = new ApiRoutes(this.databaseManager);
    this.app.use('/api', apiRoutes.getRouter());
    
    // Admin routes
    const adminRoutes = new AdminRoutes(this.databaseManager);
    this.app.use('/admin', adminRoutes.getRouter());
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });
    
    // Admin interface route
    this.app.get('/admin-panel', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/admin/index.html'));
    });
    
    // Frontend route (serve main page)
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
    });
  }

  setupErrorHandling() {
    this.app.use(errorHandler);
    
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
  }

  async start() {
    await this.initialize();
    
    this.app.listen(this.port, () => {
      console.log(`🍽️  FoodDB API Server running on port ${this.port}`);
      console.log(`📖 API Documentation: http://localhost:${this.port}`);
      console.log(`🔍 Health Check: http://localhost:${this.port}/health`);
    });
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new FoodDBServer();
  server.start().catch(console.error);
}

module.exports = FoodDBServer;