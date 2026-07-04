const express = require('express');
const router = express.Router();
const {
  getCashbookData,
  addCashbookEntry,
  deleteCashbookEntry
} = require('../controllers/cashbookController');

router.get('/', getCashbookData);
router.post('/entry', addCashbookEntry);
router.delete('/entry/:id', deleteCashbookEntry);

module.exports = router;
