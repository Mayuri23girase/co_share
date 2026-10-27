import { Router } from 'express';
import {
  getPendingPosts,
  approvePost,
  rejectPost
} from '../controllers/adminController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import { validate, mongoIdParamValidation } from '../middleware/validate.js';

const router = Router();

// Protect all admin routes with JWT authentication and Admin role authorization
router.use(authenticateJWT, requireAdmin);

// List all posts waiting for review with status 'pending'
router.get('/posts/pending', getPendingPosts);

// Approve a pending post
router.patch('/posts/approve/:id', validate(mongoIdParamValidation('id')), approvePost);

// Reject a pending post
router.patch('/posts/reject/:id', validate(mongoIdParamValidation('id')), rejectPost);

export default router;
