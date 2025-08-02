const FoodDBServer = require('../backend/server');

let serverInstance;

// Initialize server once and cache it
async function getServer() {
  if (!serverInstance) {
    console.log('Initializing FoodDB server...');
    const server = new FoodDBServer();
    await server.initialize();
    serverInstance = server.app;
    console.log('FoodDB server initialized successfully');
  }
  return serverInstance;
}

// Vercel serverless function handler - catches all routes
export default async function handler(req, res) {
  try {
    const app = await getServer();
    return app(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}