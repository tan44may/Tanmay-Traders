const express = require('express');
const router = express.Router();
const { getDailyBalance, getCommissionsReport, getDashboardStats, getAnalyticsReport } = require('../controllers/reportController');

router.get('/daily-balance', getDailyBalance);
router.get('/commissions', getCommissionsReport);
router.get('/dashboard-stats', getDashboardStats);
router.get('/analytics', getAnalyticsReport);

module.exports = router;
