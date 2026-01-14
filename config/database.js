// database connection

const mongoose = require('mongoose');

const connectDB = async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswap';
    
    try {
        const conn = await mongoose.connect(uri);
        console.log(`mongodb connected: ${conn.connection.host}`);
        
        mongoose.connection.on('error', (err) => {
            console.error('mongodb error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('mongodb disconnected');
        });
        
    } catch (err) {
        console.error('mongodb connection failed:', err.message);
        // exit if we cant connect in production
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
        throw err;
    }
};

module.exports = connectDB;
