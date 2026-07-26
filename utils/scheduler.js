const { checkMaturityAndSendAlerts } = require('../controllers/investmentController');

/**
 * Initializes a daily check scheduler.
 * Runs every hour and executes the maturity check if the current time is 9:00 AM IST.
 * Also runs once at startup after a brief delay to ensure database connection is ready.
 */
function initScheduler() {
  console.log('[Scheduler] Initializing investment maturity alert scheduler...');

  // 1. Run a check shortly after startup (e.g. 5 seconds) to catch any missed alerts
  setTimeout(async () => {
    try {
      console.log('[Scheduler] Running startup maturity alert check...');
      await checkMaturityAndSendAlerts();
    } catch (err) {
      console.error('[Scheduler] Startup maturity check error:', err.message);
    }
  }, 5000);

  // 2. Set up interval checking every hour
  setInterval(async () => {
    try {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(now.getTime() + istOffset);
      const hours = istTime.getHours();

      // Trigger daily at 9:00 AM IST (matches the 9th hour)
      if (hours === 9) {
        console.log('[Scheduler] Triggering scheduled daily check (9:00 AM IST)...');
        await checkMaturityAndSendAlerts();
      }
    } catch (err) {
      console.error('[Scheduler] Scheduled check error:', err.message);
    }
  }, 60 * 60 * 1000); // Check every hour
}

module.exports = { initScheduler };
