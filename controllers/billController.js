const Bill = require('../models/Bill');

// @desc    Create a new Bill record
// @route   POST /api/bill
// @access  Public
const createBill = async (req, res) => {
  try {
    const {
      date,
      merchantName,
      cropName,
      quantity,
      rate,
      tolaiRate,
      commissionRate,
      totalAmount,
      tolaiDeduction,
      commissionAddition,
      grandTotal
    } = req.body;

    // Simple validation
    if (!date || !merchantName || !cropName) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const newBill = new Bill({
      date,
      merchantName,
      cropName,
      quantity,
      rate,
      tolaiRate,
      commissionRate,
      totalAmount,
      tolaiDeduction,
      commissionAddition,
      grandTotal
    });

    const savedBill = await newBill.save();
    
    res.status(201).json({
      success: true,
      data: savedBill,
      message: 'Bill record created successfully'
    });
  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Bill record',
      error: error.message
    });
  }
};

// @desc    Get all Bill records
// @route   GET /api/bill
// @access  Public
const getAllBills = async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: bills.length,
      data: bills,
      message: 'Bill records fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Bill records',
      error: error.message
    });
  }
};

module.exports = {
  createBill,
  getAllBills
};
