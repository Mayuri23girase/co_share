import { Router } from 'express';
import { improvePost } from '../controllers/aiController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { uploadDocument } from '../middleware/uploadMiddleware.js';
import { validate, mongoIdParamValidation } from '../middleware/validate.js';

const router = Router();

// Improve post with Gemini AI, supporting optional uploaded reference document (PDF/text)
router.post(
  '/improve/:postId',
  authenticateJWT,
  uploadDocument,
  validate(mongoIdParamValidation('postId')),
  improvePost
);

export default router;
