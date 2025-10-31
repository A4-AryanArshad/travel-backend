const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  // Spanish localized title (optional)
  title_es: {
    type: String,
    trim: true,
    maxlength: [100, 'Title (es) cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  // Spanish localized description (optional)
  description_es: {
    type: String,
    trim: true,
    maxlength: [500, 'Description (es) cannot exceed 500 characters']
  },
  images: [{
    type: String,
    trim: true
  }],
  imageUrl: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    enum: {
      values: ['nature', 'city', 'landmark', 'culture', 'adventure', 'food', 'people', 'architecture', 'wildlife', 'landscape'],
      message: 'Category must be one of: nature, city, landmark, culture, adventure, food, people, architecture, wildlife, landscape'
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
  featured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive'],
      message: 'Status must be either active or inactive'
    },
    default: 'inactive'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: String,
    required: [true, 'Uploaded by is required'],
    trim: true,
    minlength: [1, 'Uploaded by must be at least 2 characters long'],
    maxlength: [100, 'Uploaded by cannot exceed 100 characters']
  },
  // Spanish localized uploader (optional)
  uploadedBy_es: {
    type: String,
    trim: true,
    maxlength: [100, 'Uploaded by (es) cannot exceed 100 characters']
  },
  alt: {
    type: String,
    required: [true, 'Alt text is required'],
    trim: true,
    minlength: [1, 'Alt text must be at least 3 characters long'],
    maxlength: [200, 'Alt text cannot exceed 200 characters']
  },
  // Spanish localized alt text (optional)
  alt_es: {
    type: String,
    trim: true,
    maxlength: [200, 'Alt text (es) cannot exceed 200 characters']
  },
  viewCount: {
    type: Number,
    default: 0,
    min: [0, 'View count cannot be negative']
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

// Update the updatedAt field before saving
gallerySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
gallerySchema.index({ title: 'text', description: 'text', title_es: 'text', description_es: 'text', tags: 'text', tags_es: 'text' });
gallerySchema.index({ category: 1, featured: 1, status: 1 });
gallerySchema.index({ createdAt: -1 });
gallerySchema.index({ uploadedAt: -1 });
gallerySchema.index({ viewCount: -1 });

module.exports = mongoose.model('Gallery', gallerySchema);
