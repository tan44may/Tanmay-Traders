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
const CashbookEntry = require('../models/CashbookEntry');
const Employee = require('../models/Employee');
const EmployeeTransaction = require('../models/EmployeeTransaction');
const Investment = require('../models/Investment');
const OtherAccount = require('../models/OtherAccount');
const { calculateRunningLedger } = require('../utils/interestCalculator');

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

const calculateCashbookClosingBalanceInMemory = (targetDateStr, allBills, allBankTxns, allCustTransactions, allCashbook) => {
  const ANCHOR_DATE = '2026-07-04';
  const ANCHOR_VALUE = 37590;

  const targetDate = new Date(targetDateStr + 'T00:00:00.000Z');
  const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
  const nextDayStr = nextDay.toISOString().split('T')[0];

  if (nextDayStr === ANCHOR_DATE) return ANCHOR_VALUE;
  if (nextDayStr < ANCHOR_DATE) return 0;

  const start = new Date(ANCHOR_DATE + 'T00:00:00.000Z');
  const nextDayDate = new Date(nextDayStr + 'T00:00:00.000Z');

  let bankSelfDebits = 0;
  let bankCredits = 0;
  let rdWithdrawals = 0;
  let rdDeposits = 0;
  let commission = 0;
  let customerGot = 0;
  let customerGave = 0;
  let totalBillsAmount = 0;
  let manualDeposits = 0;
  let manualWithdrawals = 0;

  allBills.forEach(b => {
    if (b.date && b.date >= ANCHOR_DATE && b.date < nextDayStr) {
      totalBillsAmount += (b.grandTotal || 0);
      commission += (b.commissionAddition || 0);
    }
  });

  allBankTxns.forEach(t => {
    if (t.date && t.date >= start && t.date < nextDayDate) {
      const bankName = t.bankAccountId && typeof t.bankAccountId === 'object' ? t.bankAccountId.bankName : '';
      const isRD = bankName && (
        bankName.includes('बुलढाणा') || 
        bankName.includes('आदित्य') || 
        bankName.toLowerCase().includes('buldhana') || 
        bankName.toLowerCase().includes('aditya')
      );

      if (isRD) {
        if (t.type === 'debit') {
          rdWithdrawals += t.amount || 0;
        } else if (t.type === 'credit') {
          rdDeposits += t.amount || 0;
        }
      } else {
        const isSelf = t.transactionType === 'self' || 
                       (t.description && (
                         t.description.toLowerCase().includes('self') || 
                         t.description.includes('सेल्फ')
                       ));
        if (t.type === 'debit' && isSelf) {
          bankSelfDebits += t.amount || 0;
        } else if (t.type === 'credit') {
          bankCredits += t.amount || 0;
        }
      }
    }
  });

  allCustTransactions.forEach(t => {
    if (t.date && t.date >= start && t.date < nextDayDate) {
      if (t.type === 'got') {
        customerGot += t.amount || 0;
      } else if (t.type === 'gave') {
        customerGave += t.amount || 0;
      }
    }
  });

  allCashbook.forEach(e => {
    if (e.date && e.date >= ANCHOR_DATE && e.date < nextDayStr) {
      if (e.type === 'deposit') {
        manualDeposits += e.amount || 0;
      } else if (e.type === 'withdrawal') {
        manualWithdrawals += e.amount || 0;
      }
    }
  });

  const totalGreen = ANCHOR_VALUE + bankSelfDebits + commission + bankCredits + customerGot + manualDeposits + rdWithdrawals;
  const totalRed = totalBillsAmount + bankCredits + customerGave + manualWithdrawals + rdDeposits;

  return totalGreen - totalRed;
};

