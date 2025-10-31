require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express();
const router = require('../routes/router')
const cookieParser = require('cookie-parser');
const db = require('../config/db')

const corsOptions = {
  origin: ['https://travel-frontend-sooty-two.vercel.app', 'http://localhost:5173', 'http://localhost:5176'], // Frontend deployed URL + localhost (5173/5174) for testing
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json())

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

app.use('/', router)

// For Vercel serverless functions

  // Initialize database connection for serverless


  // For local development
  db().then(() => {
    app.listen(3001, () => {
      console.log('Server Connected on port 3001');
    });
  }).catch(err => {
    console.error('Failed to start server:', err);
  });


module.exports = app