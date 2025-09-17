class ErrorHandler {
  // Main error handling middleware
  static handle(err, req, res, next) {
    console.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // Default error response
    let statusCode = 500;
    let errorResponse = {
      error: 'Internal Server Error',
      message: 'Something went wrong on our end.'
    };

    // Handle specific error types
    if (err.name === 'ValidationError') {
      statusCode = 400;
      errorResponse = {
        error: 'Validation Error',
        message: err.message,
        details: err.details || null
      };
    } else if (err.name === 'MulterError') {
      statusCode = 400;
      errorResponse = ErrorHandler.handleMulterError(err);
    } else if (err.message.includes('not found')) {
      statusCode = 404;
      errorResponse = {
        error: 'Not Found',
        message: err.message
      };
    } else if (err.message.includes('Rate limit')) {
      statusCode = 429;
      errorResponse = {
        error: 'Rate Limit Exceeded',
        message: err.message
      };
    } else if (err.message.includes('Invalid API key')) {
      statusCode = 401;
      errorResponse = {
        error: 'Unauthorized',
        message: err.message
      };
    } else if (err.message.includes('Premium feature')) {
      statusCode = 403;
      errorResponse = {
        error: 'Forbidden',
        message: err.message
      };
    } else if (err.statusCode) {
      // Custom status code from application
      statusCode = err.statusCode;
      errorResponse = {
        error: err.name || 'Application Error',
        message: err.message
      };
    }

    // Add request ID for tracking if available
    if (req.id) {
      errorResponse.requestId = req.id;
    }

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
      errorResponse.message = 'An unexpected error occurred. Please try again later.';
    }

    res.status(statusCode).json(errorResponse);
  }

  // Handle Multer (file upload) specific errors
  static handleMulterError(err) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return {
          error: 'File Too Large',
          message: 'The uploaded file exceeds the maximum allowed size.',
          maxSize: process.env.MAX_FILE_SIZE || '5MB'
        };
      case 'LIMIT_FILE_COUNT':
        return {
          error: 'Too Many Files',
          message: 'Too many files uploaded at once.'
        };
      case 'LIMIT_UNEXPECTED_FILE':
        return {
          error: 'Unexpected File',
          message: 'An unexpected file field was encountered.'
        };
      default:
        return {
          error: 'Upload Error',
          message: err.message || 'File upload failed.'
        };
    }
  }

  // Async error wrapper for route handlers
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Custom application error class
  static createError(message, statusCode = 500, name = 'ApplicationError') {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.name = name;
    return error;
  }

  // Database error handler
  static handleDatabaseError(err) {
    if (err.code === 'SQLITE_ERROR') {
      return ErrorHandler.createError('Database operation failed', 500, 'DatabaseError');
    } else if (err.code === 'SQLITE_CONSTRAINT') {
      return ErrorHandler.createError('Data constraint violation', 400, 'ValidationError');
    }
    return err;
  }

  // Request validation error handler
  static handleValidationError(error) {
    const customError = ErrorHandler.createError(
      'Request validation failed', 
      400, 
      'ValidationError'
    );
    customError.details = error.details || null;
    return customError;
  }
}

module.exports = ErrorHandler.handle;
module.exports.ErrorHandler = ErrorHandler;