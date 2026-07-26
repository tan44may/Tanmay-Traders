const express = require('express');
const router = express.Router();
const { 
  createInvestment, 
  getAllInvestments, 
  deleteInvestment
} = require('../controllers/investmentController');

// Route to get all investments (with optional ?type=RD or ?type=FD query param)
router.get('/', getAllInvestments);

// Route to create a new investment
router.post('/', createInvestment);

// Route to delete an investment
router.delete('/:id', deleteInvestment);

module.exports = router;
