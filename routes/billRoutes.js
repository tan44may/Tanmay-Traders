const express = require('express');
const router = express.Router();
const { createBill, getAllBills, deleteBill, toggleBillCheckStatus } = require('../controllers/billController');

// Route to get all Bill records
router.get('/', getAllBills);

// Route to create a new Bill record
router.post('/', createBill);

// Route to delete a Bill record
router.delete('/:id', deleteBill);

// Route to update checked state of a Bill
router.put('/:id/check', toggleBillCheckStatus);

module.exports = router;
