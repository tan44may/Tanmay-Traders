/**
 * Notification Service for Tanmay Traders
 * Sends Cash Calculator / Denomination Summary to target phone numbers
 * via WhatsApp or SMS without any client-side redirection.
 */

// Target phone numbers specified by the user
const DEFAULT_RECIPIENTS = ['9011874112', '8788594766'];

/**
 * Format date string from YYYY-MM-DD to DD/MM/YYYY
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

/**
 * Format currency in Indian numbering system with 2 decimals
 */
const formatINR = (val) => {
  const num = Number(val || 0);
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Build rich WhatsApp text with markdown formatting and emojis
 */
const buildWhatsAppMessage = ({ date, counts, totalNotes, totalAmount, cashbookBalance, isMatched, remarks }) => {
  const formattedDate = formatDate(date);
  const diff = Number(totalAmount || 0) - Number(cashbookBalance || 0);

  const denomOrder = [500, 200, 100, 50, 20, 10, 5, 2, 1];
  const denomLines = [];
  denomOrder.forEach(d => {
    const count = counts ? Number(counts[d] || 0) : 0;
    if (count > 0) {
      const subtotal = d * count;
      denomLines.push(`• ₹ ${d} : ${count} = ₹ ${formatINR(subtotal)}`);
    }
  });

  const lines = [
    `📊 *TANMAY TRADERS - दैनिक रोकड मोजणी*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📅 *दिनांक (Date):* ${formattedDate}`,
    ``,
    `💵 *कॅशबुक शिल्लक:* ₹ ${formatINR(cashbookBalance)}`,
    `💰 *प्रत्यक्ष रोकड:* ₹ ${formatINR(totalAmount)}`,
    `⚡ *स्थिती:* ${isMatched ? '✅ रोकड जुळली (MATCHED)' : `⚠️ फरक: ₹ ${formatINR(Math.abs(diff))} (${diff > 0 ? 'जादा रोकड' : 'कमी रोकड'})`}`,
    `🔢 *एकूण नोटा:* ${totalNotes || 0}`
  ];

  if (denomLines.length > 0) {
    lines.push(``, `📝 *नोटांचा तपशील (Breakdown):*`, ...denomLines);
  }

  if (remarks && remarks.trim()) {
    lines.push(``, `📌 *शेरा (Remarks):* ${remarks.trim()}`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  return lines.join('\n');
};

/**
 * Build clean SMS text (optimized for standard cellular SMS networks)
 */
const buildSmsMessage = ({ date, counts, totalNotes, totalAmount, cashbookBalance, isMatched, remarks }) => {
  const formattedDate = formatDate(date);
  const diff = Number(totalAmount || 0) - Number(cashbookBalance || 0);

  const denomOrder = [500, 200, 100, 50, 20, 10, 5, 2, 1];
  const denomShort = [];
  denomOrder.forEach(d => {
    const count = counts ? Number(counts[d] || 0) : 0;
    if (count > 0) {
      denomShort.push(`${d}x${count}`);
    }
  });

  const statusText = isMatched ? 'MATCHED' : `DIFF: Rs. ${formatINR(Math.abs(diff))}`;
  
  const lines = [
    `TANMAY TRADERS - CASH SUMMARY`,
    `Date: ${formattedDate}`,
    `Cashbook: Rs. ${formatINR(cashbookBalance)}`,
    `Physical: Rs. ${formatINR(totalAmount)}`,
    `Status: ${statusText}`,
    `Notes: ${totalNotes || 0} (${denomShort.join(', ') || 'None'})`
  ];

  if (remarks && remarks.trim()) {
    lines.push(`Remarks: ${remarks.trim()}`);
  }

  return lines.join('\n');
};

/**
 * Dispatch message via WhatsApp
 */
const dispatchWhatsApp = async (recipients, message) => {
  // Option 1: UltraMsg WhatsApp API
  if (process.env.ULTRAMSG_INSTANCE_ID && process.env.ULTRAMSG_TOKEN) {
    const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
    const token = process.env.ULTRAMSG_TOKEN;
    const results = [];

    for (const num of recipients) {
      const cleanNum = num.replace(/\D/g, '');
      const to = cleanNum.startsWith('91') ? cleanNum : `91${cleanNum}`;
      const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token,
          to,
          body: message
        })
      });
      const data = await res.json();
      results.push({ recipient: num, response: data });
    }
    return { success: true, channel: 'whatsapp_ultramsg', results };
  }

  // Option 2: Twilio WhatsApp
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const from = process.env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
      ? process.env.TWILIO_WHATSAPP_NUMBER
      : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
    const results = [];

    for (const num of recipients) {
      const cleanNum = num.replace(/\D/g, '');
      const to = `whatsapp:+91${cleanNum.replace(/^91/, '')}`;
      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: from,
          To: to,
          Body: message
        })
      });
      const data = await res.json();
      results.push({ recipient: num, response: data });
    }
    return { success: true, channel: 'whatsapp_twilio', results };
  }

  // Option 3: Meta WhatsApp Cloud API
  if (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
    const results = [];

    for (const num of recipients) {
      const cleanNum = num.replace(/\D/g, '');
      const to = cleanNum.startsWith('91') ? cleanNum : `91${cleanNum}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message }
        })
      });
      const data = await res.json();
      results.push({ recipient: num, response: data });
    }
    return { success: true, channel: 'whatsapp_meta', results };
  }

  // Option 4: Custom WhatsApp Webhook
  if (process.env.WHATSAPP_WEBHOOK_URL) {
    const res = await fetch(process.env.WHATSAPP_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipients, message })
    });
    const data = await res.json();
    return { success: true, channel: 'whatsapp_webhook', response: data };
  }

  // Option 5: CallMeBot Free WhatsApp API (https://www.callmebot.com)
  if (process.env.CALLMEBOT_API_KEY || process.env.CALLMEBOT_API_KEY_9011874112 || process.env.CALLMEBOT_API_KEY_8788594766) {
    const results = [];
    for (const num of recipients) {
      const cleanNum = num.replace(/\D/g, '').replace(/^91/, '');
      const key = process.env[`CALLMEBOT_API_KEY_${cleanNum}`] || process.env.CALLMEBOT_API_KEY;
      if (key) {
        const fullPhone = `91${cleanNum}`;
        const encodedText = encodeURIComponent(message);
        const url = `https://api.callmebot.com/whatsapp.php?phone=${fullPhone}&text=${encodedText}&apikey=${key}`;
        try {
          const res = await fetch(url);
          const text = await res.text();
          results.push({ recipient: num, response: text });
        } catch (err) {
          console.error(`[NOTIFICATION] CallMeBot error for ${num}:`, err.message);
        }
      }
    }
    if (results.length > 0) {
      return { success: true, channel: 'whatsapp_callmebot', results };
    }
  }

  // No WhatsApp provider configured
  return { success: false, reason: 'No WhatsApp provider credentials configured in environment' };
};

