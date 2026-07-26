const Investment = require('../models/Investment');

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

module.exports = {
  createInvestment,
  getAllInvestments,
  deleteInvestment
};
