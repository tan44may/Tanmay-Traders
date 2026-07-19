const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeName: {
    type: String,
    required: true,
    unique: true
  },
  contactNumber: {
    type: String,
    required: false
  },
  weeklySalary: {
    type: Number,
    required: true,
    default: 0
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  role: {
    type: String,
    required: false,
    default: 'Worker'
  }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema, 'Employees');
