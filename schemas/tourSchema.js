const mongoose = require('mongoose');

const itineraryDaySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Itinerary day title is required'],
    trim: true,
    minlength: [1, 'Itinerary title must be at least 3 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [300, 'Itinerary description cannot exceed 300 characters']
  },
  points: [{
    type: String,
    trim: true,
    minlength: [1, 'Point must be at least 2 characters'],
    maxlength: [120, 'Point cannot exceed 120 characters']
  }]
}, { _id: false });

// Optional Spanish-localized itinerary structure
const itineraryDaySchemaEs = new mongoose.Schema({
  title_es: {
    type: String,
    trim: true,
    maxlength: [120, 'Itinerary title (es) cannot exceed 120 characters']
  },
  description_es: {
    type: String,
    trim: true,
    maxlength: [300, 'Itinerary description (es) cannot exceed 300 characters']
  },
  points_es: [{
    type: String,
    trim: true,
    maxlength: [120, 'Point (es) cannot exceed 120 characters']
  }]
}, { _id: false });

const tourSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [120, 'Title cannot exceed 120 characters']
  },
  // Spanish localized title (optional)
  title_es: {
    type: String,
    trim: true,
    maxlength: [120, 'Title (es) cannot exceed 120 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 20 characters'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  // Spanish localized description (optional)
  description_es: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description (es) cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  duration: {
    type: String,
    required: [true, 'Duration is required'],
    trim: true,
    maxlength: [60, 'Duration cannot exceed 60 characters']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [120, 'Location cannot exceed 120 characters']
  },
  // Spanish localized location (optional)
  location_es: {
    type: String,
    trim: true,
    maxlength: [120, 'Location (es) cannot exceed 120 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    enum: {
      values: ['adventure', 'cultural', 'relaxation', 'nature', 'city'],
      message: 'Invalid category'
    }
  },
  // Spanish localized category (optional, free text for flexibility)
  category_es: {
    type: String,
    trim: true,
    maxlength: [60, 'Category (es) cannot exceed 60 characters']
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5']
  },
  images: [{
    type: String,
    trim: true
  }],
  image: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'draft'],
      message: 'Invalid status'
    },
    default: 'draft'
  },
  featured: {
    type: Boolean,
    default: false
  },
  maxParticipants: {
    type: Number,
    default: 10,
    min: [1, 'Max participants must be at least 1']
  },
  difficulty: {
    type: String,
    enum: {
      values: ['easy', 'medium', 'hard'],
      message: 'Invalid difficulty'
    },
    default: 'easy'
  },
  highlights: [{
    type: String,
    trim: true,
    minlength: [1, 'Highlight must be at least 2 characters'],
    maxlength: [120, 'Highlight cannot exceed 120 characters']
  }],
  // Spanish localized highlights (optional)
  highlights_es: [{
    type: String,
    trim: true,
    maxlength: [120, 'Highlight (es) cannot exceed 120 characters']
  }],
  included: [{
    type: String,
    trim: true,
    minlength: [1, 'Included item must be at least 2 characters'],
    maxlength: [120, 'Included item cannot exceed 120 characters']
  }],
  // Spanish localized included items (optional)
  included_es: [{
    type: String,
    trim: true,
    maxlength: [120, 'Included item (es) cannot exceed 120 characters']
  }],
  notIncluded: [{
    type: String,
    trim: true,
    minlength: [1, 'Not included item must be at least 2 characters'],
    maxlength: [120, 'Not included item cannot exceed 120 characters']
  }],
  // Spanish localized not included items (optional)
  notIncluded_es: [{
    type: String,
    trim: true,
    maxlength: [120, 'Not included item (es) cannot exceed 120 characters']
  }],
  itinerary: [itineraryDaySchema],
  // Spanish localized itinerary (optional)
  itinerary_es: [itineraryDaySchemaEs],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

tourSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

tourSchema.index({ title: 'text', description: 'text', location: 'text', title_es: 'text', description_es: 'text', location_es: 'text', category: 1, status: 1 });
tourSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Tour', tourSchema);


