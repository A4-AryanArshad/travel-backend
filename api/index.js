require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express();
const router = require('../routes/router')
const cookieParser = require('cookie-parser');
const db = require('../config/db')

const corsOptions = {
  origin: ['https://travel-five-alpha-80.vercel.app'], // Frontend deployed URL
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

db().then(() => {

  app.listen(3001, () => {
    console.log('Server Connected');
  })
})

module.exports = app