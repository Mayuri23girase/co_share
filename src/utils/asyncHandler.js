/**
 * Wraps async route handlers to catch exceptions and forward them to express next()
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