/**
 * Dispatch message via SMS
 */
const dispatchSMS = async (recipients, message) => {
  // Option 1: Fast2SMS (Indian SMS Gateway)
  const fast2SmsKey = process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY;
  if (fast2SmsKey) {
    const rawNumbers = recipients.map(n => n.replace(/\D/g, '').replace(/^91/, '')).join(',');
    const url = 'https://www.fast2sms.com/dev/bulkV2';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': fast2SmsKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'q',
        message: message,
        language: 'english',
        flash: 0,
        numbers: rawNumbers
      })
    });
    const data = await res.json();
    console.log('[NOTIFICATION] Fast2SMS API response:', data);
    return {
      success: data.return === true,
      channel: 'sms_fast2sms',
      response: data,
      error: data.return === false ? (Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'Fast2SMS returned false')) : null
    };
  }

  // Option 2: Twilio SMS
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const from = process.env.TWILIO_PHONE_NUMBER;
    const results = [];

    for (const num of recipients) {
      const cleanNum = num.replace(/\D/g, '');
      const to = `+91${cleanNum.replace(/^91/, '')}`;
      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: from,
          To: to,
          Body: message
        })
      });
      const data = await res.json();
      results.push({ recipient: num, response: data });
    }
    return { success: true, channel: 'sms_twilio', results };
  }

  // Option 3: Custom SMS Webhook / Local Gateway
  if (process.env.SMS_WEBHOOK_URL) {
    const res = await fetch(process.env.SMS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipients, message })
    });
    const data = await res.json();
    return { success: true, channel: 'sms_webhook', response: data };
  }

  return { success: false, reason: 'No SMS provider credentials configured in environment' };
};

