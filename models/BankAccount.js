const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
  bankName: {
    type: String,
    required: true
  },
  accountHolderName: {
    type: String,
    required: false
  },
  accountNumber: {
    type: String,
    required: false
  },
  ifscCode: {
    type: String,
    required: false
  },
  branchName: {
    type: String,
    required: false
  },
  balance: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('BankAccount', bankAccountSchema, 'BankAccounts');
