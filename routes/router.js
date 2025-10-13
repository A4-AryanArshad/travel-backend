const express = require('express');
const router = express.Router();
const { 
  signup, 
  login, 
  logout,
  getProfile,
  uploadImage,
  compressImageEndpoint,
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
  createTour,
  getTours,
  getTour,
  updateTour,
  deleteTour,
  getCounts,
  upload,
  createBooking,
  getUserBookings,
  getAllBookings,
  createPaymentIntent,
  updatePaymentStatus,
  cancelBooking,
  getTourBookings,
  createReview,
  getTourReviews,
  canUserReview,
  updateReview,
  deleteReview,
  getGalleryStats,
  sendContactEmail
} = require('../controllers/controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public routes
router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.post('/auth/logout', logout);

// Protected routes
router.get('/auth/profile', authenticateToken, getProfile);

// Blog routes (public read access)
router.get('/blogs', getBlogs);
router.get('/blogs/categories', getBlogCategories);
router.get('/blogs/:id', getBlog);

// Image upload route (admin only)
router.post('/upload/image', authenticateToken, requireAdmin, uploadImage);

// Image compression route (admin only) - compress and return to frontend
router.post('/upload/compress', authenticateToken, requireAdmin, upload.single('image'), compressImageEndpoint);

// Blog management routes (admin only)
router.post('/blogs', authenticateToken, requireAdmin, createBlog);
router.put('/blogs/:id', authenticateToken, requireAdmin, updateBlog);
router.delete('/blogs/:id', authenticateToken, requireAdmin, deleteBlog);

// User management routes (admin only)
router.get('/users', authenticateToken, requireAdmin, getUsers);
router.get('/users/:id', authenticateToken, requireAdmin, getUser);
router.put('/users/:id', authenticateToken, requireAdmin, updateUser);
router.delete('/users/:id', authenticateToken, requireAdmin, deleteUser);

// Gallery routes (public read access)
router.get('/gallery', getGallery);
router.get('/gallery/categories', getGalleryCategories);
router.get('/gallery/stats', getGalleryStats);
router.get('/gallery/:id', getGalleryItem);

// Gallery management routes (admin only)
router.post('/gallery', authenticateToken, requireAdmin, createGallery);
router.put('/gallery/:id', authenticateToken, requireAdmin, updateGallery);
router.delete('/gallery/:id', authenticateToken, requireAdmin, deleteGallery);

// Tours routes (public)
router.get('/tours', getTours);
router.get('/tours/:id', getTour);

// Tours management routes (admin only)
router.post('/tours', authenticateToken, requireAdmin, createTour);
router.put('/tours/:id', authenticateToken, requireAdmin, updateTour);
router.delete('/tours/:id', authenticateToken, requireAdmin, deleteTour);

// Health check
router.get('/', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Travel Beyond Tours API is running',
        timestamp: new Date().toISOString()
    });
});

// Dashboard counts (admin only)
router.get('/dashboard/counts', authenticateToken, requireAdmin, getCounts);

// Booking routes
router.post('/bookings', authenticateToken, createBooking);
router.get('/bookings/my-bookings', authenticateToken, getUserBookings);
router.get('/bookings', authenticateToken, requireAdmin, getAllBookings);
router.get('/bookings/tour-bookings', authenticateToken, requireAdmin, getTourBookings);
router.post('/bookings/create-payment-intent', authenticateToken, createPaymentIntent);
router.post('/bookings/update-payment-status', authenticateToken, updatePaymentStatus);
router.delete('/bookings/:id', authenticateToken, cancelBooking);

// Review routes
router.post('/reviews', authenticateToken, createReview);
router.get('/reviews/tour/:tourId', getTourReviews);
router.get('/reviews/can-review/:tourId', authenticateToken, canUserReview);
router.put('/reviews/:id', authenticateToken, updateReview);
router.delete('/reviews/:id', authenticateToken, deleteReview);

// Contact route (public)
router.post('/contact', sendContactEmail);

module.exports = router;