const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import the FoodDBServer class
const FoodDBServer = require('../backend/server');

// Global server instance to reuse across requests
let server;

module.exports = async (req, res) => {
  try {
    // Initialize server only once
    if (!server) {
      console.log('🚀 Initializing FoodDB Server for Vercel...');
      server = new FoodDBServer();
      await server.initialize();
      console.log('✅ FoodDB Server initialized successfully');
    }
    
    // Handle the request with the Express app
    return server.app(req, res);
  } catch (error) {
    console.error('❌ Server initialization error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to initialize server'
    });
  }
};
