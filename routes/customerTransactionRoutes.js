const express = require('express');
const router = express.Router();
const {
  addTransaction,
  getCustomerTransactions,
  deleteTransaction
} = require('../controllers/customerTransactionController');

// Route to add a new transaction
router.post('/', addTransaction);

// Route to get transactions for a specific customer
router.get('/:customerId', getCustomerTransactions);

// Route to delete a transaction
router.delete('/:id', deleteTransaction);

module.exports = router;
