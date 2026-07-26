const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  investmentType: {
    type: String,
    required: true,
    enum: ['RD', 'FD']
  },
  accountNumber: {
    type: String,
    required: true
  },
  investAmount: {
    type: Number,
    required: true
  },
  maturityAmount: {
    type: Number,
    required: true
  },
  maturityDate: {
    type: Date,
    required: true
  },
  alertSent: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Investment', investmentSchema, 'Investments');
