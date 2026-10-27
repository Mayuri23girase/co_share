import Post from '../models/Post.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * @desc    Create a new post
 * @route   POST /posts
 * @access  Private (User)
 */
export const createPost = asyncHandler(async (req, res) => {
  const { title, description, content, category, image, status } = req.body;

  // Enforce allowed initial statuses: users cannot set approved or rejected
  let postStatus = 'draft';
  if (status) {
    if (!['draft', 'pending'].includes(status)) {
      return sendError(
        res,
        "Users can only set initial post status to 'draft' or 'pending'. Status 'approved' and 'rejected' are restricted.",
        400
      );
    }
    postStatus = status;
  }

  // createdBy comes strictly from the verified JWT user, never request body
  const post = await Post.create({
    title: title.trim(),
    description: description.trim(),
    content,
    category: category.trim().toLowerCase(),
    image: image ? image.trim() : '',
    createdBy: req.user._id,
    status: postStatus
  });

  const populatedPost = await Post.findById(post._id).populate('createdBy', 'name email');

  return sendSuccess(res, 'Post created successfully', { post: populatedPost }, 201);
});

/**
 * @desc    Get all approved posts (Public feed)
 * @route   GET /posts
 * @access  Public
 */
export const getApprovedPosts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const { category, search } = req.query;

  // Strictly filter for approved posts only
  const query = { status: 'approved' };

  if (category) {
    query.category = category.trim().toLowerCase();
  }

  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { content: searchRegex }
    ];
  }

  const [totalPosts, posts] = await Promise.all([
    Post.countDocuments(query),
    Post.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
  ]);

  const totalPages = Math.ceil(totalPosts / limit) || 1;

  return sendSuccess(res, 'Approved posts retrieved successfully', {
    totalPosts,
    totalPages,
    currentPage: page,
    limit,
    posts
  });
});

/**
 * @desc    Get logged-in user's own posts and drafts (all statuses)
 * @route   GET /posts/my-posts
 * @access  Private (User)
 */
export const getMyPosts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const { status, category } = req.query;

  const query = { createdBy: req.user._id };

  if (status) {
    query.status = status.trim().toLowerCase();
  }

  if (category) {
    query.category = category.trim().toLowerCase();
  }

  const [totalPosts, posts] = await Promise.all([
    Post.countDocuments(query),
    Post.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
  ]);

  const totalPages = Math.ceil(totalPosts / limit) || 1;

  return sendSuccess(res, 'User posts retrieved successfully', {
    totalPosts,
    totalPages,
    currentPage: page,
    limit,
    posts
  });
});

/**
 * @desc    Get a single approved post by ID
 * @route   GET /posts/:id
 * @access  Public
 */
export const getApprovedPostById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findById(id).populate('createdBy', 'name email');

  // Must exist and must be approved
  if (!post || post.status !== 'approved') {
    return sendError(res, 'Approved post not found.', 404);
  }

  return sendSuccess(res, 'Post retrieved successfully', { post });
});

/**
 * @desc    Update user's own post
 * @route   PATCH /posts/:id
 * @access  Private (User - owner only)
 */
export const updatePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, content, category, image, status } = req.body;

  const post = await Post.findById(id);

  if (!post) {
    return sendError(res, 'Post not found.', 404);
  }

  // Ownership verification
  if (post.createdBy.toString() !== req.user._id.toString()) {
    return sendError(res, 'You are not authorized to update this post.', 403);
  }

  // If user provides a status, validate that they cannot set approved/rejected
  if (status && !['draft', 'pending'].includes(status)) {
    return sendError(
      res,
      "Users can only update post status to 'draft' or 'pending'. 'approved' and 'rejected' are restricted.",
      400
    );
  }

  // Handle status transition logic:
  // "Editing a rejected/approved post should reset it to draft or pending."
  if (post.status === 'approved' || post.status === 'rejected') {
    // If the user specified 'draft' or 'pending', use that; otherwise reset to 'draft'
    post.status = status && ['draft', 'pending'].includes(status) ? status : 'draft';
  } else if (status) {
    // Post is currently draft or pending, and user explicitly changes status
    post.status = status;
  }

  // Update modifiable fields (do NOT allow changing createdBy)
  if (title !== undefined) post.title = title.trim();
  if (description !== undefined) post.description = description.trim();
  if (content !== undefined) post.content = content;
  if (category !== undefined) post.category = category.trim().toLowerCase();
  if (image !== undefined) post.image = image ? image.trim() : '';

  await post.save();

  const updatedPost = await Post.findById(post._id).populate('createdBy', 'name email');

  return sendSuccess(res, 'Post updated successfully', { post: updatedPost });
});

/**
 * @desc    Delete user's own post
 * @route   DELETE /posts/:id
 * @access  Private (User - owner only)
 */
export const deletePost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findById(id);

  if (!post) {
    return sendError(res, 'Post not found.', 404);
  }

  // Ownership verification
  if (post.createdBy.toString() !== req.user._id.toString()) {
    return sendError(res, 'You are not authorized to delete this post.', 403);
  }

  await Post.findByIdAndDelete(id);

  return sendSuccess(res, 'Post deleted successfully', null, 200);
});
