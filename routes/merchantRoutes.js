const express = require('express');
const router = express.Router();
const { createMerchant, getAllMerchants, deleteMerchant } = require('../controllers/merchantController');

// Route to get all Merchants
router.get('/', getAllMerchants);

// Route to create a new Merchant
router.post('/', createMerchant);

// Route to delete a Merchant
router.delete('/:id', deleteMerchant);

module.exports = router;
