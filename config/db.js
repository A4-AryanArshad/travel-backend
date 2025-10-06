const mongoose = require('mongoose');

// Connection caching for Vercel serverless functions
const MONGODB_URI = 'mongodb+srv://aryan:2021cs613@cluster0.xkuanbt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

const db = async () => {
  try {
    if (global.mongoose.conn) {
      console.log('Using existing database connection');
      return global.mongoose.conn;
    }

    if (!global.mongoose.promise) {
      const opts = {
        bufferCommands: false,
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      };

      global.mongoose.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
        console.log('Database Connected Successfully');
        return mongoose;
      });
    }

    global.mongoose.conn = await global.mongoose.promise;
    return global.mongoose.conn;
  } catch (error) {
    console.log('Error while connecting to the database', error.message);
    throw error;
  }
};

module.exports = db;