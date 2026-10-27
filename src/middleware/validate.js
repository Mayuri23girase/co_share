import { body, param, validationResult } from 'express-validator';
import { sendError } from '../utils/apiResponse.js';

/**
 * Middleware runner for express-validator rules
 */
export const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations in parallel
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    return sendError(res, 'Validation failed. Please verify the input fields.', 400, formattedErrors);
  };
};

/**
 * Validations for User Registration
 */
export const registerValidationRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

/**
 * Validations for User Login
 */
export const loginValidationRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validations for Post Creation
 */
export const createPostValidationRules = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  body('image')
    .optional()
    .trim(),
  body('status')
    .optional()
    .trim()
    .custom((val) => {
      if (!['draft', 'pending'].includes(val)) {
        throw new Error("Users can only set initial post status to 'draft' or 'pending'. 'approved' and 'rejected' are restricted.");
      }
      return true;
    })
];

/**
 * Validations for Post Update
 */
export const updatePostValidationRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid Post ID format'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('content')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Content cannot be empty'),
  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category cannot be empty'),
  body('image')
    .optional()
    .trim(),
  body('status')
    .optional()
    .trim()
    .custom((val) => {
      if (!['draft', 'pending'].includes(val)) {
        throw new Error("Users can only update post status to 'draft' or 'pending'. 'approved' and 'rejected' can only be set by an admin.");
      }
      return true;
    })
];

/**
 * Validator for MongoDB ID param
 */
export const mongoIdParamValidation = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} parameter. Must be a valid 24-character hexadecimal MongoDB ObjectId.`)
];
