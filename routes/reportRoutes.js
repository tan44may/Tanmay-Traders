const express = require('express');
const router = express.Router();
const { getDailyBalance, getCommissionsReport, getDashboardStats } = require('../controllers/reportController');

router.get('/daily-balance', getDailyBalance);
router.get('/commissions', getCommissionsReport);
router.get('/dashboard-stats', getDashboardStats);

module.exports = router;
