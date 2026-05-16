const CustomerTransaction = require('../models/CustomerTransaction');
const Customer = require('../models/Customer');

// @desc    Add a new transaction for a customer
// @route   POST /api/customer-transactions
// @access  Public
const addTransaction = async (req, res) => {
  try {
    const { customerId, type, amount, date, cropName, description, billNo, interestRate } = req.body;

    if (!customerId || !type || !amount || !cropName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (customerId, type, amount, cropName)'
      });
    }

    // Create the transaction
    const transaction = new CustomerTransaction({
      customerId,
      type,
      amount,
      date: date || Date.now(),
      cropName,
      description,
      billNo,
      interestRate: type === 'gave' ? (interestRate || 0) : 0
    });

    const savedTransaction = await transaction.save();

    // Update customer balance
    // "gave" increases balance (they owe us), "got" decreases balance (they paid us)
    const balanceChange = type === 'gave' ? amount : -amount;
    
    await Customer.findByIdAndUpdate(
      customerId,
      { $inc: { balance: balanceChange } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      data: savedTransaction,
      message: 'Transaction saved and customer balance updated'
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

// @desc    Get all transactions for a specific customer
// @route   GET /api/customer-transactions/:customerId
// @access  Public
const getCustomerTransactions = async (req, res) => {
  try {
    const { customerId } = req.params;

    const transactions = await CustomerTransaction.find({ customerId })
      .sort({ date: -1, createdAt: -1 });

    // Calculate interest for 'gave' transactions
    const transactionsWithInterest = transactions.map(tx => {
      const transaction = tx.toObject();
      if (transaction.type === 'gave' && transaction.interestRate > 0) {
        const startDate = new Date(transaction.date);
        const currentDate = new Date();
        
        // Calculate duration in days
        const diffTime = Math.abs(currentDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Duration in months (assuming 30 days per month)
        const months = Math.floor(diffDays / 30);
        const remainingDays = diffDays % 30;
        
        const durationMonths = diffDays / 30;
        const interestAmount = (transaction.amount * transaction.interestRate * durationMonths) / 100;
        
        transaction.interestDetails = {
          duration: `${months} months ${remainingDays} days`,
          interestAmount: Math.round(interestAmount),
          totalAmount: Math.round(transaction.amount + interestAmount),
          durationInMonths: parseFloat(durationMonths.toFixed(2))
        };
      }
      return transaction;
    });

    res.status(200).json({
      success: true,
      count: transactionsWithInterest.length,
      data: transactionsWithInterest,
      message: 'Transactions fetched successfully with interest calculations'
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
// @route   DELETE /api/customer-transactions/:id
// @access  Public
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await CustomerTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Revert customer balance
    const revertAmount = transaction.type === 'gave' ? -transaction.amount : transaction.amount;

    await Customer.findByIdAndUpdate(
      transaction.customerId,
      { $inc: { balance: revertAmount } }
    );

    await CustomerTransaction.findByIdAndDelete(id);

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
  getCustomerTransactions,
  deleteTransaction
};
