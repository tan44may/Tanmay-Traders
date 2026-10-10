const mongoose = require('mongoose');

const cashDenominationSchema = new mongoose.Schema({
  date: {
    type: String, // Format: 'YYYY-MM-DD'
    required: true,
    unique: true,
    index: true
  },
  counts: {
    '500': { type: Number, default: 0 },
    '200': { type: Number, default: 0 },
    '100': { type: Number, default: 0 },
    '50': { type: Number, default: 0 },
    '20': { type: Number, default: 0 },
    '10': { type: Number, default: 0 },
    '5': { type: Number, default: 0 },
    '2': { type: Number, default: 0 },
    '1': { type: Number, default: 0 }
  },
  totalNotes: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  cashbookBalance: {
    type: Number,
    default: 0
  },
  isMatched: {
    type: Boolean,
    default: false
  },
  remarks: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('CashDenomination', cashDenominationSchema, 'CashDenominations');
