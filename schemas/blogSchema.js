const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters long'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  // Spanish localized title (optional)
  title_es: {
    type: String,
    trim: true,
    maxlength: [200, 'Title (es) cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    minlength: [50, 'Content must be at least 50 characters long']
  },
  // Spanish localized content (optional)
  content_es: {
    type: String,
    required: [true, 'Content (es) is required'],
    minlength: [50, 'Content (es) must be at least 50 characters long']
  },
  excerpt: {
    type: String,
    required: [true, 'Excerpt is required'],
    trim: true,
    minlength: [20, 'Excerpt must be at least 20 characters long'],
    maxlength: [300, 'Excerpt cannot exceed 300 characters']
  },
  // Spanish localized excerpt (optional)
  excerpt_es: {
    type: String,
    trim: true,
    maxlength: [300, 'Excerpt (es) cannot exceed 300 characters']
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
    minlength: [2, 'Author name must be at least 2 characters long'],
    maxlength: [100, 'Author name cannot exceed 100 characters']
  },
  // Spanish localized author (optional)
  author_es: {
    type: String,
    trim: true,
    maxlength: [100, 'Author (es) cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    enum: {
      values: ['destinations', 'tips', 'culture', 'adventure', 'food', 'photography'],
      message: 'Category must be one of: destinations, tips, culture, adventure, food, photography'
    }
  },
  tags: [{
    type: String,
    trim: true,
    minlength: [1, 'Tag must be at least 2 characters long'],
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  // Spanish localized tags (optional)
  tags_es: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag (es) cannot exceed 30 characters']
  }],
  featuredImage: {
    type: String,
    required: [true, 'Featured image is required'],
    trim: true
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'published', 'archived'],
      message: 'Status must be one of: draft, published, archived'
    },
    default: 'draft'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0,
    min: [0, 'View count cannot be negative']
  },
  readTime: {
    type: String,
    default: '5 min read',
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true
  },
  // Spanish localized slug (optional, unique)
  slug_es: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true
  },
  publishedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate slug from title before saving
blogSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  if (this.isModified('title_es') && !this.slug_es && this.title_es) {
    this.slug_es = this.title_es
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñü]+/g, '-')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/(^-|-$)/g, '');
  }
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
blogSchema.index({ title: 'text', content: 'text', excerpt: 'text', title_es: 'text', content_es: 'text', excerpt_es: 'text', tags: 'text', tags_es: 'text' });
blogSchema.index({ category: 1, status: 1 });
blogSchema.index({ publishedAt: -1 });

module.exports = mongoose.model('Blog', blogSchema);
