require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const pattiRoutes = require('./routes/pattiRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// ✅ DB connection logic
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const db = await mongoose.connect(process.env.MONGODB_URI);
  isConnected = db.connections[0].readyState === 1;

  console.log("MongoDB Connected");
};

// ✅ IMPORTANT: connect BEFORE routes
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// ✅ Routes AFTER DB
app.use('/api/patti', pattiRoutes);

app.get('/', (req, res) => {
  res.send('API running...');
});

module.exports = app;