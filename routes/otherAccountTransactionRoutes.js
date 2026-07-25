const express = require('express');
const router = express.Router();
const {
  addTransaction,
  getOtherAccountTransactions,
  deleteTransaction
} = require('../controllers/otherAccountTransactionController');

// Route to add a new transaction
router.post('/', addTransaction);

// Route to get transactions for a specific other account
router.get('/:otherAccountId', getOtherAccountTransactions);

// Route to delete a transaction
router.delete('/:id', deleteTransaction);

module.exports = router;
