require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
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
const reportRoutes = require('./routes/reportRoutes');
const cashbookRoutes = require('./routes/cashbookRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const otherAccountRoutes = require('./routes/otherAccountRoutes');
const otherAccountTransactionRoutes = require('./routes/otherAccountTransactionRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

const User = require('./models/User');

// ✅ DB connection logic
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const db = await mongoose.connect(process.env.MONGODB_URI);
  isConnected = db.connections[0].readyState === 1;

  console.log("MongoDB Connected");

  // Seed default users if they don't exist
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("Seeding default users...");
      const adminUser = new User({
        username: 'admin',
        password: 'Bright9%'
      });
      await adminUser.save();

      const tanmayUser = new User({
        username: 'tanmay',
        password: '9011874112'
      });
      await tanmayUser.save();
      console.log("Seeded admin and tanmay users successfully.");
    }
  } catch (err) {
    console.error("Error seeding users:", err);
  }
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
app.use('/api/reports', reportRoutes);
app.use('/api/cashbook', cashbookRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/other-account', otherAccountRoutes);
app.use('/api/other-account-transactions', otherAccountTransactionRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/auth', authRoutes);

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