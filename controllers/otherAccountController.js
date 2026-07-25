const OtherAccount = require('../models/OtherAccount');
const OtherAccountTransaction = require('../models/OtherAccountTransaction');
const { calculateRunningLedger } = require('../utils/interestCalculator');

// @desc    Create a new Other Account
// @route   POST /api/other-account
// @access  Public
const createOtherAccount = async (req, res) => {
  try {
    const { otherAccountName, contactNumber } = req.body;

    if (!otherAccountName) {
      return res.status(400).json({
        success: false,
        message: 'Account name is required'
      });
    }

    // Check for duplicate name
    const existingAccount = await OtherAccount.findOne({ otherAccountName });
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'An account with this name already exists'
      });
    }

    const newAccount = new OtherAccount({
      otherAccountName,
      contactNumber
    });

    const savedAccount = await newAccount.save();

    res.status(201).json({
      success: true,
      data: savedAccount,
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error('Error creating other account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create account',
      error: error.message
    });
  }
};

// @desc    Get all Other Accounts
// @route   GET /api/other-account
// @access  Public
const getAllOtherAccounts = async (req, res) => {
  try {
    const otherAccounts = await OtherAccount.find().sort({ createdAt: -1 });

    // Calculate dynamic interest-inclusive balance for each account
    const otherAccountsWithInterest = await Promise.all(otherAccounts.map(async (a) => {
      const otherAccount = a.toObject();
      const transactions = await OtherAccountTransaction.find({ otherAccountId: otherAccount._id });

      // Re-use interest calculation logic
      const ledger = calculateRunningLedger(transactions, new Date());
      otherAccount.balance = ledger.netBalance;
      return otherAccount;
    }));

    res.status(200).json({
      success: true,
      count: otherAccountsWithInterest.length,
      data: otherAccountsWithInterest,
      message: 'Accounts fetched successfully with dynamic interest'
    });
  } catch (error) {
    console.error('Error fetching other accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accounts',
      error: error.message
    });
  }
};

// @desc    Delete an Other Account
// @route   DELETE /api/other-account/:id
// @access  Public
const deleteOtherAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const otherAccount = await OtherAccount.findByIdAndDelete(id);

    if (!otherAccount) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Delete associated transactions as well
    await OtherAccountTransaction.deleteMany({ otherAccountId: id });

    res.status(200).json({
      success: true,
      message: 'Account and associated transactions deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting other account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message
    });
  }
};

module.exports = {
  createOtherAccount,
  getAllOtherAccounts,
  deleteOtherAccount
};
