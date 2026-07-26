const Investment = require('../models/Investment');
const { sendMaturityAlerts } = require('../utils/whatsappService');

// @desc    Create a new investment (RD or FD)
// @route   POST /api/investments
// @access  Public
const createInvestment = async (req, res) => {
  try {
    const { investmentType, accountNumber, investAmount, maturityAmount, maturityDate } = req.body;

    if (!investmentType || !accountNumber || !investAmount || !maturityAmount || !maturityDate) {
      return res.status(400).json({
        success: false,
        message: 'All fields (type, account number, invest amount, maturity amount, maturity date) are required.'
      });
    }

    if (!['RD', 'FD'].includes(investmentType)) {
      return res.status(400).json({
        success: false,
        message: 'Investment type must be either "RD" or "FD".'
      });
    }

    const newInvestment = new Investment({
      investmentType,
      accountNumber,
      investAmount: Number(investAmount),
      maturityAmount: Number(maturityAmount),
      maturityDate: new Date(maturityDate),
      alertSent: false
    });

    const saved = await newInvestment.save();

    res.status(201).json({
      success: true,
      data: saved,
      message: 'Investment added successfully.'
    });
  } catch (error) {
    console.error('Error creating investment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add investment.',
      error: error.message
    });
  }
};

// @desc    Get all investments sorted by maturityDate ascending
// @route   GET /api/investments
// @access  Public
const getAllInvestments = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = {};
    if (type) {
      filter.investmentType = type;
    }

    // Sort by maturityDate ascending
    const investments = await Investment.find(filter).sort({ maturityDate: 1 });

    res.status(200).json({
      success: true,
      count: investments.length,
      data: investments,
      message: 'Investments fetched successfully.'
    });
  } catch (error) {
    console.error('Error fetching investments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch investments.',
      error: error.message
    });
  }
};

// @desc    Delete an investment
// @route   DELETE /api/investments/:id
// @access  Public
const deleteInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Investment.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Investment deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting investment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete investment.',
      error: error.message
    });
  }
};

// @desc    Check for investments maturing tomorrow and send WhatsApp alerts
// @route   GET /api/investments/check-maturity
// @access  Public
const checkMaturityAndSendAlerts = async (req, res) => {
  try {
    // Determine tomorrow in Indian Standard Time (IST, UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);

    // Tomorrow in IST
    const istTomorrow = new Date(istTime);
    istTomorrow.setDate(istTime.getDate() + 1);

    // Start of tomorrow in IST: 00:00:00.000
    const startOfTomorrowIST = new Date(
      istTomorrow.getFullYear(),
      istTomorrow.getMonth(),
      istTomorrow.getDate(),
      0, 0, 0, 0
    );
    const startOfTomorrowUTC = new Date(startOfTomorrowIST.getTime() - istOffset);

    // End of tomorrow in IST: 23:59:59.999
    const endOfTomorrowIST = new Date(
      istTomorrow.getFullYear(),
      istTomorrow.getMonth(),
      istTomorrow.getDate(),
      23, 59, 59, 999
    );
    const endOfTomorrowUTC = new Date(endOfTomorrowIST.getTime() - istOffset);

    console.log(`[Scheduler] Checking maturity for IST date: ${istTomorrow.toLocaleDateString()}`);
    console.log(`[Scheduler] Search window (UTC): ${startOfTomorrowUTC.toISOString()} to ${endOfTomorrowUTC.toISOString()}`);

    // Query investments maturing tomorrow that haven't been alerted yet
    const maturingInvestments = await Investment.find({
      maturityDate: {
        $gte: startOfTomorrowUTC,
        $lte: endOfTomorrowUTC
      },
      alertSent: { $ne: true }
    });

    const sentAlerts = [];

    for (const investment of maturingInvestments) {
      await sendMaturityAlerts(investment);
      
      // Update investment state to indicate alert has been dispatched
      investment.alertSent = true;
      await investment.save();
      
      sentAlerts.push({
        _id: investment._id,
        accountNumber: investment.accountNumber,
        investmentType: investment.investmentType
      });
    }

    const message = `Processed ${maturingInvestments.length} maturing investments. ${sentAlerts.length} alerts successfully sent.`;
    console.log(`[Scheduler] Check complete: ${message}`);

    if (res) {
      return res.status(200).json({
        success: true,
        count: sentAlerts.length,
        data: sentAlerts,
        message
      });
    }
    return { success: true, count: sentAlerts.length, data: sentAlerts };
  } catch (error) {
    console.error('Error in checkMaturityAndSendAlerts:', error);
    if (res) {
      return res.status(500).json({
        success: false,
        message: 'Failed to process maturity checks.',
        error: error.message
      });
    }
    throw error;
  }
};

module.exports = {
  createInvestment,
  getAllInvestments,
  deleteInvestment,
  checkMaturityAndSendAlerts
};
