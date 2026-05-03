const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema({
  merchantName: {
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

module.exports = mongoose.model('Merchant', merchantSchema, 'Merchants');
