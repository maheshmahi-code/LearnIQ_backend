/**
 * Environment Configuration
 * Centralizes all environment variables with validation and defaults.
 */

require('dotenv').config();

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

module.exports = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/learniq',

  // Auth
  JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_COOKIE_EXPIRES_IN: process.env.JWT_COOKIE_EXPIRES_IN || 7,

  // CORS
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',

  // AI - Google API
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
  GOOGLE_MODEL: process.env.GOOGLE_MODEL || 'gemini-2.5-flash',

  // Cloudinary (file uploads)
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  CLOUDINARY_URL: process.env.CLOUDINARY_URL || '',

  // Redis (caching)
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // ML Service
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:8000',

  // Firebase (Google OAuth)
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '',
};
