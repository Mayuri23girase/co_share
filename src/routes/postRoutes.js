import { Router } from 'express';
import {
  createPost,
  getApprovedPosts,
  getMyPosts,
  getApprovedPostById,
  updatePost,
  deletePost
} from '../controllers/postController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import {
  validate,
  createPostValidationRules,
  updatePostValidationRules,
  mongoIdParamValidation
} from '../middleware/validate.js';

const router = Router();

// Create a new post (protected)
router.post('/', authenticateJWT, validate(createPostValidationRules), createPost);

// Public feed: get all approved posts (with pagination, category & search filters)
router.get('/', getApprovedPosts);

// Get current logged-in user's posts & drafts (MUST be defined BEFORE /:id)
router.get('/my-posts', authenticateJWT, getMyPosts);

// Get approved post by ID (public, 404 if not found or not approved)
router.get('/:id', validate(mongoIdParamValidation('id')), getApprovedPostById);

// Update own post (protected, owner only)
router.patch('/:id', authenticateJWT, validate(updatePostValidationRules), updatePost);

// Delete own post (protected, owner only)
router.delete('/:id', authenticateJWT, validate(mongoIdParamValidation('id')), deletePost);

export default router;
