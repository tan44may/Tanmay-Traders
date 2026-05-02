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
      grandTotal
    } = req.body;

    // Simple validation
    if (!date || !merchantName || !cropName) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Parse inputs to numbers to ensure safe calculations
    const numQuantity = Number(quantity) || 0;
    const numRate = Number(rate) || 0;
    const numTolaiRate = Number(tolaiRate) || 0;
    const numCommissionRate = Number(commissionRate) || 0;

    const calculatedTotalAmount = numQuantity * numRate;
    const calculatedTolaiDeduction = numTolaiRate * numQuantity;
    // commissionAddition=(commissionrate*totalamount)/100
    const calculatedCommissionAddition = (numCommissionRate * calculatedTotalAmount) / 100;
    
    // grandtotal=totalamount-tolai deduction +commissionAddition
    const calculatedGrandTotal = calculatedTotalAmount - calculatedTolaiDeduction + calculatedCommissionAddition;

    const newBill = new Bill({
      date,
      merchantName,
      cropName,
      quantity: numQuantity,
      rate: numRate,
      tolaiRate: numTolaiRate,
      commissionRate: numCommissionRate,
      totalAmount: calculatedTotalAmount,
      tolaiDeduction: calculatedTolaiDeduction,
      commissionAddition: calculatedCommissionAddition,
      grandTotal: calculatedGrandTotal
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
