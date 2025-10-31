



const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const User = require('../schemas/userSchema');
const Blog = require('../schemas/blogSchema');
const Tour = require('../schemas/tourSchema');
const Gallery = require('../schemas/gallerySchema');
const Booking = require('../schemas/bookingSchema');
const Review = require('../schemas/reviewSchema');
const cloudinary = require('cloudinary').v2;
const AWS = require('aws-sdk');
const stripe = require('stripe')('sk_test_51Rj1dnBOoulucdCvbGDz4brJYHztkuL80jGSKcnQNT46g9P58pbxY36Lg3yWyMDb6Gwgv5Rr3NDfjvB2HyaDlJP7006wnXEtp1');
const nodemailer = require('nodemailer');

// Cloudinary configuration (hardcoded as requested)
cloudinary.config({
  cloud_name: 'dftnqqcjz',
  api_key: '419724397335875',
  api_secret: 'Q7usOM7s5EsyeubXFzy5fQ1I_7A',
  secure: true
});

// AWS S3 configuration (expects credentials via environment variables)
const s3 = new AWS.S3({
  accessKeyId: process.env.AKIA3ISBVURJQYYF434J,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'eu-north-1'
});

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Image compression function
const compressImage = async (inputBuffer, options = {}) => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 80,
    format = 'jpeg'
  } = options;

  try {
    const originalSize = inputBuffer.length;

    const compressedBuffer = await sharp(inputBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality })
      .toBuffer();

    const compressedSize = compressedBuffer.length;
    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

    console.log(`📸 Image Compression Results:`);
    console.log(`   Original: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Compressed: ${(compressedSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Savings: ${savings}% (${((originalSize - compressedSize) / 1024 / 1024).toFixed(2)}MB saved)`);
    console.log(`   Quality: ${quality}%, Max Size: ${maxWidth}x${maxHeight}px`);

    return compressedBuffer;
  } catch (error) {
    console.error('Image compression error:', error);
    throw new Error('Failed to compress image');
  }
};

// Multer configuration for image uploads (using memory storage)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit to support high-res images
  }
});

