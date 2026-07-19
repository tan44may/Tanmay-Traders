const mongoose = require('mongoose');

const employeeAttendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  weekStartDate: {
    type: Date, // Sunday at 00:00:00 local/UTC
    required: true
  },
  attendance: [
    {
      day: {
        type: String,
        enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        required: true
      },
      present: {
        type: Boolean,
        default: true
      }
    }
  ],
  weeklySalary: {
    type: Number,
    required: true
  },
  calculatedSalary: {
    type: Number,
    required: true
  },
  bonus: {
    type: Number,
    default: 0
  },
  deduction: {
    type: Number,
    default: 0
  },
  netSalary: {
    type: Number,
    required: true
  },
  isFinalized: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    required: false
  }
}, { timestamps: true });

// Unique compound index so there's only one attendance record per employee per week
employeeAttendanceSchema.index({ employeeId: 1, weekStartDate: 1 }, { unique: true });

module.exports = mongoose.model('EmployeeAttendance', employeeAttendanceSchema, 'EmployeeAttendances');
