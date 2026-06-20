const express = require('express');
const router = express.Router();
const { createCrop, getAllCrops, deleteCrop } = require('../controllers/cropController');

// Route to get all Crops
router.get('/', getAllCrops);

// Route to create a new Crop
router.post('/', createCrop);

// Route to delete a Crop
router.delete('/:id', deleteCrop);

module.exports = router;
