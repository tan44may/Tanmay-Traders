const fs = require('fs');
const path = require('path');

const RECIPIENTS = ['9011874112', '8788594766'];
const LOG_FILE_PATH = path.join(__dirname, '..', 'whatsapp_alerts.log');

/**
 * Formats investment details into a professional alert message.
 * @param {Object} investment - Investment document from DB
 * @returns {string} - Formatted message
 */
function formatMaturityMessage(investment) {
  const type = investment.investmentType;
  const accNo = investment.accountNumber;
  const investAmt = investment.investAmount;
  const maturityAmt = investment.maturityAmount;
  const maturityDateStr = new Date(investment.maturityDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const investSuffix = type === 'RD' ? ' per month' : '';

  return `*Investment Maturity Alert - Tanmay Traders*

Dear Admin,
This is an alert that the following investment is maturing tomorrow:

• *Type:* ${type}
• *Account Number:* ${accNo}
• *Invest Amount:* ₹${investAmt.toLocaleString('en-IN')}${investSuffix}
• *Maturity Amount:* ₹${maturityAmt.toLocaleString('en-IN')}
• *Maturity Date:* ${maturityDateStr}

Please make sure to process the maturity request.`;
}

/**
 * Sends a WhatsApp message via Twilio or UltraMsg if configured, falling back to logging.
 * @param {string} to - Recipient number
 * @param {string} message - Message body
 */
async function sendWhatsApp(to, message) {
  const cleanTo = to.startsWith('+') ? to : `+91${to}`; // Assume Indian numbers if no prefix

  // Try UltraMsg provider if configured
  if (process.env.WHATSAPP_PROVIDER === 'ultramsg' || (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_INSTANCE_ID)) {
    const instanceId = process.env.WHATSAPP_INSTANCE_ID;
    const token = process.env.WHATSAPP_TOKEN;
    const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          to: cleanTo,
          body: message
        })
      });
      const data = await response.json();
      if (data.sent === 'true' || data.success) {
        console.log(`[WhatsApp] Alert successfully sent to ${cleanTo} via UltraMsg`);
        return true;
      } else {
        console.error(`[WhatsApp] UltraMsg failed for ${cleanTo}:`, data);
      }
    } catch (err) {
      console.error(`[WhatsApp] UltraMsg error for ${cleanTo}:`, err.message);
    }
  }

  // Try Twilio provider if configured
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER; // e.g. 'whatsapp:+14155238886'
    
    const basicAuth = Buffer.from(`${sid}:${token}`).toString('base64');
    const twilioTo = `whatsapp:${cleanTo}`;
    const twilioFrom = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;

    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: twilioTo,
          From: twilioFrom,
          Body: message
        })
      });
      const data = await response.json();
      if (response.ok) {
        console.log(`[WhatsApp] Alert successfully sent to ${cleanTo} via Twilio`);
        return true;
      } else {
        console.error(`[WhatsApp] Twilio failed for ${cleanTo}:`, data);
      }
    } catch (err) {
      console.error(`[WhatsApp] Twilio error for ${cleanTo}:`, err.message);
    }
  }

  // Fallback / Log Alert to File and Console
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] TO: ${cleanTo}\nMESSAGE:\n${message}\n----------------------------------------\n`;
  
  try {
    fs.appendFileSync(LOG_FILE_PATH, logEntry, 'utf8');
    console.log(`\n=================== WHATSAPP ALERT SENT (SIMULATED) ===================`);
    console.log(`To: ${cleanTo}`);
    console.log(`Message:\n${message}`);
    console.log(`Logged to: ${LOG_FILE_PATH}`);
    console.log(`========================================================================\n`);
  } catch (err) {
    console.error('[WhatsApp] Failed to write to log file:', err.message);
  }
  return true;
}

/**
 * Triggers maturity alert messages for an investment to all designated recipients.
 * @param {Object} investment - The investment document maturing
 */
async function sendMaturityAlerts(investment) {
  const message = formatMaturityMessage(investment);
  console.log(`[WhatsApp] Preparing alerts for Account: ${investment.accountNumber}`);
  
  const results = [];
  for (const number of RECIPIENTS) {
    const success = await sendWhatsApp(number, message);
    results.push({ number, success });
  }
  return results;
}

module.exports = {
  sendWhatsApp,
  sendMaturityAlerts,
  RECIPIENTS
};
