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

module.exports = {
  createPatti
};
