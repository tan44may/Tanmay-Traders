const Patti = require('../models/Patti');
const Bill = require('../models/Bill');
const CustomerTransaction = require('../models/CustomerTransaction');
const MerchantTransaction = require('../models/MerchantTransaction');
const BankTransaction = require('../models/BankTransaction');
const OtherAccountTransaction = require('../models/OtherAccountTransaction');
const Customer = require('../models/Customer');
const Merchant = require('../models/Merchant');
const Crop = require('../models/Crop');
const BankAccount = require('../models/BankAccount');

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

const getDashboardStats = async (req, res) => {
  try {
    // Get today's local date in IST YYYY-MM-DD
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // 1. Patti stats (arrivals and sales turnover)
    const pattisToday = await Patti.find({ date: todayIST });
    const todayArrivalsQty = pattisToday.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const todaySalesTurnover = pattisToday.reduce((sum, p) => sum + (p.grandTotal || 0), 0);

    // 2. Bill stats (purchases turnover)
    const billsToday = await Bill.find({ date: todayIST });
    const todayPurchasesTurnover = billsToday.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
    const todayCommissions = billsToday.reduce((sum, b) => sum + (b.commissionAddition || 0), 0);

    // 3. Counts
    const activeMerchantsCount = await Merchant.countDocuments();
    const activeCustomersCount = await Customer.countDocuments();
    const cropVarietiesCount = await Crop.countDocuments();

    // 4. Combined Recent Activity List (Pattis & Bills)
    const recentPattis = await Patti.find().sort({ createdAt: -1 }).limit(5);
    const recentBills = await Bill.find().sort({ createdAt: -1 }).limit(5);

    const activities = [];
    
    recentPattis.forEach(p => {
      activities.push({
        id: p._id,
        type: 'patti',
        title: `${p.cropName} sold by ${p.customerName}`,
        description: `Purchased by ${p.merchantName} (${p.quantity} Q @ ₹${p.rate}/Q)`,
        amount: p.grandTotal,
        time: p.createdAt || p.date,
        icon: 'sprout'
      });
    });

    recentBills.forEach(b => {
      activities.push({
        id: b._id,
        type: 'bill',
        title: `${b.cropName} bill registered for ${b.merchantName}`,
        description: `Total weight ${b.quantity} Q @ rate ₹${b.rate}`,
        amount: b.grandTotal,
        time: b.createdAt || b.date,
        icon: 'receipt'
      });
    });

    // Sort combined activities by time descending
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recentActivity = activities.slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        todayArrivalsQty,
        todaySalesTurnover,
        todayPurchasesTurnover,
        todayCommissions,
        activeMerchantsCount,
        activeCustomersCount,
        cropVarietiesCount,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
};

module.exports = {
  getDailyBalance,
  getCommissionsReport,
  getDashboardStats
};
