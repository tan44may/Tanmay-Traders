const express = require('express');
const router = express.Router();
const { getDailyBalance, getCommissionsReport } = require('../controllers/reportController');

router.get('/daily-balance', getDailyBalance);
router.get('/commissions', getCommissionsReport);

module.exports = router;
