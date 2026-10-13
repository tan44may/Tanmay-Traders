const Patti = require('../models/Patti');
const Bill = require('../models/Bill');
const CustomerTransaction = require('../models/CustomerTransaction');
const BankTransaction = require('../models/BankTransaction');
const CashbookEntry = require('../models/CashbookEntry');

// Get opening balance for a target date
const getOpeningBalance = async (targetDateStr) => {
  const ANCHOR_DATE = '2026-07-04';
  const ANCHOR_VALUE = 37590;

  if (targetDateStr === ANCHOR_DATE) {
    return ANCHOR_VALUE;
  }
  if (targetDateStr < ANCHOR_DATE) {
    return 0;
  }

  // targetDateStr > ANCHOR_DATE
  // Query all data between ANCHOR_DATE (inclusive) and targetDateStr (exclusive)
  const start = new Date(ANCHOR_DATE + 'T00:00:00.000Z');
  const dayBeforeTarget = new Date(targetDateStr + 'T00:00:00.000Z');

  const [bills, bankTxns, customerTxns, manualEntries] = await Promise.all([
    Bill.find({ date: { $gte: ANCHOR_DATE, $lt: targetDateStr } }),
    BankTransaction.find({ date: { $gte: start, $lt: dayBeforeTarget } }).populate('bankAccountId'),
    CustomerTransaction.find({ date: { $gte: start, $lt: dayBeforeTarget } }),
    CashbookEntry.find({ date: { $gte: ANCHOR_DATE, $lt: targetDateStr } })
  ]);

  // Group everything by date YYYY-MM-DD
  const dateMap = {};

  const addValue = (date, key, val) => {
    if (!date) return;
    const cleanDate = typeof date === 'string' ? date.split('T')[0] : date.toISOString().split('T')[0];
    if (!dateMap[cleanDate]) {
      dateMap[cleanDate] = {
        bankSelfDebits: 0,
        commission: 0,
        bankCredits: 0,
        customerGot: 0,
        manualDeposits: 0,
        rdWithdrawals: 0,
        bills: 0,
        customerGave: 0,
        manualWithdrawals: 0,
        rdDeposits: 0
      };
    }
    dateMap[cleanDate][key] += val;
  };

  bills.forEach(b => {
    addValue(b.date, 'bills', b.grandTotal || 0);
    addValue(b.date, 'commission', b.commissionAddition || 0);
  });

  bankTxns.forEach(t => {
    const dStr = t.date.toISOString().split('T')[0];
    const bankName = t.bankAccountId ? t.bankAccountId.bankName : '';
    const isRD = bankName && (
      bankName.includes('बुलढाणा') || 
      bankName.includes('आदित्य') || 
      bankName.toLowerCase().includes('buldhana') || 
      bankName.toLowerCase().includes('aditya')
    );

    if (isRD) {
      if (t.type === 'debit') {
        // Red entry (debit) of these RD banks -> Green section (RD Withdrawal)
        addValue(dStr, 'rdWithdrawals', t.amount || 0);
      } else if (t.type === 'credit') {
        // Green entry (credit) of these RD banks -> Red section (RD Deposit)
        addValue(dStr, 'rdDeposits', t.amount || 0);
      }
    } else {
      const isSelf = t.transactionType === 'self' || 
                     (t.description && (
                       t.description.toLowerCase().includes('self') || 
                       t.description.includes('सेल्फ')
                     ));
      if (t.type === 'debit' && isSelf) {
        addValue(dStr, 'bankSelfDebits', t.amount || 0);
      }
      if (t.type === 'credit') {
        addValue(dStr, 'bankCredits', t.amount || 0);
      }
    }
  });

  customerTxns.forEach(t => {
    const dStr = t.date.toISOString().split('T')[0];
    if (t.type === 'got') {
      addValue(dStr, 'customerGot', t.amount || 0);
    } else if (t.type === 'gave') {
      addValue(dStr, 'customerGave', t.amount || 0);
    }
  });

  manualEntries.forEach(e => {
    if (e.type === 'deposit') {
      addValue(e.date, 'manualDeposits', e.amount || 0);
    } else if (e.type === 'withdrawal') {
      addValue(e.date, 'manualWithdrawals', e.amount || 0);
    }
  });

  // Calculate chronological running balance starting from ANCHOR_VALUE
  const sortedDates = Object.keys(dateMap).sort();
  let runningBalance = ANCHOR_VALUE;

  for (const d of sortedDates) {
    const day = dateMap[d];
    const dayGreen = (day.bankSelfDebits || 0) + (day.commission || 0) + (day.bankCredits || 0) + (day.customerGot || 0) + (day.manualDeposits || 0) + (day.rdWithdrawals || 0);
    const dayRed = (day.bills || 0) + (day.bankCredits || 0) + (day.customerGave || 0) + (day.manualWithdrawals || 0) + (day.rdDeposits || 0);
    runningBalance += (dayGreen - dayRed);
  }

  return runningBalance;
};

