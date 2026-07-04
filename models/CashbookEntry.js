const mongoose = require('mongoose');

const cashbookEntrySchema = new mongoose.Schema({
  date: {
    type: String, // Format: 'YYYY-MM-DD'
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal'], // 'deposit' for Green (जमा), 'withdrawal' for Red (नावे)
    required: true
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  isManual: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('CashbookEntry', cashbookEntrySchema, 'CashbookEntries');
