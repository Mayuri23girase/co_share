import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Middleware to authenticate requests using JSON Web Tokens (JWT)
 */
export const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication required. Missing or malformed Bearer token.', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return sendError(res, 'Authentication token not provided.', 401);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[Configuration Error] JWT_SECRET is not configured in .env');
      return sendError(res, 'Internal server authentication error', 500);
    }

    const decoded = jwt.verify(token, jwtSecret);

    // Fetch user from DB to ensure user still exists and role is fresh
    const user = await User.findById(decoded.id);
    if (!user) {
      return sendError(res, 'User belonging to this token no longer exists.', 401);
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Authentication token has expired. Please log in again.', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 'Invalid authentication token.', 401);
    }
    return sendError(res, 'Authentication failed.', 401);
  }
};
