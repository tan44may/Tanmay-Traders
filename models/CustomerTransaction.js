const mongoose = require('mongoose');

const customerTransactionSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  type: {
    type: String,
    enum: ['gave', 'got'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  interestRate: {
    type: Number, // percentage per month
    required: false,
    default: 0
  },

  description: {
    type: String,
    required: false
  },
  billNo: {
    type: String,
    required: false
  }
}, { timestamps: true });

module.exports = mongoose.model('CustomerTransaction', customerTransactionSchema, 'CustomerTransactions');
