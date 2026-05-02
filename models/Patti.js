const mongoose = require('mongoose');

const pattiSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
  },
  cropName: {
    type: String,
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  merchantName: {
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
  hamaliRate: {
    type: Number,
    required: true,
    default: 0,
  },
  tolaiRate: {
    type: Number,
    required: true,
    default: 0,
  },
  otherCharges: {
    type: Number,
    required: true,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  hamaliDeduction: {
    type: Number,
    required: true,
    default: 0,
  },
  tolaiDeduction: {
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

module.exports = mongoose.model('Patti', pattiSchema, 'Patti');
