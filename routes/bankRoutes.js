const express = require('express');
const router = express.Router();
const {
  createBankAccount,
  getAllBankAccounts,
  deleteBankAccount,
  addBankTransaction,
  getBankTransactions,
  deleteBankTransaction
} = require('../controllers/bankController');

// Bank Accounts Routes
router.post('/', createBankAccount);
router.get('/', getAllBankAccounts);
router.delete('/:id', deleteBankAccount);

// Bank Transactions Routes
router.post('/transactions', addBankTransaction);
router.get('/transactions/:bankAccountId', getBankTransactions);
router.delete('/transactions/:id', deleteBankTransaction);

module.exports = router;