// Multer error-safe wrapper
const safeUploadSingle = (field) => (req, res, next) => {
  const handler = upload.single(field);
  handler(req, res, function (err) {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Image too large. Max 25MB.' });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// Signup controller
const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      username: username || '',
      email,
      password: hashedPassword,
      role: email === 'zain@gmail.com' ? 'admin' : 'user' // Special admin email
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie for production
    if (process.env.NODE_ENV === 'production') {
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined
      });
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        token
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Login controller
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie for production
    if (process.env.NODE_ENV === 'production') {
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Logout controller
const logout = async (req, res) => {
  try {
    // Clear the HTTP-only cookie
    if (process.env.NODE_ENV === 'production') {
      res.clearCookie('authToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Blog CRUD Controllers

// Compress image and return to frontend
const compressImageEndpoint = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log('🔄 Compressing image...');
    console.log(`📁 File: ${req.file.originalname}`);
    console.log(`📏 Original size: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`);

    // Compress the image from memory buffer
    const compressedBuffer = await compressImage(req.file.buffer, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 80
    });

    console.log(`✅ Compression complete`);
    console.log(`📏 Compressed size: ${(compressedBuffer.length / 1024 / 1024).toFixed(2)}MB`);

    // Send compressed image back to frontend as base64
    const base64Image = compressedBuffer.toString('base64');

    res.status(200).json({
      success: true,
      message: 'Image compressed successfully',
      data: {
        compressedImage: `data:image/jpeg;base64,${base64Image}`,
        originalSize: req.file.size,
        compressedSize: compressedBuffer.length,
        savings: ((req.file.size - compressedBuffer.length) / req.file.size * 100).toFixed(1)
      }
    });

  } catch (error) {
    console.error('Compress image error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Compress image then upload directly to AWS S3
const compressAndUploadToS3 = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    // Compress in-memory image buffer
    const compressedBuffer = await compressImage(req.file.buffer, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 80
    });

    const key = `${Date.now()}-${req.file.originalname}`;

    const params = {
      Bucket: 'zenibucket',
      Key: key,
      Body: compressedBuffer,
      ContentType: req.file.mimetype
      // ACL: 'public-read', // Uncomment if your bucket requires it
    };

    s3.upload(params, (err, data) => {
      if (err) {
        console.log(err.message);
        return res.status(500).json({ success: false, message: 'S3 upload failed', error: err.message });
      }
      return res.status(200).json({ success: true, url: data.Location, key });
    });
  } catch (error) {
    console.error('compressAndUploadToS3 error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// Upload image
const uploadImage = async (req, res) => {
  try {
    if (!req.file && !req.body.image) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log('🔄 Processing image upload...');
    let result;
    if (req.file) {
      console.log(`📁 File upload: ${req.file.originalname}`);
      // Use memory buffer instead of file path
      const inputBuffer = req.file.buffer;

      // Compress the image
      const compressedBuffer = await compressImage(inputBuffer, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 80
      });

      // Upload compressed image to Cloudinary
      result = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`,
        {
          folder: 'travel/images',
          resource_type: 'image',
          quality: 'auto',
          fetch_format: 'auto'
        }
      );
    } else if (req.body.image) {
      console.log('📄 Base64 data upload');
      // Handle base64 data
      const base64Data = req.body.image.replace(/^data:image\/[a-z]+;base64,/, '');
      const inputBuffer = Buffer.from(base64Data, 'base64');

      // Compress the image
      const compressedBuffer = await compressImage(inputBuffer, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 80
      });

      // Upload compressed image to Cloudinary
      result = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`,
        {
          folder: 'travel/images',
          resource_type: 'image',
          quality: 'auto',
          fetch_format: 'auto'
        }
      );
    }

    console.log('✅ Image upload completed successfully');
    console.log(`🔗 Cloudinary URL: ${result.secure_url}`);

    res.status(200).json({
      success: true,
      message: 'Image uploaded and compressed successfully',
      data: {
        imageUrl: result.secure_url,
        publicId: result.public_id,
      }
    });

  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Create blog
const createBlog = async (req, res) => {
  try {
    const { title, title_es, content, content_es, excerpt, excerpt_es, author, author_es, category, tags, tags_es, featuredImage, status, isFeatured, readTime, slug_es } = req.body;

    // Validation
    if (!title || !content || !content_es || !excerpt || !author || !category || !featuredImage) {
      return res.status(400).json({
        success: false,
        message: 'Title, content (both languages), excerpt, author, category, and featured image are required'
      });
    }

    if (content.length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Content must be at least 50 characters long'
      });
    }
    if (content_es && content_es.length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Content (es) must be at least 50 characters long'
      });
    }

    if (excerpt.length < 20 || excerpt.length > 300) {
      return res.status(400).json({
        success: false,
        message: 'Excerpt must be between 20 and 300 characters'
      });
    }

    // Validate category
    const validCategories = ['destinations', 'tips', 'culture', 'adventure', 'food', 'photography'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Must be one of: destinations, tips, culture, adventure, food, photography'
      });
    }

    // Validate status
    const validStatuses = ['draft', 'published', 'archived'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: draft, published, archived'
      });
    }

    // Set publishedAt if status is published
    const publishedAt = status === 'published' ? new Date() : null;

    const blog = new Blog({
      title,
      title_es,
      content,
      content_es,
      excerpt,
      excerpt_es,
      author,
      author_es,
      category,
      tags: tags || [],
      tags_es: tags_es || [],
      featuredImage,
      status: status || 'draft',
      isFeatured: isFeatured === 'true' || isFeatured === true,
      readTime: readTime || '5 min read',
      slug_es,
      publishedAt
    });

    await blog.save();

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: blog
    });

  } catch (error) {
    console.error('Create blog error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all blogs
const getBlogs = async (req, res) => {
  try {
    const { status, category, search } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .select('-content'); // Exclude full content for list view

    const total = blogs.length;

    res.status(200).json({
      success: true,
      data: {
        blogs,
        total
      }
    });

  } catch (error) {
    console.error('Get blogs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get single blog
const getBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Increment view count
    blog.viewCount += 1;
    await blog.save();

    res.status(200).json({
      success: true,
      data: blog
    });

  } catch (error) {
    console.error('Get blog error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update blog
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.createdAt;
    delete updateData.viewCount;

    // Validate category if provided
    if (updateData.category) {
      const validCategories = ['destinations', 'tips', 'culture', 'adventure', 'food', 'photography'];
      if (!validCategories.includes(updateData.category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category. Must be one of: destinations, tips, culture, adventure, food, photography'
        });
      }
    }

    // Validate status if provided
    if (updateData.status) {
      const validStatuses = ['draft', 'published', 'archived'];
      if (!validStatuses.includes(updateData.status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: draft, published, archived'
        });
      }
    }

    // Validate content length if provided
    if (updateData.content && updateData.content.length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Content must be at least 50 characters long'
      });
    }
    if (updateData.content_es && updateData.content_es.length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Content (es) must be at least 50 characters long'
      });
    }

    // Validate excerpt length if provided
    if (updateData.excerpt && (updateData.excerpt.length < 20 || updateData.excerpt.length > 300)) {
      return res.status(400).json({
        success: false,
        message: 'Excerpt must be between 20 and 300 characters'
      });
    }

    // Set publishedAt if status is being changed to published
    if (updateData.status === 'published' && !updateData.publishedAt) {
      updateData.publishedAt = new Date();
    }

    // If status is being changed from published, clear publishedAt
    if (updateData.status && updateData.status !== 'published') {
      updateData.publishedAt = null;
    }

    // Handle isFeatured boolean conversion
    if (updateData.isFeatured !== undefined) {
      updateData.isFeatured = updateData.isFeatured === 'true' || updateData.isFeatured === true;
    }

    const blog = await Blog.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      data: blog
    });

  } catch (error) {
    console.error('Update blog error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete blog
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findByIdAndDelete(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Blog deleted successfully'
    });

  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get blog categories
const getBlogCategories = async (req, res) => {
  try {
    const categories = await Blog.distinct('category');

    res.status(200).json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// User Management Controllers

// Get all users
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get single user
const getUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.password;
    delete updateData.createdAt;

    // Validate role if provided
    if (updateData.role) {
      const validRoles = ['user', 'admin'];
      if (!validRoles.includes(updateData.role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be either user or admin'
        });
      }
    }

    // Validate email if provided
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update user error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user && req.user.userId === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Gallery Management Controllers

// Create gallery item
const createGallery = async (req, res) => {
  try {
    console.log('Create gallery request body:', req.body);
    const body = req.body || {};
    const { title, title_es, description, description_es, imageUrl, images, category, tags, tags_es, featured, status, uploadedBy, uploadedBy_es, alt, alt_es } = body;

    // Validation
    const required = ['title', 'description', 'category', 'uploadedBy', 'alt'];
    const missing = required.filter((k) => !body[k]);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }

    // Validate category
    const validCategories = ['nature', 'city', 'landmark', 'culture', 'adventure', 'food', 'people', 'architecture', 'wildlife', 'landscape'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Must be one of: nature, city, landmark, culture, adventure, food, people, architecture, wildlife, landscape'
      });
    }

    // Validate status
    const validStatuses = ['active', 'inactive'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be either active or inactive'
      });
    }

    // Handle multiple images upload
    let imageUrls = [];
    if (images && Array.isArray(images) && images.length > 0) {
      console.log(`🔄 Processing ${images.length} gallery images...`);
      for (let i = 0; i < images.length; i++) {
        try {
          const img = images[i];
          const isDataUrl = typeof img === 'string' && img.startsWith('data:');
          const isHttp = typeof img === 'string' && /^https?:\/\//.test(img);

          if (isDataUrl) {
            console.log(`📸 Compressing gallery image ${i + 1}/${images.length}...`);
            // Compress image before upload
            const base64Data = img.replace(/^data:image\/[a-z]+;base64,/, '');
            const inputBuffer = Buffer.from(base64Data, 'base64');
            const compressedBuffer = await compressImage(inputBuffer, {
              maxWidth: 1200,
              maxHeight: 1200,
              quality: 80
            });

            const uploadRes = await cloudinary.uploader.upload(
              `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`,
              {
                folder: 'travel/gallery',
                resource_type: 'image',
                quality: 'auto',
                fetch_format: 'auto'
              }
            );
            imageUrls.push(uploadRes.secure_url);
          } else if (isHttp) {
            imageUrls.push(img);
          }
        } catch (e) {
          console.warn('Cloudinary upload failed for one image:', e.message);
        }
      }
    }

    // Handle single image for backward compatibility
    let singleImageUrl = '';
    if (imageUrl) {
      try {
        const isDataUrl = typeof imageUrl === 'string' && imageUrl.startsWith('data:');
        const isHttp = typeof imageUrl === 'string' && /^https?:\/\//.test(imageUrl);
        if (isDataUrl) {
          console.log('📸 Compressing main gallery image...');
          // Compress image before upload
          const base64Data = imageUrl.replace(/^data:image\/[a-z]+;base64,/, '');
          const inputBuffer = Buffer.from(base64Data, 'base64');
          const compressedBuffer = await compressImage(inputBuffer, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 80
          });

          const uploadRes = await cloudinary.uploader.upload(
            `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`,
            {
              folder: 'travel/gallery',
              resource_type: 'image',
              quality: 'auto',
              fetch_format: 'auto'
            }
          );
          singleImageUrl = uploadRes.secure_url;
        } else if (isHttp) {
          singleImageUrl = imageUrl;
        }
      } catch (e) {
        console.warn('Cloudinary upload failed for main image:', e.message);
      }
    }

    // Use first image from images array as main image if no single image provided
    if (!singleImageUrl && imageUrls.length > 0) {
      singleImageUrl = imageUrls[0];
    }

    // Ensure at least one image
    if (!singleImageUrl && imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one image is required'
      });
    }

    const gallery = new Gallery({
      title,
      title_es,
      description,
      description_es,
      imageUrl: singleImageUrl,
      images: imageUrls,
      category,
      tags: tags || [],
      tags_es: tags_es || [],
      featured: featured === 'true' || featured === true,
      status: status || 'inactive',
      uploadedBy,
      uploadedBy_es,
      alt,
      alt_es
    });

    await gallery.save();

    res.status(201).json({
      success: true,
      message: 'Gallery item created successfully',
      data: gallery
    });

  } catch (error) {
    console.error('Create gallery error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      console.log('Validation errors:', errors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all gallery items
const getGallery = async (req, res) => {
  try {
    const { category, status, featured, search } = req.query;

    let query = {};

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (featured !== undefined) {
      query.featured = featured === 'true';
    }

    if (search) {
      query.$text = { $search: search };
    }

    const galleryItems = await Gallery.find(query)
      .sort({ uploadedAt: -1 });

    const total = galleryItems.length;

    res.status(200).json({
      success: true,
      data: {
        galleryItems,
        total
      }
    });

  } catch (error) {
    console.error('Get gallery error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get single gallery item
const getGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const galleryItem = await Gallery.findById(id);
    if (!galleryItem) {
      return res.status(404).json({
        success: false,
        message: 'Gallery item not found'
      });
    }

    // Increment view count
    galleryItem.viewCount += 1;
    await galleryItem.save();

    res.status(200).json({
      success: true,
      data: galleryItem
    });

  } catch (error) {
    console.error('Get gallery item error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update gallery item
const updateGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.createdAt;
    delete updateData.viewCount;

    // Validate category if provided
    if (updateData.category) {
      const validCategories = ['nature', 'city', 'landmark', 'culture', 'adventure', 'food', 'people', 'architecture', 'wildlife', 'landscape'];
      if (!validCategories.includes(updateData.category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category. Must be one of: nature, city, landmark, culture, adventure, food, people, architecture, wildlife, landscape'
        });
      }
    }

    // Validate status if provided
    if (updateData.status) {
      const validStatuses = ['active', 'inactive'];
      if (!validStatuses.includes(updateData.status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be either active or inactive'
        });
      }
    }

    // Handle featured boolean conversion
    if (updateData.featured !== undefined) {
      updateData.featured = updateData.featured === 'true' || updateData.featured === true;
    }

    // Handle multiple images upload
    if (updateData.images && Array.isArray(updateData.images)) {
      let imageUrls = [];
      for (const img of updateData.images) {
        try {
          const isDataUrl = typeof img === 'string' && img.startsWith('data:');
          const isHttp = typeof img === 'string' && /^https?:\/\//.test(img);

          if (isDataUrl) {
            const uploadRes = await cloudinary.uploader.upload(img, {
              folder: 'travel/gallery',
              resource_type: 'image'
            });
            imageUrls.push(uploadRes.secure_url);
          } else if (isHttp) {
            imageUrls.push(img);
          }
        } catch (e) {
          console.warn('Cloudinary upload failed for one image:', e.message);
        }
      }
      updateData.images = imageUrls;

      // Update main imageUrl to first image if available
      if (imageUrls.length > 0 && !updateData.imageUrl) {
        updateData.imageUrl = imageUrls[0];
      }
    }

    // Handle single image upload
    if (updateData.imageUrl) {
      const isDataUrl = typeof updateData.imageUrl === 'string' && updateData.imageUrl.startsWith('data:');
      if (isDataUrl) {
        try {
          const uploadRes = await cloudinary.uploader.upload(updateData.imageUrl, {
            folder: 'travel/gallery',
            resource_type: 'image'
          });
          updateData.imageUrl = uploadRes.secure_url;
        } catch (e) {
          console.warn('Cloudinary upload failed for main image:', e.message);
        }
      }
    }

    const galleryItem = await Gallery.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!galleryItem) {
      return res.status(404).json({
        success: false,
        message: 'Gallery item not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Gallery item updated successfully',
      data: galleryItem
    });

  } catch (error) {
    console.error('Update gallery error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete gallery item
const deleteGallery = async (req, res) => {
  try {
    const { id } = req.params;

    const galleryItem = await Gallery.findByIdAndDelete(id);
    if (!galleryItem) {
      return res.status(404).json({
        success: false,
        message: 'Gallery item not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Gallery item deleted successfully'
    });

  } catch (error) {
    console.error('Delete gallery error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get gallery categories
const getGalleryCategories = async (req, res) => {
  try {
    const categories = await Gallery.distinct('category');

    res.status(200).json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Get gallery categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ==================== REVIEW CONTROLLERS ====================

// Create a review (only for users who have completed bookings)
const createReview = async (req, res) => {
  try {
    const { tourId, bookingId, rating, title, comment } = req.body;
    const userId = req.user._id;

    // Validate booking exists and belongs to user
    const booking = await Booking.findOne({
      _id: bookingId,
      user: userId,
      tour: tourId,
      paymentStatus: 'paid' // Only paid bookings can be reviewed
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or you do not have permission to review this tour'
      });
    }

    // Check if user already reviewed this tour
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      console.log(existingReview)
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this tour'
      });
    }

    // Create review
    const review = new Review({
      tour: tourId,
      user: userId,
      booking: bookingId,
      rating,
      title,
      comment
    });

    await review.save();

    // Populate user details
    await review.populate('user', 'username');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      review
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// Get reviews for a tour
const getTourReviews = async (req, res) => {
  try {
    const { tourId } = req.params;

    const reviews = await Review.find({ tour: tourId })
      .populate('user', 'username')
      .sort({ createdAt: -1 });

    // Calculate review statistics
    const mongoose = require('mongoose');
    const stats = await Review.aggregate([
      { $match: { tour: new mongoose.Types.ObjectId(tourId) } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratings: {
            $push: '$rating'
          }
        }
      }
    ]);

    // Count ratings by star
    let ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (stats.length > 0) {
      stats[0].ratings.forEach(rating => {
        ratingDistribution[rating]++;
      });
    }

    res.status(200).json({
      success: true,
      reviews,
      stats: stats.length > 0 ? {
        avgRating: Math.round(stats[0].avgRating * 10) / 10,
        totalReviews: stats[0].totalReviews,
        ratingDistribution
      } : {
        avgRating: 0,
        totalReviews: 0,
        ratingDistribution
      }
    });
  } catch (error) {
    console.error('Get tour reviews error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// Check if user can review a tour
const canUserReview = async (req, res) => {
  try {
    const { tourId } = req.params;
    const userId = req.user._id;

    // Check if user has a paid booking for this tour
    const booking = await Booking.findOne({
      _id: tourId,
      user: userId,
      paymentStatus: 'paid'
    });

    if (!booking) {
      return res.status(200).json({
        success: true,
        canReview: false,
        reason: 'You need to book and complete this tour to leave a review',
        booking: null
      });
    }

    // Check if user already reviewed
    const existingReview = await Review.findOne({ booking: booking._id });
    if (existingReview) {
      return res.status(200).json({
        success: true,
        canReview: false,
        reason: 'You have already reviewed this tour',
        booking: booking._id,
        review: existingReview
      });
    }

    res.status(200).json({
      success: true,
      canReview: true,
      booking: booking._id
    });
  } catch (error) {
    console.error('Can user review error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// Update review
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.user._id;

    const review = await Review.findOne({ _id: id, user: userId });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (rating) review.rating = rating;
    if (title) review.title = title;
    if (comment) review.comment = comment;

    await review.save();
    await review.populate('user', 'username');

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// Delete review
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const review = await Review.findOne({ _id: id, user: userId });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    await review.remove();

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// ==================== GALLERY STATS ====================

// Get gallery statistics
const getGalleryStats = async (req, res) => {
  try {
    // Get total number of gallery items
    const totalPhotos = await Gallery.countDocuments({ status: 'active' });

    // Get unique destinations from tours
    const destinations = await Tour.distinct('location');
    const totalDestinations = destinations.length;

    // Get total number of confirmed bookings (happy travelers)
    const happyTravelers = await Booking.countDocuments({ paymentStatus: 'paid' });

    // Calculate average rating from all reviews
    const reviewStats = await Review.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    const averageRating = reviewStats.length > 0
      ? Math.round(reviewStats[0].avgRating * 10) / 10
      : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalPhotos,
        totalDestinations,
        happyTravelers,
        averageRating
      }
    });
  } catch (error) {
    console.error('Get gallery stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

module.exports = {
  signup,
  login,
  logout,
  getProfile,
  uploadImage,
  compressImageEndpoint,
  compressAndUploadToS3,
  createBlog,
  getBlogs,
  getBlog,
  updateBlog,
  deleteBlog,
  getBlogCategories,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  createGallery,
  getGallery,
  getGalleryItem,
  updateGallery,
  deleteGallery,
  getGalleryCategories,
  upload,
  safeUploadSingle,
  // Tours exports added below after definitions
};

// ==================== CONTACT EMAIL ====================

const transport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'ahmadmurtaza2233@gmail.com',
    pass: process.env.EMAIL_PASS || 'czhupnxmdckqhydy',
  },
});

const sendContactEmail = async (req, res) => {
  try {
    const { name, email, phone, country, heardFrom, message } = req.body || {};
    console.log(req.body)

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const html = `
      <div style="font-family: Inter, Arial, sans-serif;">
        <h2 style="margin:0 0 10px;">New Contact Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
        ${country ? `<p><strong>Country:</strong> ${country}</p>` : ''}
        ${heardFrom ? `<p><strong>Heard From:</strong> ${heardFrom}</p>` : ''}
        ${message ? `<p><strong>Message:</strong><br/>${(message + '').replace(/\n/g, '<br/>')}</p>` : ''}
        <hr/>
        <p style="font-size:12px;color:#666">Travel Beyond Tours contact form</p>
      </div>
    `;

    const mailOptions = {
      from: `Travel Beyond Tours <${process.env.EMAIL_USER || 'ahmadmurtaza2233@gmail.com'}>`,
      to: process.env.EMAIL_TO || process.env.EMAIL_USER || email,
      subject: `New Contact Form Submission - ${name}`,
      replyTo: email,
      html,
    };

    await transport.sendMail(mailOptions);

    return res.status(200).json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Send contact email error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send message', error: error.message });
  }
};

module.exports.sendContactEmail = sendContactEmail;

// Tours/Packages Controllers

const createTour = async (req, res) => {
  try {
    const body = req.body || {};
    const required = ['title', 'description', 'price', 'duration', 'location', 'category'];
    const missing = required.filter((k) => !body[k]);
    if (missing.length) {
      return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
    }

    // Handle multiple images
    let imageUrls = [];
    if (body.images && Array.isArray(body.images) && body.images.length > 0) {
      console.log(`🔄 Processing ${body.images.length} tour images...`);
      for (let i = 0; i < body.images.length; i++) {
        try {
          const img = body.images[i];
          const isDataUrl = typeof img === 'string' && img.startsWith('data:');
          const isHttp = typeof img === 'string' && /^https?:\/\//.test(img);

          if (isDataUrl) {
            console.log(`📸 Compressing tour image ${i + 1}/${body.images.length}...`);
            // Compress image before upload
            const base64Data = img.replace(/^data:image\/[a-z]+;base64,/, '');
            const inputBuffer = Buffer.from(base64Data, 'base64');
            const compressedBuffer = await compressImage(inputBuffer, {
              maxWidth: 1200,
              maxHeight: 1200,
              quality: 80
            });

            const uploadRes = await cloudinary.uploader.upload(
              `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`,
              {
                folder: 'travel/tours',
                resource_type: 'image',
                quality: 'auto',
                fetch_format: 'auto'
              }
            );
            imageUrls.push(uploadRes.secure_url);
          } else if (isHttp) {
            imageUrls.push(img);
          }
        } catch (e) {
          console.warn('Cloudinary upload failed for one image:', e.message);
        }
      }
    }

    // Handle single image for backward compatibility
    let singleImageUrl = '';
    if (body.image) {
      try {
        const isDataUrl = typeof body.image === 'string' && body.image.startsWith('data:');
        const isHttp = typeof body.image === 'string' && /^https?:\/\//.test(body.image);
        if (isDataUrl) {
          console.log('📸 Compressing main tour image...');
          // Compress image before upload
          const base64Data = body.image.replace(/^data:image\/[a-z]+;base64,/, '');
          const inputBuffer = Buffer.from(base64Data, 'base64');
          const compressedBuffer = await compressImage(inputBuffer, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 80
          });

          const uploadRes = await cloudinary.uploader.upload(
            `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`,
            {
              folder: 'travel/tours',
              resource_type: 'image',
              quality: 'auto',
              fetch_format: 'auto'
            }
          );
          singleImageUrl = uploadRes.secure_url;
        } else if (isHttp) {
          singleImageUrl = body.image;
        }
      } catch (e) {
        console.warn('Cloudinary upload failed for main image:', e.message);
      }
    }

    // Use first image from images array as main image if no single image provided
    if (!singleImageUrl && imageUrls.length > 0) {
      singleImageUrl = imageUrls[0];
    }

    const tour = new Tour({
      title: body.title,
      title_es: body.title_es,
      description: body.description,
      description_es: body.description_es,
      price: body.price,
      duration: body.duration,
      location: body.location,
      location_es: body.location_es,
      category: body.category,
      category_es: body.category_es,
      rating: body.rating || 0,
      image: singleImageUrl,
      images: imageUrls,
      status: body.status || 'draft',
      featured: !!body.featured,
      maxParticipants: body.maxParticipants || 10,
      difficulty: body.difficulty || 'easy',
      highlights: body.highlights || [],
      highlights_es: body.highlights_es || [],
      included: body.included || [],
      included_es: body.included_es || [],
      notIncluded: body.notIncluded || [],
      notIncluded_es: body.notIncluded_es || [],
      itinerary: body.itinerary || [],
      itinerary_es: body.itinerary_es || []
    });

    await tour.save();
    res.status(201).json({ success: true, message: 'Tour created successfully', data: tour });
  } catch (error) {
    console.error('Create tour error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const getTours = async (req, res) => {
  try {
    const { status, category, search, featured } = req.query;
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) query.$text = { $search: search };
    if (typeof featured !== 'undefined') {
      query.featured = String(featured).toLowerCase() === 'true';
    }

    const tours = await Tour.find(query).sort({ createdAt: -1 });
    const total = tours.length;
    res.json({ success: true, data: { tours, total } });
  } catch (error) {
    console.error('Get tours error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const getTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) return res.status(404).json({ success: false, message: 'Tour not found' });
    console.log(tour)
    res.json({ success: true, data: tour });
  } catch (error) {
    console.error('Get tour error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const updateTour = async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date() };
    delete updates.createdAt;

    const tour = await Tour.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!tour) return res.status(404).json({ success: false, message: 'Tour not found' });
    res.json({ success: true, message: 'Tour updated successfully', data: tour });
  } catch (error) {
    console.error('Update tour error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const deleteTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndDelete(req.params.id);
    if (!tour) return res.status(404).json({ success: false, message: 'Tour not found' });
    res.json({ success: true, message: 'Tour deleted successfully' });
  } catch (error) {
    console.error('Delete tour error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// Dashboard counts
const getCounts = async (req, res) => {
  try {
    const [users, blogs, gallery, tours, bookings] = await Promise.all([
      User.countDocuments({}),
      Blog.countDocuments({}),
      (require('../schemas/gallerySchema'))?.countDocuments({}) || Promise.resolve(0),
      Tour.countDocuments({}),
      Booking.countDocuments({})
    ]);
    res.json({ success: true, data: { users, blogs, gallery, tours, bookings } });
  } catch (error) {
    console.error('Get counts error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// ==================== BOOKING CONTROLLERS ====================

// Create a new booking
const createBooking = async (req, res) => {
  try {
    const { tourId, participants, travelDate, customerInfo, notes } = req.body;
    const userId = req.user._id;

    // Validate tour exists
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Tour not found' });
    }

    // Calculate total price
    const totalPrice = tour.price * participants;

    // Create booking
    const booking = new Booking({
      user: userId,
      tour: tourId,
      participants,
      totalPrice,
      travelDate,
      customerInfo,
      notes,
      paymentStatus: 'pending',
      status: 'pending'
    });

    await booking.save();

    // Populate tour details
    await booking.populate('tour');

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// Get user bookings
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user._id;

    const bookings = await Booking.find({ user: userId })
      .populate('tour')
      .sort({ bookingDate: -1 });

    res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// Get all bookings (admin)
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('tour')
      .populate('user', 'username email')
      .sort({ bookingDate: -1 });

    res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// Create payment intent
const createPaymentIntent = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user._id;

    // Find booking
    const booking = await Booking.findOne({ _id: bookingId, user: userId }).populate('tour');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Booking already paid' });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.totalPrice * 100), // Stripe expects amount in cents
      currency: 'usd',
      metadata: {
        bookingId: booking._id.toString(),
        userId: userId.toString(),
        tourTitle: booking.tour.title
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update booking with payment intent ID
    booking.paymentIntentId = paymentIntent.id;
    await booking.save();

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// Update payment status (webhook or after payment confirmation)
const updatePaymentStatus = async (req, res) => {
  try {
    const { bookingId, paymentIntentId, paymentStatus, paymentMethod } = req.body;
    const userId = req.user._id;

    const booking = await Booking.findOne({ _id: bookingId, user: userId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.paymentStatus = paymentStatus;
    booking.paymentMethod = paymentMethod;

    if (paymentStatus === 'paid') {
      booking.status = 'confirmed';
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Payment status updated',
      booking
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// Cancel booking
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const booking = await Booking.findOne({ _id: id, user: userId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel paid booking. Please contact support for refund.'
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.status(200).json({ success: true, message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

// Get tour bookings (admin) - Shows all tours with their bookings
const getTourBookings = async (req, res) => {
  try {
    // Get all tours
    const tours = await Tour.find().sort({ createdAt: -1 });

    // For each tour, get its bookings with user details
    const toursWithBookings = await Promise.all(
      tours.map(async (tour) => {
        const bookings = await Booking.find({ tour: tour._id })
          .populate('user', 'username email')
          .sort({ bookingDate: -1 });

        // Calculate statistics for this tour
        const stats = {
          totalBookings: bookings.length,
          pendingPayments: bookings.filter(b => b.paymentStatus === 'pending').length,
          confirmedBookings: bookings.filter(b => b.paymentStatus === 'paid').length,
          totalRevenue: bookings
            .filter(b => b.paymentStatus === 'paid')
            .reduce((sum, b) => sum + b.totalPrice, 0),
          totalParticipants: bookings
            .filter(b => b.paymentStatus === 'paid')
            .reduce((sum, b) => sum + b.participants, 0)
        };

        return {
          tour: {
            _id: tour._id,
            title: tour.title,
            location: tour.location,
            price: tour.price,
            duration: tour.duration,
            status: tour.status,
            image: tour.image || tour.images?.[0],
            maxParticipants: tour.maxParticipants
          },
          bookings,
          stats
        };
      })
    );

    res.status(200).json({ success: true, data: toursWithBookings });
  } catch (error) {
    console.error('Get tour bookings error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

module.exports.createTour = createTour;
module.exports.getTours = getTours;
module.exports.getTour = getTour;
module.exports.updateTour = updateTour;
module.exports.deleteTour = deleteTour;
module.exports.getCounts = getCounts;
module.exports.getCounts = getCounts;
module.exports.createBooking = createBooking;
module.exports.getUserBookings = getUserBookings;
module.exports.getAllBookings = getAllBookings;
module.exports.createPaymentIntent = createPaymentIntent;
module.exports.updatePaymentStatus = updatePaymentStatus;
module.exports.cancelBooking = cancelBooking;
module.exports.getTourBookings = getTourBookings;
module.exports.createReview = createReview;
module.exports.getTourReviews = getTourReviews;
module.exports.canUserReview = canUserReview;
module.exports.updateReview = updateReview;
module.exports.deleteReview = deleteReview;
module.exports.getGalleryStats = getGalleryStats;