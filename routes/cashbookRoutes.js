const express = require('express');
const router = express.Router();
const {
  getCashbookData,
  addCashbookEntry,
  deleteCashbookEntry,
  getDenomination,
  saveDenomination,
  resendDenominationSummary
} = require('../controllers/cashbookController');

router.get('/', getCashbookData);
router.post('/entry', addCashbookEntry);
router.delete('/entry/:id', deleteCashbookEntry);

// Denomination calculator & message/whatsapp summary routes
router.get('/denomination', getDenomination);
router.post('/denomination', saveDenomination);
router.post('/denomination/resend-summary', resendDenominationSummary);

module.exports = router;
