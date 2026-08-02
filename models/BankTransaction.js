const mongoose = require('mongoose');

const bankTransactionSchema = new mongoose.Schema({
  bankAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    required: true
  },
  type: {
    type: String,
    enum: ['debit', 'credit'],
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
  description: {
    type: String,
    required: false
  },
  transactionType: {
    type: String,
    enum: ['merchant payment', 'cash', 'imps', 'self', 'cheque', 'rtgs', 'interest', 'intrest', 'charges'],
    required: false
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: false
  },
  selectedBank: {
    type: String,
    required: false
  },
  merchantTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MerchantTransaction',
    required: false
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: false
  },
  customerTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerTransaction',
    required: false
  }
}, { timestamps: true });

module.exports = mongoose.model('BankTransaction', bankTransactionSchema, 'BankTransactions');
