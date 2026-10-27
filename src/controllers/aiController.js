import Post from '../models/Post.js';
import { improvePostContent } from '../utils/gemini.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * @desc    Improve a post's content using Google Gemini AI and save as a new draft
 * @route   POST /ai/improve/:postId
 * @access  Private (User - owner only)
 */
export const improvePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  // Find the original post
  const originalPost = await Post.findById(postId);

  if (!originalPost) {
    return sendError(res, 'Post not found.', 404);
  }

  // Ensure the post belongs to the authenticated user
  if (originalPost.createdBy.toString() !== req.user._id.toString()) {
    return sendError(res, 'You are only authorized to improve your own posts.', 403);
  }

  // Send original post data + optional uploaded reference file to Gemini
  const improvedData = await improvePostContent({
    title: originalPost.title,
    description: originalPost.description,
    content: originalPost.content,
    file: req.file || null
  });

  // Save the result as a NEW post document (original remains untouched)
  const newPost = await Post.create({
    title: improvedData.title,
    description: improvedData.description,
    content: improvedData.content,
    category: originalPost.category,
    image: originalPost.image,
    createdBy: req.user._id,
    status: 'draft'
  });

  const populatedNewPost = await Post.findById(newPost._id).populate('createdBy', 'name email');

  return sendSuccess(
    res,
    'AI draft generated and saved successfully. The original post remains untouched.',
    {
      originalPostId: originalPost._id,
      improvedDraft: populatedNewPost
    },
    201
  );
});
