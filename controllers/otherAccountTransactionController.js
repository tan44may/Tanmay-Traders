const OtherAccountTransaction = require('../models/OtherAccountTransaction');
const OtherAccount = require('../models/OtherAccount');
const { calculateRunningLedger } = require('../utils/interestCalculator');

// @desc    Add a new transaction for an other account
// @route   POST /api/other-account-transactions
// @access  Public
const addTransaction = async (req, res) => {
  try {
    const { otherAccountId, type, amount, date, description, billNo, interestRate } = req.body;

    if (!otherAccountId || !type || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (otherAccountId, type, amount)'
      });
    }

    // Create the transaction
    const transaction = new OtherAccountTransaction({
      otherAccountId,
      type,
      amount,
      date: date || Date.now(),
      description,
      billNo,
      interestRate: type === 'gave' ? (interestRate || 0) : 0
    });

    const savedTransaction = await transaction.save();

    // Update other account balance
    const balanceChange = type === 'gave' ? amount : -amount;
    
    await OtherAccount.findByIdAndUpdate(
      otherAccountId,
      { $inc: { balance: balanceChange } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      data: savedTransaction,
      message: 'Transaction saved and account balance updated'
    });
  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add transaction',
      error: error.message
    });
  }
};

// @desc    Get all transactions for a specific other account
// @route   GET /api/other-account-transactions/:otherAccountId
// @access  Public
const getOtherAccountTransactions = async (req, res) => {
  try {
    const { otherAccountId } = req.params;

    const transactions = await OtherAccountTransaction.find({ otherAccountId })
      .sort({ date: -1, createdAt: -1 });

    const currentDate = new Date();
    const ledger = calculateRunningLedger(transactions, currentDate);

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: {
        transactions: transactions.map(t => t.toObject()),
        ledger: ledger
      },
      message: 'Transactions and running interest ledger fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
};

// @desc    Delete a transaction and revert balance change
// @route   DELETE /api/other-account-transactions/:id
// @access  Public
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await OtherAccountTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Revert account balance
    const revertAmount = transaction.type === 'gave' ? -transaction.amount : transaction.amount;

    await OtherAccount.findByIdAndUpdate(
      transaction.otherAccountId,
      { $inc: { balance: revertAmount } }
    );

    await OtherAccountTransaction.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Transaction deleted and balance reverted'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction',
      error: error.message
    });
  }
};

module.exports = {
  addTransaction,
  getOtherAccountTransactions,
  deleteTransaction
};
