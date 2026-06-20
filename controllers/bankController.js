const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');

// @desc    Create a new Bank Account
// @route   POST /api/bank
// @access  Public
const createBankAccount = async (req, res) => {
  try {
    const { bankName, accountHolderName, accountNumber, ifscCode, branchName, initialBalance } = req.body;

    if (!bankName) {
      return res.status(400).json({
        success: false,
        message: 'Bank name is required'
      });
    }

    const initBal = Number(initialBalance) || 0;

    const newAccount = new BankAccount({
      bankName,
      accountHolderName,
      accountNumber,
      ifscCode,
      branchName,
      balance: initBal
    });

    const savedAccount = await newAccount.save();

    // If initialBalance > 0, create an initial credit transaction
    if (initBal > 0) {
      const initialTx = new BankTransaction({
        bankAccountId: savedAccount._id,
        type: 'credit',
        amount: initBal,
        description: 'Initial Balance'
      });
      await initialTx.save();
    }

    res.status(201).json({
      success: true,
      data: savedAccount,
      message: 'Bank account created successfully'
    });
  } catch (error) {
    console.error('Error creating bank account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bank account',
      error: error.message
    });
  }
};

// @desc    Get all Bank Accounts
// @route   GET /api/bank
// @access  Public
const getAllBankAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts,
      message: 'Bank accounts fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank accounts',
      error: error.message
    });
  }
};

// @desc    Delete a Bank Account
// @route   DELETE /api/bank/:id
// @access  Public
const deleteBankAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await BankAccount.findByIdAndDelete(id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }

    // Delete all transactions associated with this account
    await BankTransaction.deleteMany({ bankAccountId: id });

    res.status(200).json({
      success: true,
      message: 'Bank account and all associated transactions deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bank account',
      error: error.message
    });
  }
};

// @desc    Add a new transaction for a bank account
// @route   POST /api/bank/transactions
// @access  Public
const addBankTransaction = async (req, res) => {
  try {
    const { bankAccountId, type, amount, date, description } = req.body;

    if (!bankAccountId || !type || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (bankAccountId, type, amount)'
      });
    }

    const txAmount = Number(amount);

    // Create transaction
    const transaction = new BankTransaction({
      bankAccountId,
      type,
      amount: txAmount,
      date: date || Date.now(),
      description
    });

    const savedTransaction = await transaction.save();

    // Update bank balance: 'credit' increases balance, 'debit' decreases balance
    const balanceChange = type === 'credit' ? txAmount : -txAmount;

    await BankAccount.findByIdAndUpdate(
      bankAccountId,
      { $inc: { balance: balanceChange } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      data: savedTransaction,
      message: 'Transaction saved and bank account balance updated'
    });
  } catch (error) {
    console.error('Error adding bank transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add bank transaction',
      error: error.message
    });
  }
};

// @desc    Get all transactions for a specific bank account
// @route   GET /api/bank/transactions/:bankAccountId
// @access  Public
const getBankTransactions = async (req, res) => {
  try {
    const { bankAccountId } = req.params;

    const transactions = await BankTransaction.find({ bankAccountId })
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
      message: 'Bank transactions fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching bank transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank transactions',
      error: error.message
    });
  }
};

// @desc    Delete a bank transaction and revert balance change
// @route   DELETE /api/bank/transactions/:id
// @access  Public
const deleteBankTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await BankTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Revert bank balance
    // If it was 'credit', we added to balance, so now we subtract.
    // If it was 'debit', we subtracted from balance, so now we add.
    const revertAmount = transaction.type === 'credit' ? -transaction.amount : transaction.amount;

    await BankAccount.findByIdAndUpdate(
      transaction.bankAccountId,
      { $inc: { balance: revertAmount } }
    );

    await BankTransaction.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Transaction deleted and bank balance reverted'
    });
  } catch (error) {
    console.error('Error deleting bank transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bank transaction',
      error: error.message
    });
  }
};

module.exports = {
  createBankAccount,
  getAllBankAccounts,
  deleteBankAccount,
  addBankTransaction,
  getBankTransactions,
  deleteBankTransaction
};
