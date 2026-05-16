const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
    unique: true,
  },
  contactNumber: {
    type: String,
    required: false,
  },
  balance: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema, 'Customers');
