import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * Generate a JWT token for a user
 */
const generateToken = (user) => {
  const jwtSecret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    jwtSecret,
    { expiresIn }
  );
};

/**
 * @desc    Register a new user
 * @route   POST /auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return sendError(res, 'An account with this email address already exists.', 409);
  }

  // Create user (role is always 'user' by default, never trusted from body)
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: 'user'
  });

  const token = generateToken(user);

  return sendSuccess(
    res,
    'User registered successfully',
    {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      token
    },
    201
  );
});

/**
 * @desc    Authenticate user & get token
 * @route   POST /auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = email.toLowerCase().trim();

  // Find user and explicitly select password field
  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user) {
    return sendError(res, 'Invalid email or password credentials.', 401);
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return sendError(res, 'Invalid email or password credentials.', 401);
  }

  const token = generateToken(user);

  return sendSuccess(
    res,
    'Login successful',
    {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    },
    200
  );
});

/**
 * @desc    Get current logged in user details
 * @route   GET /auth/me
 * @access  Private (JWT required)
 */
export const getMe = asyncHandler(async (req, res) => {
  // req.user was fetched and attached by authMiddleware
  return sendSuccess(res, 'User profile fetched successfully', { user: req.user }, 200);
});
