const mongoose = require('mongoose');

const otherAccountSchema = new mongoose.Schema({
  otherAccountName: {
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

module.exports = mongoose.model('OtherAccount', otherAccountSchema, 'OtherAccounts');