const getAnalyticsReport = async (req, res) => {
  try {
    // 1. Fetch ALL required data IN PARALLEL using Promise.all (Removes 20+ sequential database requests)
    const [
      allPattis,
      allBills,
      allCashbook,
      allBanks,
      allBankTxns,
      allCustomers,
      allCustTransactions,
      allMerchants,
      allMerchTransactions,
      allEmployees,
      allEmployeeTxns,
      allInvestments,
      allOtherAccs,
      allOtherAccTransactions
    ] = await Promise.all([
      Patti.find({}),
      Bill.find({}),
      CashbookEntry.find({}),
      BankAccount.find({}),
      BankTransaction.find({}).populate('bankAccountId'),
      Customer.find({}),
      CustomerTransaction.find({}),
      Merchant.find({}),
      MerchantTransaction.find({}),
      Employee.find({}),
      EmployeeTransaction.find({}).populate('employeeId', 'employeeName'),
      Investment.find({}),
      OtherAccount.find({}),
      OtherAccountTransaction.find({})
    ]);

    // 2. Patti Analytics (In-Memory)
    const totalPattisCount = allPattis.length;
    const totalPattiSales = allPattis.reduce((sum, p) => sum + (p.grandTotal || 0), 0);
    const highestPatti = allPattis.length > 0 ? [...allPattis].sort((a, b) => (b.grandTotal || 0) - (a.grandTotal || 0))[0] : null;
    const lowestPatti = allPattis.filter(p => (p.grandTotal || 0) > 0).sort((a, b) => (a.grandTotal || 0) - (b.grandTotal || 0))[0] || null;

    const pattiCropAggregation = {};
    allPattis.forEach(p => {
      if (p.cropName) {
        pattiCropAggregation[p.cropName] = (pattiCropAggregation[p.cropName] || 0) + (p.grandTotal || 0);
      }
    });
    const pattiCropData = Object.keys(pattiCropAggregation).map(crop => ({
      name: crop,
      value: pattiCropAggregation[crop]
    }));

    const monthlyPattiSalesMap = {};
    allPattis.forEach(p => {
      if (p.date && p.date.length >= 7) {
        const month = p.date.substring(0, 7);
        monthlyPattiSalesMap[month] = (monthlyPattiSalesMap[month] || 0) + (p.grandTotal || 0);
      }
    });
    const pattiMonthlyTrend = Object.keys(monthlyPattiSalesMap)
      .sort()
      .map(month => ({
        month,
        value: monthlyPattiSalesMap[month]
      }));

    // 3. Bill & Commission Analytics (In-Memory)
    const totalBillsCount = allBills.length;
    const totalBillPurchases = allBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
    const highestBill = allBills.length > 0 ? [...allBills].sort((a, b) => (b.grandTotal || 0) - (a.grandTotal || 0))[0] : null;
    const lowestBill = allBills.filter(b => (b.grandTotal || 0) > 0).sort((a, b) => (a.grandTotal || 0) - (b.grandTotal || 0))[0] || null;
    const highestCommissionBill = allBills.length > 0 ? [...allBills].sort((a, b) => (b.commissionAddition || 0) - (a.commissionAddition || 0))[0] : null;
    const lowestCommissionBill = allBills.filter(b => (b.commissionAddition || 0) > 0).sort((a, b) => (a.commissionAddition || 0) - (b.commissionAddition || 0))[0] || null;

    const billCropAggregation = {};
    allBills.forEach(b => {
      if (b.cropName) {
        billCropAggregation[b.cropName] = (billCropAggregation[b.cropName] || 0) + (b.grandTotal || 0);
      }
    });
    const billCropDataList = Object.keys(billCropAggregation).map(crop => ({
      name: crop,
      value: billCropAggregation[crop]
    }));

    const monthlyCommissionsMap = {};
    allBills.forEach(b => {
      if (b.date && b.date.length >= 7) {
        const month = b.date.substring(0, 7);
        monthlyCommissionsMap[month] = (monthlyCommissionsMap[month] || 0) + (b.commissionAddition || 0);
      }
    });
    const commissionMonthlyTrend = Object.keys(monthlyCommissionsMap)
      .sort()
      .map(month => ({
        month,
        value: monthlyCommissionsMap[month]
      }));

    const monthlyBillPurchasesMap = {};
    allBills.forEach(b => {
      if (b.date && b.date.length >= 7) {
        const month = b.date.substring(0, 7);
        monthlyBillPurchasesMap[month] = (monthlyBillPurchasesMap[month] || 0) + (b.grandTotal || 0);
      }
    });
    const billMonthlyTrend = Object.keys(monthlyBillPurchasesMap)
      .sort()
      .map(month => ({
        month,
        value: monthlyBillPurchasesMap[month]
      }));

    // 4. Cashbook Analytics (In-Memory)
    const deposits = allCashbook.filter(c => c.type === 'deposit');
    const withdrawals = allCashbook.filter(c => c.type === 'withdrawal');
    const highestDeposit = deposits.length > 0 ? [...deposits].sort((a, b) => (b.amount || 0) - (a.amount || 0))[0] : null;
    const lowestDeposit = deposits.filter(c => (c.amount || 0) > 0).sort((a, b) => (a.amount || 0) - (b.amount || 0))[0] || null;
    const highestWithdrawal = withdrawals.length > 0 ? [...withdrawals].sort((a, b) => (b.amount || 0) - (a.amount || 0))[0] : null;
    const lowestWithdrawal = withdrawals.filter(c => (c.amount || 0) > 0).sort((a, b) => (a.amount || 0) - (b.amount || 0))[0] || null;

    let totalDeposits = 0;
    let totalWithdrawals = 0;
    allCashbook.forEach(c => {
      if (c.type === 'deposit') totalDeposits += (c.amount || 0);
      if (c.type === 'withdrawal') totalWithdrawals += (c.amount || 0);
    });

    const monthlyCashbookMap = {};
    allCashbook.forEach(c => {
      if (c.date && c.date.length >= 7) {
        const month = c.date.substring(0, 7);
        if (!monthlyCashbookMap[month]) {
          monthlyCashbookMap[month] = { deposit: 0, withdrawal: 0 };
        }
        if (c.type === 'deposit') {
          monthlyCashbookMap[month].deposit += (c.amount || 0);
        } else if (c.type === 'withdrawal') {
          monthlyCashbookMap[month].withdrawal += (c.amount || 0);
        }
      }
    });
    const cashbookMonthlyFlow = Object.keys(monthlyCashbookMap)
      .sort()
      .map(month => ({
        month,
        deposit: monthlyCashbookMap[month].deposit,
        withdrawal: monthlyCashbookMap[month].withdrawal
      }));

    // 5. Bank Account Analytics (In-Memory)
    const highestBank = allBanks.length > 0 ? [...allBanks].sort((a, b) => (b.balance || 0) - (a.balance || 0))[0] : null;
    const lowestBank = allBanks.length > 0 ? [...allBanks].sort((a, b) => (a.balance || 0) - (b.balance || 0))[0] : null;
    const totalBankBalance = allBanks.reduce((sum, b) => sum + (b.balance || 0), 0);
    const bankBalanceData = allBanks.map(b => ({
      name: b.bankName + (b.accountNumber ? ` (${b.accountNumber.slice(-4)})` : ''),
      value: b.balance || 0
    }));

    const bankTxnSummary = {};
    allBankTxns.forEach(t => {
      if (t.bankAccountId) {
        const bid = t.bankAccountId._id ? t.bankAccountId._id.toString() : t.bankAccountId.toString();
        if (!bankTxnSummary[bid]) {
          bankTxnSummary[bid] = { debit: 0, credit: 0 };
        }
        if (t.type === 'debit') {
          bankTxnSummary[bid].debit += (t.amount || 0);
        } else if (t.type === 'credit') {
          bankTxnSummary[bid].credit += (t.amount || 0);
        }
      }
    });
    const bankDetails = allBanks.map(b => ({
      accountId: b._id,
      bankName: b.bankName,
      accountNumber: b.accountNumber,
      balance: b.balance || 0,
      debit: bankTxnSummary[b._id.toString()]?.debit || 0,
      credit: bankTxnSummary[b._id.toString()]?.credit || 0
    }));

    const bankMonthlyMap = {};
    allBankTxns.forEach(t => {
      const dateStr = t.date ? new Date(t.date).toISOString().substring(0, 7) : t.createdAt?.toISOString().substring(0, 7);
      if (dateStr) {
        if (!bankMonthlyMap[dateStr]) bankMonthlyMap[dateStr] = { debit: 0, credit: 0 };
        if (t.type === 'debit') bankMonthlyMap[dateStr].debit += (t.amount || 0);
        if (t.type === 'credit') bankMonthlyMap[dateStr].credit += (t.amount || 0);
      }
    });
    const bankMonthlyTrend = Object.keys(bankMonthlyMap)
      .sort()
      .map(month => ({
        month,
        debit: bankMonthlyMap[month].debit,
        credit: bankMonthlyMap[month].credit
      }));

    // 6. Customer Analytics (In-Memory)
    const custTxnMap = {};
    allCustTransactions.forEach(t => {
      if (t.customerId) {
        const cid = t.customerId.toString();
        if (!custTxnMap[cid]) custTxnMap[cid] = [];
        custTxnMap[cid].push(t);
      }
    });

    let totalCustBalance = 0;
    const customerDetails = allCustomers.map(customer => {
      const txns = custTxnMap[customer._id.toString()] || [];
      const ledger = calculateRunningLedger(txns, new Date());
      const totalLent = txns.reduce((sum, t) => t.type === 'gave' ? sum + (t.amount || 0) : sum, 0);
      const totalGot = txns.reduce((sum, t) => t.type === 'got' ? sum + (t.amount || 0) : sum, 0);
      
      const gaveTxns = txns.filter(t => t.type === 'gave');
      const interestRates = gaveTxns.map(t => t.interestRate || 0);
      const maxInterestRate = interestRates.length > 0 ? Math.max(...interestRates) : 0;
      const minInterestRate = interestRates.length > 0 ? Math.min(...interestRates) : 0;

      totalCustBalance += (ledger.netBalance || 0);

      return {
        customerId: customer._id,
        customerName: customer.customerName,
        contactNumber: customer.contactNumber,
        balance: ledger.netBalance || 0,
        totalInterest: ledger.totalInterest || 0,
        totalLent,
        totalGot,
        maxInterestRate,
        minInterestRate
      };
    });

    const topCustomers = customerDetails
      .filter(c => c.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5)
      .map(c => ({ name: c.customerName, value: c.balance }));

    const highestCustBal = customerDetails.length > 0 ? [...customerDetails].sort((a, b) => (b.balance || 0) - (a.balance || 0))[0] : null;
    const lowestCustBal = customerDetails.filter(c => (c.balance || 0) > 0).sort((a, b) => (a.balance || 0) - (b.balance || 0))[0] || null;

    const customerMonthlyMap = {};
    allCustTransactions.forEach(t => {
      const dateStr = t.date ? new Date(t.date).toISOString().substring(0, 7) : t.createdAt?.toISOString().substring(0, 7);
      if (dateStr) {
        if (!customerMonthlyMap[dateStr]) customerMonthlyMap[dateStr] = { lent: 0, received: 0 };
        if (t.type === 'gave') customerMonthlyMap[dateStr].lent += (t.amount || 0);
        if (t.type === 'got') customerMonthlyMap[dateStr].received += (t.amount || 0);
      }
    });
    const customerMonthlyTrend = Object.keys(customerMonthlyMap)
      .sort()
      .map(month => ({
        month,
        lent: customerMonthlyMap[month].lent,
        received: customerMonthlyMap[month].received
      }));

    // 7. Merchant Analytics (In-Memory)
    const highestMerchBal = allMerchants.length > 0 ? [...allMerchants].sort((a, b) => (b.balance || 0) - (a.balance || 0))[0] : null;
    const lowestMerchBal = allMerchants.length > 0 ? [...allMerchants].sort((a, b) => (a.balance || 0) - (b.balance || 0))[0] : null;
    const totalMerchBalance = allMerchants.reduce((sum, m) => sum + (m.balance || 0), 0);
    const topMerchants = allMerchants
      .filter(m => m.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5)
      .map(m => ({ name: m.merchantName, value: m.balance }));

    const merchantPattiBuyMap = {};
    allPattis.forEach(p => {
      if (p.merchantName) {
        merchantPattiBuyMap[p.merchantName] = (merchantPattiBuyMap[p.merchantName] || 0) + (p.grandTotal || 0);
      }
    });
    const merchantDetails = allMerchants.map(m => {
      const buyVolume = merchantPattiBuyMap[m.merchantName] || 0;
      return {
        merchantId: m._id,
        merchantName: m.merchantName,
        contactNumber: m.contactNumber,
        balance: m.balance || 0,
        buyVolume
      };
    });

    const merchantMonthlyMap = {};
    allMerchTransactions.forEach(t => {
      const dateStr = t.date ? new Date(t.date).toISOString().substring(0, 7) : t.createdAt?.toISOString().substring(0, 7);
      if (dateStr) {
        if (!merchantMonthlyMap[dateStr]) merchantMonthlyMap[dateStr] = { gave: 0, got: 0 };
        if (t.type === 'gave') merchantMonthlyMap[dateStr].gave += (t.amount || 0);
        if (t.type === 'got') merchantMonthlyMap[dateStr].got += (t.amount || 0);
      }
    });
    const merchantMonthlyTrend = Object.keys(merchantMonthlyMap)
      .sort()
      .map(month => ({
        month,
        gave: merchantMonthlyMap[month].gave,
        got: merchantMonthlyMap[month].got
      }));

    // 8. Employee Analytics (In-Memory)
    const highestWeeklySalaryEmp = allEmployees.length > 0 ? [...allEmployees].sort((a, b) => (b.weeklySalary || 0) - (a.weeklySalary || 0))[0] : null;
    const lowestWeeklySalaryEmp = allEmployees.filter(e => (e.weeklySalary || 0) > 0).sort((a, b) => (e.weeklySalary || 0) - (b.weeklySalary || 0))[0] || null;
    const highestEmpTxn = allEmployeeTxns.length > 0 ? [...allEmployeeTxns].sort((a, b) => (b.amount || 0) - (a.amount || 0))[0] : null;
    const lowestEmpTxn = allEmployeeTxns.filter(t => (t.amount || 0) > 0).sort((a, b) => (a.amount || 0) - (b.amount || 0))[0] || null;

    const empTxnSummary = {};
    allEmployeeTxns.forEach(t => {
      if (t.employeeId) {
        const eid = t.employeeId._id ? t.employeeId._id.toString() : t.employeeId.toString();
        if (!empTxnSummary[eid]) {
          empTxnSummary[eid] = { salaryEarned: 0, paymentsReceived: 0 };
        }
        if (t.type === 'Salary') {
          empTxnSummary[eid].salaryEarned += (t.amount || 0);
        } else if (t.type === 'Payment') {
          empTxnSummary[eid].paymentsReceived += (t.amount || 0);
        }
      }
    });
    const employeeDetails = allEmployees.map(e => ({
      employeeId: e._id,
      employeeName: e.employeeName,
      role: e.role,
      weeklySalary: e.weeklySalary,
      status: e.status,
      salaryEarned: empTxnSummary[e._id.toString()]?.salaryEarned || 0,
      paymentsReceived: empTxnSummary[e._id.toString()]?.paymentsReceived || 0
    }));

    const employeeMonthlyMap = {};
    allEmployeeTxns.forEach(t => {
      const dateStr = t.date ? new Date(t.date).toISOString().substring(0, 7) : t.createdAt?.toISOString().substring(0, 7);
      if (dateStr) {
        if (!employeeMonthlyMap[dateStr]) employeeMonthlyMap[dateStr] = { salary: 0, payment: 0 };
        if (t.type === 'Salary') employeeMonthlyMap[dateStr].salary += (t.amount || 0);
        if (t.type === 'Payment') employeeMonthlyMap[dateStr].payment += (t.amount || 0);
      }
    });
    const employeeMonthlyTrend = Object.keys(employeeMonthlyMap)
      .sort()
      .map(month => ({
        month,
        salary: employeeMonthlyMap[month].salary,
        payment: employeeMonthlyMap[month].payment
      }));

    // 9. Investments Analytics (In-Memory)
    const highestInvestment = allInvestments.length > 0 ? [...allInvestments].sort((a, b) => (b.investAmount || 0) - (a.investAmount || 0))[0] : null;
    const lowestInvestment = allInvestments.filter(i => (i.investAmount || 0) > 0).sort((a, b) => (a.investAmount || 0) - (b.investAmount || 0))[0] || null;

    let totalFD = 0;
    let totalRD = 0;
    allInvestments.forEach(i => {
      if (i.investmentType === 'FD') totalFD += (i.investAmount || 0);
      if (i.investmentType === 'RD') totalRD += (i.investAmount || 0);
    });

    const investmentMonthlyMap = {};
    allInvestments.forEach(i => {
      const dateStr = i.createdAt ? new Date(i.createdAt).toISOString().substring(0, 7) : null;
      if (dateStr) {
        investmentMonthlyMap[dateStr] = (investmentMonthlyMap[dateStr] || 0) + (i.investAmount || 0);
      }
    });
    const investmentMonthlyTrend = Object.keys(investmentMonthlyMap)
      .sort()
      .map(month => ({
        month,
        value: investmentMonthlyMap[month]
      }));

    // 10. Other Accounts Analytics (In-Memory)
    const highestOtherAcc = allOtherAccs.length > 0 ? [...allOtherAccs].sort((a, b) => (b.balance || 0) - (a.balance || 0))[0] : null;
    const lowestOtherAcc = allOtherAccs.length > 0 ? [...allOtherAccs].sort((a, b) => (a.balance || 0) - (b.balance || 0))[0] : null;
    const totalOtherAccBalance = allOtherAccs.reduce((sum, o) => sum + (o.balance || 0), 0);
    const otherAccBalanceData = allOtherAccs.map(o => ({
      name: o.otherAccountName,
      value: o.balance || 0
    }));

    const otherAccMonthlyMap = {};
    allOtherAccTransactions.forEach(t => {
      const dateStr = t.date ? new Date(t.date).toISOString().substring(0, 7) : t.createdAt?.toISOString().substring(0, 7);
      if (dateStr) {
        otherAccMonthlyMap[dateStr] = (otherAccMonthlyMap[dateStr] || 0) + (t.amount || 0);
      }
    });
    const otherAccMonthlyTrend = Object.keys(otherAccMonthlyMap)
      .sort()
      .map(month => ({
        month,
        value: otherAccMonthlyMap[month]
      }));

    // 11. P&L & Cashbook Calculations (In-Memory)
    const tzOffset = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(Date.now() + tzOffset).toISOString().split('T')[0];
    const dailyCashbookCash = calculateCashbookClosingBalanceInMemory(todayIST, allBills, allBankTxns, allCustTransactions, allCashbook);

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() + tzOffset - i * 24 * 60 * 60 * 1000);
      last7Days.push(d.toISOString().split('T')[0]);
    }

    const pnlHistory = last7Days.map((dayStr) => {
      let bankBal = totalBankBalance;
      allBankTxns.forEach(t => {
        const tDate = t.date ? new Date(t.date).toISOString().substring(0, 10) : t.createdAt?.toISOString().substring(0, 10);
        if (tDate && tDate > dayStr) {
          if (t.type === 'credit') bankBal -= (t.amount || 0);
          if (t.type === 'debit') bankBal += (t.amount || 0);
        }
      });

      let custBal = totalCustBalance;
      allCustTransactions.forEach(t => {
        const tDate = t.date ? new Date(t.date).toISOString().substring(0, 10) : t.createdAt?.toISOString().substring(0, 10);
        if (tDate && tDate > dayStr) {
          if (t.type === 'gave') custBal -= (t.amount || 0);
          if (t.type === 'got') custBal += (t.amount || 0);
        }
      });

      let merchBal = totalMerchBalance;
      allMerchTransactions.forEach(t => {
        const tDate = t.date ? new Date(t.date).toISOString().substring(0, 10) : t.createdAt?.toISOString().substring(0, 10);
        if (tDate && tDate > dayStr) {
          if (t.type === 'gave') merchBal -= (t.amount || 0);
          if (t.type === 'got') merchBal += (t.amount || 0);
        }
      });

      const dailyCash = calculateCashbookClosingBalanceInMemory(dayStr, allBills, allBankTxns, allCustTransactions, allCashbook);
      const val = bankBal + custBal + merchBal + dailyCash;

      return {
        name: dayStr.substring(5),
        value: val
      };
    });

    res.status(200).json({
      success: true,
      data: {
        patti: {
          count: totalPattisCount,
          totalSales: totalPattiSales,
          highest: highestPatti,
          lowest: lowestPatti,
          cropData: pattiCropData,
          monthlyTrend: pattiMonthlyTrend
        },
        bill: {
          count: totalBillsCount,
          totalPurchases: totalBillPurchases,
          highest: highestBill,
          lowest: lowestBill,
          cropData: billCropDataList,
          monthlyTrend: billMonthlyTrend
        },
        commission: {
          totalEarned: allBills.reduce((sum, b) => sum + (b.commissionAddition || 0), 0),
          highest: highestCommissionBill,
          lowest: lowestCommissionBill,
          monthlyTrend: commissionMonthlyTrend
        },
        cashbook: {
          totalDeposits,
          totalWithdrawals,
          highestDeposit,
          lowestDeposit,
          highestWithdrawal,
          lowestWithdrawal,
          monthlyFlow: cashbookMonthlyFlow
        },
        bank: {
          totalBalance: totalBankBalance,
          highest: highestBank,
          lowest: lowestBank,
          bankData: bankBalanceData,
          bankDetails,
          monthlyTrend: bankMonthlyTrend
        },
        customer: {
          totalBalance: totalCustBalance,
          highest: highestCustBal,
          lowest: lowestCustBal,
          topCustomers,
          customerDetails,
          monthlyTrend: customerMonthlyTrend
        },
        merchant: {
          totalBalance: totalMerchBalance,
          highest: highestMerchBal,
          lowest: lowestMerchBal,
          topMerchants,
          merchantDetails,
          monthlyTrend: merchantMonthlyTrend
        },
        employee: {
          count: allEmployees.length,
          highestSalary: highestWeeklySalaryEmp,
          lowestSalary: lowestWeeklySalaryEmp,
          highestTxn: highestEmpTxn,
          lowestTxn: lowestEmpTxn,
          employeeDetails,
          monthlyTrend: employeeMonthlyTrend
        },
        investment: {
          count: allInvestments.length,
          totalFD,
          totalRD,
          highest: highestInvestment,
          lowest: lowestInvestment,
          investmentsList: allInvestments,
          monthlyTrend: investmentMonthlyTrend
        },
        otherAccount: {
          totalBalance: totalOtherAccBalance,
          highest: highestOtherAcc,
          lowest: lowestOtherAcc,
          accountsData: otherAccBalanceData,
          monthlyTrend: otherAccMonthlyTrend
        },
        pnl: {
          dailyCashbookCash,
          pnlHistory
        }
      }
    });
  } catch (error) {
    console.error('Error fetching analytics dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics report',
      error: error.message
    });
  }
};


module.exports = {
  getDailyBalance,
  getCommissionsReport,
  getDashboardStats,
  getAnalyticsReport
};
