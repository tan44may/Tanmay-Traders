const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');
const Merchant = require('../models/Merchant');
const MerchantTransaction = require('../models/MerchantTransaction');
const Customer = require('../models/Customer');
const CustomerTransaction = require('../models/CustomerTransaction');

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
    const { bankAccountId, type, amount, date, description, transactionType, merchantId, selectedBank, customerId } = req.body;

    if (!bankAccountId || !type || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (bankAccountId, type, amount)'
      });
    }

    const txAmount = Number(amount);
    let savedMerchantTx = null;
    let savedCustomerTx = null;
    let merchant = null;
    let customer = null;

    // Handle merchant payment automation for deposits (credit transactions)
    if (type === 'credit' && transactionType === 'merchant payment') {
      if (!merchantId) {
        return res.status(400).json({
          success: false,
          message: 'Merchant is required for merchant payment'
        });
      }

      // Check if merchant exists
      merchant = await Merchant.findById(merchantId);
      if (!merchant) {
        return res.status(404).json({
          success: false,
          message: 'Merchant not found'
        });
      }

      // Create merchant transaction in got (green) section
      const merchantTx = new MerchantTransaction({
        merchantId,
        type: 'got',
        amount: txAmount,
        date: date || Date.now(),
        cropName: 'Bank Transaction',
        description: `Bank Deposit: ${selectedBank || ''}${description ? ' - ' + description : ''}`
      });

      savedMerchantTx = await merchantTx.save();

      // Update merchant balance (got reduces what they owe us)
      await Merchant.findByIdAndUpdate(
        merchantId,
        { $inc: { balance: -txAmount } }
      );
    }

    // Load customer details for description helper if customerId is provided
    if (customerId) {
      customer = await Customer.findById(customerId);
    }

    // Set bank transaction description
    let txDescription = description;
    if (type === 'credit') {
      if (transactionType === 'merchant payment') {
        txDescription = `Merchant: ${merchant ? merchant.merchantName : ''}${selectedBank ? ' (' + selectedBank + ')' : ''}`;
      } else if (transactionType === 'cash') {
        txDescription = 'Cash';
      } else if (transactionType === 'imps') {
        txDescription = description || 'IMPS Transfer';
      } else if (transactionType === 'cheque') {
        txDescription = `Customer: ${customer ? customer.customerName : ''} (CHEQUE)`;
      }
    } else if (type === 'debit') {
      if (transactionType === 'self') {
        txDescription = 'Self';
      } else if (transactionType === 'cheque' || transactionType === 'RTGS' || transactionType === 'rtgs') {
        txDescription = `Customer: ${customer ? customer.customerName : ''} (${transactionType.toUpperCase()})`;
      }
    }

    // Create bank transaction
    const transaction = new BankTransaction({
      bankAccountId,
      type,
      amount: txAmount,
      date: date || Date.now(),
      description: txDescription,
      transactionType: transactionType,
      merchantId: (type === 'credit' && transactionType === 'merchant payment') ? merchantId : undefined,
      selectedBank: (type === 'credit' && transactionType === 'merchant payment') ? selectedBank : undefined,
      merchantTransactionId: savedMerchantTx ? savedMerchantTx._id : undefined,
      customerId: ((type === 'debit' || type === 'credit') && (transactionType === 'cheque' || transactionType === 'rtgs' || transactionType === 'RTGS')) ? customerId : undefined,
      customerTransactionId: savedCustomerTx ? savedCustomerTx._id : undefined
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

    // If there is a linked merchant transaction, delete it and revert merchant balance
    if (transaction.merchantTransactionId) {
      const merchantTx = await MerchantTransaction.findById(transaction.merchantTransactionId);
      if (merchantTx) {
        // Revert merchant balance
        // If it was 'gave', we added to balance, so now we subtract.
        // If it was 'got', we subtracted from balance, so now we add.
        const merchantRevertAmount = merchantTx.type === 'gave' ? -merchantTx.amount : merchantTx.amount;
        await Merchant.findByIdAndUpdate(
          merchantTx.merchantId,
          { $inc: { balance: merchantRevertAmount } }
        );
        await MerchantTransaction.findByIdAndDelete(transaction.merchantTransactionId);
      }
    }

    // If there is a linked customer transaction, delete it and revert customer balance
    if (transaction.customerTransactionId) {
      const customerTx = await CustomerTransaction.findById(transaction.customerTransactionId);
      if (customerTx) {
        // Revert customer balance
        // If it was 'gave', we added to balance, so now we subtract.
        // If it was 'got', we subtracted from balance, so now we add.
        const customerRevertAmount = customerTx.type === 'gave' ? -customerTx.amount : customerTx.amount;
        await Customer.findByIdAndUpdate(
          customerTx.customerId,
          { $inc: { balance: customerRevertAmount } }
        );
        await CustomerTransaction.findByIdAndDelete(transaction.customerTransactionId);
      }
    }

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
