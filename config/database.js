/**
 * MongoDB Database Configuration
 * Connects to MongoDB Atlas using Mongoose with connection pooling and error handling.
 */

const mongoose = require('mongoose');
const { MONGO_URI } = require('./environment');

/**
 * Connect to MongoDB database
 * Uses connection pooling for production performance
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      // Connection pool settings for production
      maxPoolSize: 10,
      minPoolSize: 2,
      // Timeout settings
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      // Remove deprecated options
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Reconnecting...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

/**
 * Graceful shutdown - close database connection
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error.message);
  }
};

module.exports = { connectDB, disconnectDB };
