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
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
    console.log(`MongoDB Connected`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
  }
};

// Ensure DB is connected before handling any requests
app.use(async (req, res, next) => {
  await connectDB();
  next();
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
