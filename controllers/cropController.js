const Crop = require('../models/Crop');

// @desc    Create a new Crop
// @route   POST /api/crop
// @access  Public
const createCrop = async (req, res) => {
  try {
    const { cropName } = req.body;

    if (!cropName) {
      return res.status(400).json({
        success: false,
        message: 'Crop name is required'
      });
    }

    // Check for duplicate name
    const existingCrop = await Crop.findOne({ cropName });
    if (existingCrop) {
      return res.status(400).json({
        success: false,
        message: 'A crop with this name already exists'
      });
    }

    const newCrop = new Crop({
      cropName
    });

    const savedCrop = await newCrop.save();

    res.status(201).json({
      success: true,
      data: savedCrop,
      message: 'Crop created successfully'
    });
  } catch (error) {
    console.error('Error creating crop:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create crop',
      error: error.message
    });
  }
};

// @desc    Get all Crops
// @route   GET /api/crop
// @access  Public
const getAllCrops = async (req, res) => {
  try {
    const crops = await Crop.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: crops.length,
      data: crops,
      message: 'Crops fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching crops:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch crops',
      error: error.message
    });
  }
};

// @desc    Delete a Crop
// @route   DELETE /api/crop/:id
// @access  Public
const deleteCrop = async (req, res) => {
  try {
    const { id } = req.params;
    const crop = await Crop.findByIdAndDelete(id);

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Crop deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting crop:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete crop',
      error: error.message
    });
  }
};

module.exports = {
  createCrop,
  getAllCrops,
  deleteCrop
};
