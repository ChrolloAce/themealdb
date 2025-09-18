const rateLimit = require('express-rate-limit');

class RateLimitManager {
  constructor() {
    this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000; // 15 minutes
    this.maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
  }

  // Standard rate limiting for regular API calls
  getStandardLimiter() {
    return rateLimit({
      windowMs: this.windowMs,
      max: this.maxRequests,
      message: {
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${this.windowMs / 60000} minutes.`,
        retryAfter: this.windowMs / 1000
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many requests from this IP, please try again after ${this.windowMs / 60000} minutes.`,
          retryAfter: Math.ceil(this.windowMs / 1000)
        });
      }
    });
  }

  // Stricter rate limiting for premium endpoints
  getPremiumLimiter() {
    return rateLimit({
      windowMs: this.windowMs,
      max: Math.floor(this.maxRequests / 2), // Half the standard limit
      message: {
        error: 'Premium endpoint rate limit exceeded',
        message: 'This premium endpoint has stricter rate limits.',
        retryAfter: this.windowMs / 1000
      },
      skip: (req) => {
        // Skip rate limiting for premium API keys
        const apiKey = req.query.key || req.headers['x-api-key'];
        return apiKey && apiKey !== '1' && this.isValidPremiumKey(apiKey);
      }
    });
  }

  // Very strict rate limiting for upload endpoints
  getUploadLimiter() {
    return rateLimit({
      windowMs: this.windowMs,
      max: 10, // Very limited uploads
      message: {
        error: 'Upload rate limit exceeded',
        message: 'Too many upload attempts. Please try again later.',
        retryAfter: this.windowMs / 1000
      }
    });
  }

  // Check if API key is valid premium key
  isValidPremiumKey(apiKey) {
    const premiumKey = process.env.API_PREMIUM_KEY;
    return premiumKey && apiKey === premiumKey;
  }

  // Middleware to check API key validity
  validateApiKey(req, res, next) {
    const apiKey = req.query.key || req.headers['x-api-key'];
    const testKey = process.env.API_TEST_KEY || '1';
    const premiumKey = process.env.API_PREMIUM_KEY;

    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        message: 'Please provide an API key. Use "1" for testing.'
      });
    }

    if (apiKey === testKey) {
      req.apiKeyType = 'test';
      return next();
    }

    if (premiumKey && apiKey === premiumKey) {
      req.apiKeyType = 'premium';
      return next();
    }

    return res.status(401).json({
      error: 'Invalid API key',
      message: 'The provided API key is not valid.'
    });
  }

  // Middleware to check if premium features are allowed (DISABLED - All features now free)
  requirePremium(req, res, next) {
    // All features are now freely accessible with any valid API key
    next();
  }
}

const rateLimitManager = new RateLimitManager();

module.exports = rateLimitManager.getStandardLimiter();
module.exports.RateLimitManager = RateLimitManager;
module.exports.rateLimitManager = rateLimitManager;