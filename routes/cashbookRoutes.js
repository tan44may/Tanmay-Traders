const express = require('express');
const router = express.Router();
const {
  getCashbookData,
  addCashbookEntry,
  deleteCashbookEntry,
  getDenomination,
  saveDenomination
} = require('../controllers/cashbookController');

router.get('/', getCashbookData);
router.post('/entry', addCashbookEntry);
router.delete('/entry/:id', deleteCashbookEntry);

// Denomination calculator routes
router.get('/denomination', getDenomination);
router.post('/denomination', saveDenomination);

module.exports = router;
