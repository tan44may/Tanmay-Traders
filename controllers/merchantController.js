const Merchant = require('../models/Merchant');

// @desc    Create a new Merchant
// @route   POST /api/merchant
// @access  Public
const createMerchant = async (req, res) => {
  try {
    const { merchantName, contactNumber } = req.body;

    if (!merchantName) {
      return res.status(400).json({
        success: false,
        message: 'Merchant name is required'
      });
    }

    // Check for duplicate name
    const existingMerchant = await Merchant.findOne({ merchantName });
    if (existingMerchant) {
      return res.status(400).json({
        success: false,
        message: 'A merchant with this name already exists'
      });
    }

    const newMerchant = new Merchant({
      merchantName,
      contactNumber
    });

    const savedMerchant = await newMerchant.save();

    res.status(201).json({
      success: true,
      data: savedMerchant,
      message: 'Merchant created successfully'
    });
  } catch (error) {
    console.error('Error creating merchant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create merchant',
      error: error.message
    });
  }
};

// @desc    Get all Merchants
// @route   GET /api/merchant
// @access  Public
const getAllMerchants = async (req, res) => {
  try {
    const merchants = await Merchant.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: merchants.length,
      data: merchants,
      message: 'Merchants fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching merchants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch merchants',
      error: error.message
    });
  }
};

module.exports = {
  createMerchant,
  getAllMerchants
};
