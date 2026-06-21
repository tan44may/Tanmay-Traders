const express = require('express');
const router = express.Router();
const { getDailyBalance } = require('../controllers/reportController');

router.get('/daily-balance', getDailyBalance);

module.exports = router;
