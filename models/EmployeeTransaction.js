const mongoose = require('mongoose');

const employeeTransactionSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['Salary', 'Payment'], // 'Salary' is credit (earned), 'Payment' is debit (received/paid to them)
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank', 'N/A'],
    default: 'N/A'
  },
  bankAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    required: false
  },
  description: {
    type: String,
    required: false
  },
  attendanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeAttendance',
    required: false // Link to the finalized week attendance if type = 'Salary'
  },
  cashbookEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashbookEntry',
    required: false // Link to CashbookEntry if paid by cash
  },
  bankTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankTransaction',
    required: false // Link to BankTransaction if paid by bank
  }
}, { timestamps: true });

module.exports = mongoose.model('EmployeeTransaction', employeeTransactionSchema, 'EmployeeTransactions');
