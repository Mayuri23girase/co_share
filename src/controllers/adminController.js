import Post from '../models/Post.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * @desc    List all posts with status 'pending'
 * @route   GET /admin/posts/pending
 * @access  Private (Admin only)
 */
export const getPendingPosts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const query = { status: 'pending' };

  const [totalPosts, posts] = await Promise.all([
    Post.countDocuments(query),
    Post.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
  ]);

  const totalPages = Math.ceil(totalPosts / limit) || 1;

  return sendSuccess(res, 'Pending posts retrieved successfully', {
    totalPosts,
    totalPages,
    currentPage: page,
    limit,
    posts
  });
});

/**
 * @desc    Approve a pending post
 * @route   PATCH /admin/posts/approve/:id
 * @access  Private (Admin only)
 */
export const approvePost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findById(id).populate('createdBy', 'name email');

  if (!post) {
    return sendError(res, 'Post not found.', 404);
  }

  // Can only approve posts if they are currently pending
  if (post.status !== 'pending') {
    return sendError(
      res,
      `Only pending posts can be approved. This post currently has status '${post.status}'.`,
      400
    );
  }

  post.status = 'approved';
  await post.save();

  return sendSuccess(res, 'Post approved successfully', { post });
});

/**
 * @desc    Reject a pending post
 * @route   PATCH /admin/posts/reject/:id
 * @access  Private (Admin only)
 */
export const rejectPost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findById(id).populate('createdBy', 'name email');

  if (!post) {
    return sendError(res, 'Post not found.', 404);
  }

  // Can only reject posts if they are currently pending
  if (post.status !== 'pending') {
    return sendError(
      res,
      `Only pending posts can be rejected. This post currently has status '${post.status}'.`,
      400
    );
  }

  post.status = 'rejected';
  await post.save();

  return sendSuccess(res, 'Post rejected successfully', { post });
});
