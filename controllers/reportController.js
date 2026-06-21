const Patti = require('../models/Patti');
const Bill = require('../models/Bill');
const CustomerTransaction = require('../models/CustomerTransaction');
const MerchantTransaction = require('../models/MerchantTransaction');
const BankTransaction = require('../models/BankTransaction');

const getDailyBalance = async (req, res) => {
  try {
    const { date } = req.query; // Format: 'YYYY-MM-DD'
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date parameter is required (YYYY-MM-DD)' });
    }

    // Date range for BSON Date fields
    const start = new Date(date + 'T00:00:00.000Z');
    const end = new Date(date + 'T23:59:59.999Z');

    // 1. Fetch Patti records (date is String)
    const pattis = await Patti.find({ date });

    // 2. Fetch Bill records (date is String)
    const bills = await Bill.find({ date });

    // 3. Fetch Customer transactions (date is Date)
    const customerTransactions = await CustomerTransaction.find({
      date: { $gte: start, $lte: end }
    }).populate('customerId', 'customerName');

    // 4. Fetch Merchant transactions (date is Date)
    const merchantTransactions = await MerchantTransaction.find({
      date: { $gte: start, $lte: end }
    }).populate('merchantId', 'merchantName');

    // 5. Fetch Bank transactions (date is Date)
    const bankTransactions = await BankTransaction.find({
      date: { $gte: start, $lte: end }
    }).populate('bankAccountId', 'bankName accountNumber');

    res.status(200).json({
      success: true,
      data: {
        pattis,
        bills,
        customerTransactions,
        merchantTransactions,
        bankTransactions
      }
    });
  } catch (error) {
    console.error('Error fetching daily balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily balance report',
      error: error.message
    });
  }
};

const getCommissionsReport = async (req, res) => {
  try {
    // 1. Fetch all bills
    const bills = await Bill.find({}).sort({ date: -1 });

    // 2. Calculate overall commission
    const overallCommission = bills.reduce((acc, bill) => acc + (bill.commissionAddition || 0), 0);

    // 3. Calculate current month's commission
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthNum = String(today.getMonth() + 1).padStart(2, '0');
    const currentMonthPrefix = `${currentYear}-${currentMonthNum}`;

    const currentMonthCommission = bills
      .filter(bill => bill.date && bill.date.startsWith(currentMonthPrefix))
      .reduce((acc, bill) => acc + (bill.commissionAddition || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        overallCommission,
        currentMonthCommission,
        bills
      }
    });
  } catch (error) {
    console.error('Error fetching commissions report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch commissions report',
      error: error.message
    });
  }
};

module.exports = {
  getDailyBalance,
  getCommissionsReport
};
