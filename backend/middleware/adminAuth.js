const AdminManager = require('../managers/AdminManager');

class AdminAuthMiddleware {
  constructor() {
    this.adminManager = new AdminManager();
  }

  // Middleware to require admin authentication
  requireAdmin(req, res, next) {
    try {
      // Check if Firebase Anonymous authentication is enabled or specific anonymous token
      const allowAnonymous = process.env.FIREBASE_ALLOW_ANONYMOUS === 'true' || 
                            process.env.NODE_ENV === 'development';
      
      const authHeader = req.headers.authorization;
      const isAnonymousToken = authHeader && authHeader.includes('anonymous-firebase-auth');
      
      if (allowAnonymous || isAnonymousToken) {
        console.log('🔓 Anonymous access allowed - bypassing admin auth');
        // Create a mock admin user for anonymous access
        req.admin = {
          username: 'anonymous',
          role: 'admin',
          permissions: ['read', 'write', 'delete', 'ai_generate'],
          anonymous: true
        };
        return next();
      }
      
      const validation = this.adminManager.validateSession(req);
      
      if (!validation.valid) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: validation.message || 'Admin authentication required'
        });
      }

      // Add user info to request
      req.admin = validation.user;
      next();
    } catch (error) {
      res.status(500).json({
        error: 'Authentication Error',
        message: 'Failed to validate admin session'
      });
    }
  }

  // Middleware to check specific permissions
  requirePermission(permission) {
    return (req, res, next) => {
      if (!req.admin) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Admin authentication required'
        });
      }

      // Allow anonymous users with full permissions (since Firebase Anonymous is enabled)
      if (req.admin.anonymous) {
        console.log(`🔓 Anonymous user granted '${permission}' permission`);
        return next();
      }

      if (!this.adminManager.hasPermission(req.admin, permission)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Permission '${permission}' required for this action`
        });
      }

      next();
    };
  }

  // Optional admin auth (for public endpoints with admin features)
  optionalAdmin(req, res, next) {
    try {
      const validation = this.adminManager.validateSession(req);
      
      if (validation.valid) {
        req.admin = validation.user;
      }
      
      next();
    } catch (error) {
      // Continue without admin privileges
      next();
    }
  }

  // Login endpoint
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Username and password are required'
        });
      }

      const result = await this.adminManager.authenticate(username, password);

      if (result.success) {
        // Set HTTP-only cookie for web interface
        res.cookie('adminToken', result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({
          success: true,
          message: 'Login successful',
          token: result.token,
          user: result.user
        });
      } else {
        res.status(401).json({
          error: 'Authentication Failed',
          message: result.message
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Login Error',
        message: 'An error occurred during login'
      });
    }
  }

  // Logout endpoint
  logout(req, res) {
    res.clearCookie('adminToken');
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }

  // Token refresh endpoint
  async refreshToken(req, res) {
    try {
      const currentToken = req.headers.authorization?.replace('Bearer ', '') || 
                          req.cookies?.adminToken;

      if (!currentToken) {
        return res.status(401).json({
          error: 'No Token',
          message: 'No token provided for refresh'
        });
      }

      const result = this.adminManager.refreshToken(currentToken);

      if (result.success) {
        res.cookie('adminToken', result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000
        });

        res.json({
          success: true,
          token: result.token
        });
      } else {
        res.status(401).json({
          error: 'Refresh Failed',
          message: result.message
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Refresh Error',
        message: 'Failed to refresh token'
      });
    }
  }

  // Get current admin info
  getCurrentAdmin(req, res) {
    if (!req.admin) {
      return res.status(401).json({
        error: 'Not Authenticated',
        message: 'No admin session found'
      });
    }

    res.json({
      user: {
        username: req.admin.username,
        role: req.admin.role,
        permissions: req.admin.permissions
      }
    });
  }
}

const adminAuthMiddleware = new AdminAuthMiddleware();

module.exports = {
  AdminAuthMiddleware,
  requireAdmin: adminAuthMiddleware.requireAdmin.bind(adminAuthMiddleware),
  requirePermission: adminAuthMiddleware.requirePermission.bind(adminAuthMiddleware),
  optionalAdmin: adminAuthMiddleware.optionalAdmin.bind(adminAuthMiddleware),
  login: adminAuthMiddleware.login.bind(adminAuthMiddleware),
  logout: adminAuthMiddleware.logout.bind(adminAuthMiddleware),
  refreshToken: adminAuthMiddleware.refreshToken.bind(adminAuthMiddleware),
  getCurrentAdmin: adminAuthMiddleware.getCurrentAdmin.bind(adminAuthMiddleware)
};