// @desc    Get Cashbook Data for a selected date
// @route   GET /api/cashbook
// @access  Public
const getCashbookData = async (req, res) => {
  try {
    const { date } = req.query; // YYYY-MM-DD
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date parameter is required (YYYY-MM-DD)' });
    }

    const start = new Date(date + 'T00:00:00.000Z');
    const end = new Date(date + 'T23:59:59.999Z');

    // Fetch dynamic entries for this date
    const [bills, bankTxns, customerTxns, manualEntries, openingBalance] = await Promise.all([
      Bill.find({ date }),
      BankTransaction.find({ date: { $gte: start, $lte: end } }).populate('bankAccountId'),
      CustomerTransaction.find({ date: { $gte: start, $lte: end } }).populate('customerId', 'customerName'),
      CashbookEntry.find({ date }),
      getOpeningBalance(date)
    ]);

    // Calculate Today's figures
    let bankSelfDebits = 0;
    const bankSelfDebitsList = [];
    
    let bankCredits = 0;
    const bankCreditsList = [];

    let rdWithdrawals = 0;
    const rdWithdrawalsList = [];

    let rdDeposits = 0;
    const rdDepositsList = [];

    bankTxns.forEach(t => {
      const bankName = t.bankAccountId ? t.bankAccountId.bankName : '';
      const isRD = bankName && (
        bankName.includes('बुलढाणा') || 
        bankName.includes('आदित्य') || 
        bankName.toLowerCase().includes('buldhana') || 
        bankName.toLowerCase().includes('aditya')
      );

      if (isRD) {
        if (t.type === 'debit') {
          // Red entry (debit) of these RD banks -> Green section (RD Withdrawal)
          rdWithdrawals += t.amount || 0;
          rdWithdrawalsList.push(t);
        } else if (t.type === 'credit') {
          // Green entry (credit) of these RD banks -> Red section (RD Deposit)
          rdDeposits += t.amount || 0;
          rdDepositsList.push(t);
        }
      } else {
        const isSelf = t.transactionType === 'self' || 
                       (t.description && (
                         t.description.toLowerCase().includes('self') || 
                         t.description.includes('सेल्फ')
                       ));
        if (t.type === 'debit' && isSelf) {
          bankSelfDebits += t.amount || 0;
          bankSelfDebitsList.push(t);
        } else if (t.type === 'credit') {
          bankCredits += t.amount || 0;
          bankCreditsList.push(t);
        }
      }
    });

    let commission = 0;
    bills.forEach(b => {
      commission += b.commissionAddition || 0;
    });

    let customerGot = 0;
    const customerGotList = [];
    
    let customerGave = 0;
    const customerGaveList = [];

    customerTxns.forEach(t => {
      if (t.type === 'got') {
        customerGot += t.amount || 0;
        customerGotList.push(t);
      } else if (t.type === 'gave') {
        customerGave += t.amount || 0;
        customerGaveList.push(t);
      }
    });

    // Bills list & sum
    const totalBillsAmount = bills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);

    // Manual entries list & sums
    let manualDeposits = 0;
    let manualWithdrawals = 0;
    const manualDepositsList = [];
    const manualWithdrawalsList = [];

    manualEntries.forEach(e => {
      if (e.type === 'deposit') {
        manualDeposits += e.amount || 0;
        manualDepositsList.push(e);
      } else if (e.type === 'withdrawal') {
        manualWithdrawals += e.amount || 0;
        manualWithdrawalsList.push(e);
      }
    });

    res.status(200).json({
      success: true,
      data: {
        date,
        openingBalance,
        green: {
          bankSelfDebits: { amount: bankSelfDebits, list: bankSelfDebitsList },
          commission: { amount: commission, list: bills },
          bankCredits: { amount: bankCredits, list: bankCreditsList },
          customerGot: { amount: customerGot, list: customerGotList },
          manualDeposits: { amount: manualDeposits, list: manualDepositsList },
          rdWithdrawals: { amount: rdWithdrawals, list: rdWithdrawalsList }
        },
        red: {
          bills: { amount: totalBillsAmount, list: bills },
          bankCreditsOffset: { amount: bankCredits, list: bankCreditsList },
          customerGave: { amount: customerGave, list: customerGaveList },
          manualWithdrawals: { amount: manualWithdrawals, list: manualWithdrawalsList },
          rdDeposits: { amount: rdDeposits, list: rdDepositsList }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching cashbook data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cashbook data', error: error.message });
  }
};

// @desc    Add a manual cashbook entry
// @route   POST /api/cashbook/entry
// @access  Public
const addCashbookEntry = async (req, res) => {
  try {
    const { date, type, description, amount } = req.body;
    if (!date || !type || !description || !amount) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields (date, type, description, amount)' });
    }

    const entry = new CashbookEntry({
      date,
      type,
      description,
      amount: Number(amount)
    });

    const savedEntry = await entry.save();
    res.status(201).json({ success: true, data: savedEntry, message: 'Manual entry added successfully' });
  } catch (error) {
    console.error('Error adding cashbook entry:', error);
    res.status(500).json({ success: false, message: 'Failed to add cashbook entry', error: error.message });
  }
};

// @desc    Delete a manual cashbook entry
// @route   DELETE /api/cashbook/entry/:id
// @access  Public
const deleteCashbookEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEntry = await CashbookEntry.findByIdAndDelete(id);
    if (!deletedEntry) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }
    res.status(200).json({ success: true, message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting cashbook entry:', error);
    res.status(500).json({ success: false, message: 'Failed to delete cashbook entry', error: error.message });
  }
};

module.exports = {
  getCashbookData,
  addCashbookEntry,
  deleteCashbookEntry
};
