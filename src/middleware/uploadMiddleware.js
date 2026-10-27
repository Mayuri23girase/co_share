import multer from 'multer';

// Use memory storage for seamless in-memory processing and Gemini buffer access
const storage = multer.memoryStorage();

/**
 * Filter for documents (PDF, TXT, MD) used in AI content improvement
 */
const documentFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown'
  ];

  const allowedExtensions = ['.pdf', '.txt', '.md'];
  const hasAllowedExt = allowedExtensions.some((ext) =>
    file.originalname.toLowerCase().endsWith(ext)
  );

  if (allowedMimeTypes.includes(file.mimetype) || hasAllowedExt) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only PDF (.pdf) and plain text (.txt, .md) documents are accepted for AI context.');
    error.statusCode = 400;
    cb(error, false);
  }
};

/**
 * Multer middleware for AI document context upload (optional file, max 10MB)
 */
export const uploadDocument = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  },
  fileFilter: documentFilter
}).single('document');

/**
 * Multer middleware for post images (optional image, max 5MB)
 */
export const uploadImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      const error = new Error('Invalid file type. Only image files (PNG, JPEG, WEBP, GIF) are accepted.');
      error.statusCode = 400;
      cb(error, false);
    }
  }
}).single('image');
