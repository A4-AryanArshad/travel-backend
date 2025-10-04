const mongoose = require('mongoose');

const db = async () => {
    try {
        await mongoose.connect('mongodb+srv://aryan:2021cs613@cluster0.xkuanbt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0').then(() => {
            console.log('Database Connected Successfully');
        })
    } catch (error) {
        console.log('Error while connecting to the database', error.message);
    }
}

module.exports = db;