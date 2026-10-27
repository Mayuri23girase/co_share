import { sendError } from '../utils/apiResponse.js';

/**
 * Middleware to restrict access based on user role
 * @param {...string} allowedRoles - Array of authorized roles (e.g. 'admin')
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Admin role required. Current role: '${req.user.role}'`,
        403
      );
    }

    next();
  };
};

/**
 * Convenience helper for admin-only routes
 */
export const requireAdmin = requireRole('admin');
