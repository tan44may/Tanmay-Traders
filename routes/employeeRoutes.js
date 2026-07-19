const express = require('express');
const router = express.Router();
const {
  createEmployee,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
  getEmployeeAttendance,
  saveEmployeeAttendance,
  finalizeEmployeeAttendance,
  getEmployeeTransactions,
  addEmployeePayment,
  deleteEmployeeTransaction
} = require('../controllers/employeeController');

// Basic employee CRUD
router.route('/')
  .post(createEmployee)
  .get(getAllEmployees);

router.route('/:id')
  .put(updateEmployee)
  .delete(deleteEmployee);

// Attendance routes
router.route('/:id/attendance')
  .get(getEmployeeAttendance)
  .post(saveEmployeeAttendance);

router.route('/:id/attendance/finalize')
  .post(finalizeEmployeeAttendance);

// Transaction and payment routes
router.route('/:id/transactions')
  .get(getEmployeeTransactions)
  .post(addEmployeePayment);

router.route('/transactions/:txnId')
  .delete(deleteEmployeeTransaction);

module.exports = router;
