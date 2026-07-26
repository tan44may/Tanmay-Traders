const express = require('express');
const router = express.Router();
const { 
  createInvestment, 
  getAllInvestments, 
  deleteInvestment, 
  checkMaturityAndSendAlerts 
} = require('../controllers/investmentController');

// Route to get all investments (with optional ?type=RD or ?type=FD query param)
router.get('/', getAllInvestments);

// Route to create a new investment
router.post('/', createInvestment);

// Route to delete an investment
router.delete('/:id', deleteInvestment);

// Route to manually/automatically trigger maturity alert checks
router.get('/check-maturity', checkMaturityAndSendAlerts);

module.exports = router;
