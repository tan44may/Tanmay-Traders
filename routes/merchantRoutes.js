const express = require('express');
const router = express.Router();
const { createMerchant, getAllMerchants } = require('../controllers/merchantController');

// Route to get all Merchants
router.get('/', getAllMerchants);

// Route to create a new Merchant
router.post('/', createMerchant);

module.exports = router;
