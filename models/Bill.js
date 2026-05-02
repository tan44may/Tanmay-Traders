const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
  },
  merchantName: {
    type: String,
    required: true,
  },
  cropName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
  },
  rate: {
    type: Number,
    required: true,
    default: 0,
  },
  tolaiRate: {
    type: Number,
    required: true,
    default: 0,
  },
  commissionRate: {
    type: Number,
    required: true,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  tolaiDeduction: {
    type: Number,
    required: true,
    default: 0,
  },
  commissionAddition: {
    type: Number,
    required: true,
    default: 0,
  },
  grandTotal: {
    type: Number,
    required: true,
    default: 0,
  }
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema, 'Bill');
