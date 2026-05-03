const MerchantTransaction = require('../models/MerchantTransaction');
const Merchant = require('../models/Merchant');

// @desc    Add a new transaction for a merchant
// @route   POST /api/merchant-transactions
// @access  Public
const addTransaction = async (req, res) => {
  try {
    const { merchantId, type, amount, date, cropName, description, billNo } = req.body;

    if (!merchantId || !type || !amount || !cropName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (merchantId, type, amount, cropName)'
      });
    }

    // Create the transaction
    const transaction = new MerchantTransaction({
      merchantId,
      type,
      amount,
      date: date || Date.now(),
      cropName,
      description,
      billNo
    });

    const savedTransaction = await transaction.save();

    // Update merchant balance
    // "gave" increases balance (they owe us), "got" decreases balance (they paid us)
    const balanceChange = type === 'gave' ? amount : -amount;
    
    await Merchant.findByIdAndUpdate(
      merchantId,
      { $inc: { balance: balanceChange } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      data: savedTransaction,
      message: 'Transaction saved and merchant balance updated'
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

// @desc    Get all transactions for a specific merchant
// @route   GET /api/merchant-transactions/:merchantId
// @access  Public
const getMerchantTransactions = async (req, res) => {
  try {
    const { merchantId } = req.params;

    const transactions = await MerchantTransaction.find({ merchantId })
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
      message: 'Transactions fetched successfully'
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
// @route   DELETE /api/merchant-transactions/:id
// @access  Public
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await MerchantTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Revert merchant balance
    // If it was "gave", we added to balance, so now we subtract.
    // If it was "got", we subtracted from balance, so now we add.
    const revertAmount = transaction.type === 'gave' ? -transaction.amount : transaction.amount;

    await Merchant.findByIdAndUpdate(
      transaction.merchantId,
      { $inc: { balance: revertAmount } }
    );

    await MerchantTransaction.findByIdAndDelete(id);

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
  getMerchantTransactions,
  deleteTransaction
};
