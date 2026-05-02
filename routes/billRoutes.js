const express = require('express');
const router = express.Router();
const { createBill, getAllBills } = require('../controllers/billController');

// Route to get all Bill records
router.get('/', getAllBills);

// Route to create a new Bill record
router.post('/', createBill);

module.exports = router;
