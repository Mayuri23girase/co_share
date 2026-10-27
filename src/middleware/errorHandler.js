import { sendError } from '../utils/apiResponse.js';

/**
 * 404 Not Found Handler for unmatched routes
 */
export const notFoundHandler = (req, res, next) => {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};

/**
 * Centralized Global Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Handle Mongoose CastError (e.g. Invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: '${err.value}' is not a valid ObjectId`;
  }

  // Handle Mongoose Schema Validation Errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
  }

  // Handle MongoDB Duplicate Key (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const duplicateFields = Object.keys(err.keyValue || {});
    const fieldName = duplicateFields[0] || 'field';
    const fieldValue = err.keyValue ? err.keyValue[fieldName] : '';
    message = `A record with ${fieldName} '${fieldValue}' already exists.`;
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please log in again.';
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Uploaded file exceeds the maximum allowed size limit';
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // Log 500 server errors in development
  if (statusCode === 500 && process.env.NODE_ENV !== 'test') {
    console.error('[Unhandled Server Error]', err);
  }

  return sendError(res, message, statusCode, errors);
};
