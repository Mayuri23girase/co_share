import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { validate, registerValidationRules, loginValidationRules } from '../middleware/validate.js';

const router = Router();

// Register a new user (always role: user)
router.post('/register', validate(registerValidationRules), register);

// Login user and obtain JWT token
router.post('/login', validate(loginValidationRules), login);

// Get current logged-in user profile
router.get('/me', authenticateJWT, getMe);

export default router;