/**
 * Primary function: Sends Cash Summary to 9011874112 & 8788594766
 * Prioritizes WhatsApp; falls back to SMS if WhatsApp is not configured or fails.
 */
const sendCashSummaryNotification = async (payload) => {
  const recipients = process.env.NOTIFICATION_NUMBERS 
    ? process.env.NOTIFICATION_NUMBERS.split(',').map(s => s.trim()) 
    : DEFAULT_RECIPIENTS;

  const waMessage = buildWhatsAppMessage(payload);
  const smsMessage = buildSmsMessage(payload);

  console.log('----------------------------------------------------');
  console.log(`[NOTIFICATION] Dispatching Note Summary to: ${recipients.join(', ')}`);
  console.log(`[NOTIFICATION] Date: ${payload.date} | Total: ₹${payload.totalAmount} | Balance: ₹${payload.cashbookBalance}`);
  console.log('----------------------------------------------------');

  let whatsappAttempt = null;
  try {
    whatsappAttempt = await dispatchWhatsApp(recipients, waMessage);
  } catch (err) {
    console.error('[NOTIFICATION] WhatsApp dispatch error:', err.message);
    whatsappAttempt = { success: false, error: err.message };
  }

  if (whatsappAttempt && whatsappAttempt.success) {
    console.log(`[NOTIFICATION] WhatsApp successfully delivered via ${whatsappAttempt.channel}`);
    return {
      sent: true,
      channel: 'whatsapp',
      recipients,
      details: `WhatsApp delivered via ${whatsappAttempt.channel}`,
      formattedSummary: waMessage
    };
  }

  // If WhatsApp was not configured or failed, attempt SMS
  let smsAttempt = null;
  try {
    smsAttempt = await dispatchSMS(recipients, smsMessage);
  } catch (err) {
    console.error('[NOTIFICATION] SMS dispatch error:', err.message);
    smsAttempt = { success: false, error: err.message };
  }

  if (smsAttempt && smsAttempt.success) {
    console.log(`[NOTIFICATION] SMS successfully delivered via ${smsAttempt.channel}`);
    return {
      sent: true,
      channel: 'sms',
      recipients,
      details: `SMS delivered via ${smsAttempt.channel}`,
      formattedSummary: smsMessage
    };
  }

  // If SMS attempt failed with a specific reason from the gateway
  if (smsAttempt && smsAttempt.channel) {
    const errorDetail = smsAttempt.error 
      || (smsAttempt.response && (smsAttempt.response.message || JSON.stringify(smsAttempt.response)))
      || 'Unknown gateway error';
    
    console.error(`❌ [NOTIFICATION] ${smsAttempt.channel} dispatch failed:`, errorDetail);
    return {
      sent: false,
      channel: smsAttempt.channel,
      recipients,
      details: errorDetail,
      formattedSummary: smsMessage
    };
  }

  // When no 3rd-party provider key is in .env yet, safely log the message
  console.log('⚠️ [NOTIFICATION] Note summary saved & formatted, but NOT dispatched to phone towers because no SMS/WhatsApp API key is set in .env yet.');
  console.log('----------------------------------------------------');
  console.log(smsMessage);
  console.log('----------------------------------------------------');
  console.log('👉 [HOW TO RECEIVE REAL SMS ON PHONE]:');
  console.log('   1. Create an account at https://www.fast2sms.com');
  console.log('   2. Add to "Tanmay Traders/.env": FAST2SMS_API_KEY=your_key_here');
  console.log('   3. Restart "node server.js". Real SMS will be delivered directly to 9011874112 & 8788594766.');
  console.log('----------------------------------------------------');

  return {
    sent: false,
    channel: 'logged',
    recipients,
    details: 'Summary generated & logged. Configure FAST2SMS_API_KEY or WhatsApp in .env for live mobile delivery.',
    formattedSummary: smsMessage
  };
};

module.exports = {
  DEFAULT_RECIPIENTS,
  sendCashSummaryNotification,
  buildWhatsAppMessage,
  buildSmsMessage
};

