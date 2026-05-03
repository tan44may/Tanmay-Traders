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

// @desc    Delete a Bill record
// @route   DELETE /api/bill/:id
// @access  Public
const deleteBill = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findByIdAndDelete(id);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bill record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete Bill record',
      error: error.message
    });
  }
};

module.exports = {
  createBill,
  getAllBills,
  deleteBill
};
