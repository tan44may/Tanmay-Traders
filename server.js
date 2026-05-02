require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const pattiRoutes = require('./routes/pattiRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/patti', pattiRoutes);

// Health check route
app.get('/', (req, res) => {
  res.send('Tanmay Traders API is running...');
});

// Database Connection for Serverless Environment
let isConnected = false;
let connectionError = null;

const connectDB = async () => {
  if (isConnected) {
    return;
  }
  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, { 
      serverSelectionTimeoutMS: 5000 
    });
    isConnected = db.connections[0].readyState === 1;
    connectionError = null;
    console.log(`MongoDB Connected`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    connectionError = error.message;
    throw error;
  }
};

// Ensure DB is connected before handling any requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Database connection failed', 
      error: connectionError || error.message,
      uri_exists: !!process.env.MONGODB_URI
    });
  }
});

// Start Server for local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the Express API for Vercel
module.exports = app;
