const mongoose = require('mongoose');
const { env } = require('./env');
const log = require('../utils/logger');

async function connectDB() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
    });
    log.info(`MongoDB connected → ${maskUri(env.MONGODB_URI)}`);
  } catch (err) {
    log.error('MongoDB connection failed', err.message);
    throw err;
  }

  mongoose.connection.on('disconnected', () => {
    log.warn('MongoDB disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    log.info('MongoDB reconnected');
  });
}

function maskUri(uri) {
  return uri.replace(/\/\/([^:@]+):([^@]+)@/, '//$1:***@');
}

module.exports = { connectDB };
