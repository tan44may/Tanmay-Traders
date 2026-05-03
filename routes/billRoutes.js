const express = require('express');
const router = express.Router();
const { createBill, getAllBills, deleteBill } = require('../controllers/billController');

// Route to get all Bill records
router.get('/', getAllBills);

// Route to create a new Bill record
router.post('/', createBill);

// Route to delete a Bill record
router.delete('/:id', deleteBill);

module.exports = router;
