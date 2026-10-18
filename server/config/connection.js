const mongoose = require('mongoose');
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env') });

if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required. See server/.env.example.');
mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 }).catch(() => {
  console.error('Database connection failed. Check MONGO_URI and database availability.');
  process.exit(1);
});

module.exports = mongoose.connection;
