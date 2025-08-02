const FoodDBServer = require('./backend/server');

let server;
let app;

async function getApp() {
  if (!app) {
    server = new FoodDBServer();
    await server.initialize();
    app = server.app;
  }
  return app;
}

// Export for Vercel
module.exports = async (req, res) => {
  const expressApp = await getApp();
  return expressApp(req, res);
};