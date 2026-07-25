const Patti = require('../models/Patti');
const Bill = require('../models/Bill');
const CustomerTransaction = require('../models/CustomerTransaction');
const MerchantTransaction = require('../models/MerchantTransaction');
const BankTransaction = require('../models/BankTransaction');
const OtherAccountTransaction = require('../models/OtherAccountTransaction');

const getDailyBalance = async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    
    let start, end;
    let pattiQuery = {};
    let billQuery = {};
    let rangeQuery = {};
    
    if (startDate && endDate) {
      start = new Date(startDate + 'T00:00:00.000Z');
      end = new Date(endDate + 'T23:59:59.999Z');
      pattiQuery = { date: { $gte: startDate, $lte: endDate } };
      billQuery = { date: { $gte: startDate, $lte: endDate } };
      rangeQuery = { date: { $gte: start, $lte: end } };
    } else if (date) {
      start = new Date(date + 'T00:00:00.000Z');
      end = new Date(date + 'T23:59:59.999Z');
      pattiQuery = { date };
      billQuery = { date };
      rangeQuery = { date: { $gte: start, $lte: end } };
    } else {
      return res.status(400).json({ success: false, message: 'Date or date range (startDate & endDate) is required' });
    }

    // 1. Fetch Patti records
    const pattis = await Patti.find(pattiQuery);

    // 2. Fetch Bill records
    const bills = await Bill.find(billQuery);

    // 3. Fetch Customer transactions
    const customerTransactions = await CustomerTransaction.find(rangeQuery)
      .populate('customerId', 'customerName');

    // 4. Fetch Merchant transactions
    const merchantTransactions = await MerchantTransaction.find(rangeQuery)
      .populate('merchantId', 'merchantName');

    // 5. Fetch Bank transactions
    const bankTransactions = await BankTransaction.find(rangeQuery)
      .populate('bankAccountId', 'bankName accountNumber');

    // 6. Fetch Other Account transactions
    const otherAccountTransactions = await OtherAccountTransaction.find(rangeQuery)
      .populate('otherAccountId', 'otherAccountName');

    res.status(200).json({
      success: true,
      data: {
        pattis,
        bills,
        customerTransactions,
        merchantTransactions,
        bankTransactions,
        otherAccountTransactions
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
