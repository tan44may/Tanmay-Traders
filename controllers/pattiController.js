const Patti = require('../models/Patti');

// @desc    Create a new Patti record
// @route   POST /api/patti
// @access  Public
const createPatti = async (req, res) => {
  try {
    const {
      date,
      cropName,
      customerName,
      merchantName,
      quantity,
      rate,
      hamaliRate,
      tolaiRate,
      otherCharges,
      totalAmount,
      hamaliDeduction,
      tolaiDeduction,
      grandTotal
    } = req.body;

    // Simple validation
    if (!date || !cropName || !customerName || !merchantName) {
      return res.status(400).json({ message: 'Please provide all required string fields' });
    }

    const newPatti = new Patti({
      date,
      cropName,
      customerName,
      merchantName,
      quantity,
      rate,
      hamaliRate,
      tolaiRate,
      otherCharges,
      totalAmount,
      hamaliDeduction,
      tolaiDeduction,
      grandTotal
    });

    const savedPatti = await newPatti.save();
    
    res.status(201).json({
      success: true,
      data: savedPatti,
      message: 'Patti record created successfully'
    });
  } catch (error) {
    console.error('Error creating patti:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Patti record',
      error: error.message
    });
  }
};

// @desc    Get all Patti records
// @route   GET /api/patti
// @access  Public
const getAllPattis = async (req, res) => {
  try {
    // Sorting by createdAt descending gives us the newest entries first,
    // which accurately represents the dates they were created.
    const pattis = await Patti.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: pattis.length,
      data: pattis,
      message: 'Patti records fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching pattis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Patti records',
      error: error.message
    });
  }
};

module.exports = {
  createPatti,
  getAllPattis
};
