import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Post title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Post description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    content: {
      type: String,
      required: [true, 'Post content is required']
    },
    image: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      lowercase: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator User reference is required']
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'pending', 'approved', 'rejected'],
        message: 'Status must be one of: draft, pending, approved, rejected'
      },
      default: 'draft'
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for high performance querying
postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ createdBy: 1, createdAt: -1 });
postSchema.index({ category: 1, status: 1 });
postSchema.index({ title: 'text', description: 'text', content: 'text' });

const Post = mongoose.model('Post', postSchema);

export default Post;
