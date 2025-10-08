const mongoose = require('mongoose');

// Connection caching for Vercel serverless functions
const MONGODB_URI = 'mongodb+srv://aryan:2021cs613@cluster0.xkuanbt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';



const db = async () => {
    try {


        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI is not set in environment variables');
        }
        await mongoose.connect(MONGODB_URI).then(() => {
            console.log('---Database Connected Successfully---');
        })
    } catch (error) {
        console.log('Error while connecting to the database', error.message);
    }
}

module.exports = db;