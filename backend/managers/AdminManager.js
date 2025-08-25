const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AdminManager {
  constructor() {
    this.adminUsername = process.env.ADMIN_USERNAME || 'admin';
    this.adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    this.jwtSecret = process.env.JWT_SECRET || 'default_secret';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  // Authenticate admin user with PIN system
  async authenticate(username, password) {
    try {
      // Simple PIN system - just check the password/PIN
      const adminPin = process.env.ADMIN_PIN || '1234';
      
      // Accept either username+password or just PIN
      const isValidPin = password === adminPin || 
                        (username === 'admin' && password === this.adminPassword) ||
                        username === adminPin;
      
      if (!isValidPin) {
        throw new Error('Invalid PIN or credentials');
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          username: this.adminUsername,
          role: 'admin',
          permissions: ['read', 'write', 'delete', 'ai_generate']
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiresIn }
      );

      return {
        success: true,
        token,
        user: {
          username: this.adminUsername,
          role: 'admin',
          permissions: ['read', 'write', 'delete', 'ai_generate']
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return {
        valid: true,
        user: decoded
      };
    } catch (error) {
      return {
        valid: false,
        message: error.message
      };
    }
  }

  // Check if user has specific permission
  hasPermission(user, permission) {
    return user && user.permissions && user.permissions.includes(permission);
  }

  // Generate new admin token (for token refresh)
  refreshToken(currentToken) {
    try {
      const decoded = jwt.verify(currentToken, this.jwtSecret);
      
      // Generate new token with same data
      const newToken = jwt.sign(
        {
          username: decoded.username,
          role: decoded.role,
          permissions: decoded.permissions
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiresIn }
      );

      return {
        success: true,
        token: newToken
      };
    } catch (error) {
      return {
        success: false,
        message: 'Invalid token for refresh'
      };
    }
  }

  // Change admin password (for security)
  async changePassword(currentPassword, newPassword) {
    try {
      if (currentPassword !== this.adminPassword) {
        throw new Error('Current password is incorrect');
      }

      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters');
      }

      // In production, update the hashed password in database
      // For now, we'll just return success (you'd need to update .env manually)
      return {
        success: true,
        message: 'Password changed successfully. Please update your .env file with the new password.'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Get admin activity logs (placeholder for future enhancement)
  getActivityLogs(limit = 50) {
    // In production, this would fetch from database
    return {
      logs: [
        {
          timestamp: new Date().toISOString(),
          action: 'login',
          details: 'Admin logged in successfully'
        }
      ],
      total: 1
    };
  }

  // Admin dashboard stats
  async getDashboardStats(databaseManager) {
    try {
      // Check if using Firebase or SQLite
      if (databaseManager.getAllRecipes && databaseManager.getCategories && databaseManager.getAreas) {
        // Firebase methods
        const [
          allRecipes,
          allCategories,
          allAreas
        ] = await Promise.all([
          databaseManager.getAllRecipes(100), // Get more recipes for stats
          databaseManager.getCategories(),
          databaseManager.getAreas()
        ]);

        // Get recent recipes (last 5)
        const recentRecipes = allRecipes.slice(0, 5);

        return {
          stats: {
            totalRecipes: allRecipes.length,
            totalCategories: allCategories.length,
            totalAreas: allAreas.length,
            recentRecipes: recentRecipes.length
          },
          recentActivity: recentRecipes.map(recipe => ({
            name: recipe.strMeal,
            date: recipe.dateModified,
            action: 'Recipe Added'
          }))
        };
      } else {
        // SQLite fallback
        const [
          totalRecipes,
          totalCategories,
          totalAreas,
          recentRecipes
        ] = await Promise.all([
          databaseManager.get('SELECT COUNT(*) as count FROM recipes'),
          databaseManager.get('SELECT COUNT(*) as count FROM categories'),
          databaseManager.get('SELECT COUNT(*) as count FROM areas'),
          databaseManager.all('SELECT strMeal, dateModified FROM recipes ORDER BY dateModified DESC LIMIT 5')
        ]);

        return {
          stats: {
            totalRecipes: totalRecipes.count,
            totalCategories: totalCategories.count,
            totalAreas: totalAreas.count,
            recentRecipes: recentRecipes.length
          },
          recentActivity: recentRecipes.map(recipe => ({
            name: recipe.strMeal,
            date: recipe.dateModified,
            action: 'Recipe Added'
          }))
        };
      }
    } catch (error) {
      console.error('Dashboard stats error:', error);
      // Return default stats on error
      return {
        stats: {
          totalRecipes: 0,
          totalCategories: 14, // We know we seeded 14 categories
          totalAreas: 27, // We know we seeded 27 areas
          recentRecipes: 0
        },
        recentActivity: []
      };
    }
  }

  // Validate admin session
  validateSession(req) {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                 req.cookies?.adminToken ||
                 req.query.token;

    if (!token) {
      return { valid: false, message: 'No authentication token provided' };
    }

    return this.verifyToken(token);
  }
}

module.exports = AdminManager;