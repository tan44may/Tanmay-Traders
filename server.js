require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const pattiRoutes = require('./routes/pattiRoutes');
const billRoutes = require('./routes/billRoutes');
const merchantRoutes = require('./routes/merchantRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const customerRoutes = require('./routes/customerRoutes');
const customerTransactionRoutes = require('./routes/customerTransactionRoutes');
const cropRoutes = require('./routes/cropRoutes');
const bankRoutes = require('./routes/bankRoutes');

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
app.use('/api/bill', billRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/merchant-transactions', transactionRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/customer-transactions', customerTransactionRoutes);
app.use('/api/crop', cropRoutes);
app.use('/api/bank', bankRoutes);

app.get('/', (req, res) => {
  res.send('API running...');
});
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running locally on port ${PORT}`);
  });
}

module.exports = app;