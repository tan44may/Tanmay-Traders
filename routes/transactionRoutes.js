const express = require('express');
const router = express.Router();
const { 
  addTransaction, 
  getMerchantTransactions, 
  deleteTransaction 
} = require('../controllers/transactionController');

// Route to get transactions for a specific merchant
router.get('/:merchantId', getMerchantTransactions);

// Route to add a new transaction
router.post('/', addTransaction);

// Route to delete a transaction
router.delete('/:id', deleteTransaction);

module.exports = router;
