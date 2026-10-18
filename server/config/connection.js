const mongoose = require('mongoose');
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env') });

async function connectDatabase(options = {}) {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required. See server/.env.example.');
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    ...options,
  });
  return mongoose.connection;
}

module.exports = connectDatabase;
