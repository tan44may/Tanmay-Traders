const mongoose = require('mongoose');

const merchantTransactionSchema = new mongoose.Schema({
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
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
  cropName: {
    type: String,
    required: true
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

module.exports = mongoose.model('MerchantTransaction', merchantTransactionSchema, 'MerchantTransactions');
