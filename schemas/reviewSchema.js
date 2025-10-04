const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: [true, 'Tour is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  title: {
    type: String,
    required: [true, 'Review title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    minlength: [10, 'Comment must be at least 10 characters'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
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

// Prevent duplicate reviews - one review per user per tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Update tour's average rating when a review is saved
reviewSchema.post('save', async function() {
  const Review = this.constructor;
  const Tour = require('./tourSchema');
  
  const stats = await Review.aggregate([
    { $match: { tour: this.tour } },
    {
      $group: {
        _id: '$tour',
        avgRating: { $avg: '$rating' },
        numReviews: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(this.tour, {
      rating: Math.round(stats[0].avgRating * 10) / 10, // Round to 1 decimal
      numReviews: stats[0].numReviews
    });
  }
});

// Update tour's average rating when a review is deleted
reviewSchema.post('remove', async function() {
  const Review = this.constructor;
  const Tour = require('./tourSchema');
  
  const stats = await Review.aggregate([
    { $match: { tour: this.tour } },
    {
      $group: {
        _id: '$tour',
        avgRating: { $avg: '$rating' },
        numReviews: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(this.tour, {
      rating: Math.round(stats[0].avgRating * 10) / 10,
      numReviews: stats[0].numReviews
    });
  } else {
    // No reviews left
    await Tour.findByIdAndUpdate(this.tour, {
      rating: 0,
      numReviews: 0
    });
  }
});

reviewSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Review', reviewSchema); 