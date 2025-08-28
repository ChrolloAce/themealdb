const FoodDBServer = require('../backend/server');

let serverInstance;

// Initialize server once and cache it
async function getServer() {
  if (!serverInstance) {
    console.log('🚀 Initializing FoodDB server for serverless...');
    try {
      const server = new FoodDBServer();
      await server.initialize();
      serverInstance = server.app;
      console.log('✅ FoodDB server initialized successfully');
    } catch (error) {
      console.error('❌ Server initialization error:', error);
      console.error('Error details:', error.stack);
      throw error;
    }
  }
  return serverInstance;
}

// Vercel serverless function handler - catches all routes
module.exports = async function handler(req, res) {
  try {
    console.log(`📡 ${req.method} ${req.url || req.path || '/'}`);
    const app = await getServer();
    return app(req, res);
  } catch (error) {
    console.error('❌ Serverless function error:', error);
    console.error('Error stack:', error.stack);
    
    // Send proper error response
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
        serverless: true
      });
    }
  }
};