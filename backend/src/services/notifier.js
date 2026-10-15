const Token = require('../models/Token');
const { TOKEN_STATUS } = require('../config/constants');
const { getWaitingQueue } = require('./queueService');

/**
 * Patient notifications.
 *
 * Two jobs, kept apart:
 *   - sendSms(): the transport, swapped by SMS_PROVIDER
 *   - notifyApproachingPatients(): decides who is due a message
 *
 * The default provider only writes to the log, so a development machine never
 * sends a real message — and never needs credentials to run.
 */

/** A patient this close to the front gets told. 3 by default. */
const NOTIFY_AT_POSITION = Number(process.env.NOTIFY_AT_POSITION) || 3;

const INDIAN_COUNTRY_CODE = '91';

/** 10 local digits for an Indian mobile, however it was typed */
const localDigits = (phone) =>
  String(phone || '')
    .replace(/[\s\-()]/g, '')
    .replace(/^(\+?91|0)/, '');

const toE164 = (phone) => `+${INDIAN_COUNTRY_CODE}${localDigits(phone)}`;

// ── Providers ──────────────────────────────────────────────

const consoleProvider = {
  name: 'console',
  isConfigured: () => true,
  send: async (to, message) => {
    console.log(`📱 [sms:console] → ${toE164(to)} :: ${message}`);
    return { provider: 'console', to: toE164(to), delivered: true };
  },
};

const twilioProvider = {
  name: 'twilio',
  isConfigured: () =>
    Boolean(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM
    ),
  send: async (to, message) => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: toE164(to),
          From: process.env.TWILIO_FROM,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Twilio responded ${response.status}: ${await response.text()}`);
    }

    const body = await response.json();

    return { provider: 'twilio', to: toE164(to), delivered: true, id: body.sid };
  },
};

const msg91Provider = {
  name: 'msg91',
  isConfigured: () => Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID),
  /**
   * Indian carriers only accept DLT-registered templates, so the message body
   * itself lives in the MSG91 console and this fills its variables.
   * The template is expected to take ##token##, ##position## and ##department##.
   */
  send: async (to, message, variables = {}) => {
    const response = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        authkey: process.env.MSG91_AUTH_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: process.env.MSG91_TEMPLATE_ID,
        short_url: '0',
        recipients: [
          {
            mobiles: `${INDIAN_COUNTRY_CODE}${localDigits(to)}`,
            token: variables.tokenNumber ?? '',
            position: String(variables.position ?? ''),
            department: variables.departmentName ?? '',
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`MSG91 responded ${response.status}: ${await response.text()}`);
    }

    return { provider: 'msg91', to: `${INDIAN_COUNTRY_CODE}${localDigits(to)}`, delivered: true };
  },
};

const PROVIDERS = {
  console: consoleProvider,
  twilio: twilioProvider,
  msg91: msg91Provider,
};

let warnedAboutFallback = false;

/**
 * The provider named by SMS_PROVIDER, or the console one. A provider that is
 * selected but not configured falls back rather than throwing on every send —
 * a missing credential must not stop the queue from running.
 */
const resolveProvider = () => {
  const requested = (process.env.SMS_PROVIDER || 'console').toLowerCase();
  const provider = PROVIDERS[requested];

  if (!provider) {
    if (!warnedAboutFallback) {
      console.warn(`⚠️  Unknown SMS_PROVIDER "${requested}" — falling back to console`);
      warnedAboutFallback = true;
    }
    return consoleProvider;
  }

  if (!provider.isConfigured()) {
    if (!warnedAboutFallback) {
      console.warn(
        `⚠️  SMS_PROVIDER "${requested}" is missing credentials — falling back to console`
      );
      warnedAboutFallback = true;
    }
    return consoleProvider;
  }

  return provider;
};

/**
 * Sends one message through the configured provider.
 *
 * @param {String} to        Indian mobile number, however it was typed
 * @param {String} message   Full text (ignored by template-based providers)
 * @param {Object} [variables] Template variables for providers that need them
 */
const sendSms = (to, message, variables) => resolveProvider().send(to, message, variables);

// ── Deciding who to tell ───────────────────────────────────

const buildMessage = ({ tokenNumber, position, departmentName }) =>
  `Hospital Queue: token ${tokenNumber} is number ${position} in the queue` +
  `${departmentName ? ` for ${departmentName}` : ''}. ` +
  'Please reach the waiting area.';

/**
 * Tells any patient who has reached the front of a department's queue, once.
 *
 * Called after anything that can move the queue along. Position is worked out
 * from the live queue rather than stored, so this is the only place that knows
 * a patient has moved up.
 *
 * A patient is messaged when all of these hold:
 *   - they are within the first NOTIFY_AT_POSITION of the waiting queue
 *   - they gave a phone number
 *   - they have not been messaged before (Token.notifiedAt)
 *
 * The flag is claimed with a guarded update before the message is sent, so two
 * simultaneous queue changes cannot both message the same patient. That makes
 * this at-most-once: a send that fails is logged, not retried, because a
 * duplicate SMS is worse than a missing one.
 *
 * @returns {Promise<Array>} one entry per message actually sent
 */
const notifyApproachingPatients = async (departmentId) => {
  const queue = await getWaitingQueue(departmentId);
  const sent = [];

  for (const [index, token] of queue.slice(0, NOTIFY_AT_POSITION).entries()) {
    const phone = token.patient?.phone?.trim();
    if (!phone) continue;

    // Claim the right to notify before doing it
    const claimed = await Token.findOneAndUpdate(
      { _id: token._id, notifiedAt: null, status: TOKEN_STATUS.WAITING },
      { notifiedAt: new Date() }
    );

    if (!claimed) continue;

    const details = {
      tokenNumber: token.tokenNumber,
      position: index + 1,
      departmentName: token.department?.name,
    };

    try {
      const result = await sendSms(phone, buildMessage(details), details);
      sent.push({ ...details, ...result });
    } catch (err) {
      console.error(`❌ Could not notify token ${token.tokenNumber}: ${err.message}`);
    }
  }

  return sent;
};

/**
 * Fire-and-forget wrapper for controllers: a patient notification must never
 * delay or fail the staff member's request.
 */
const notifyApproachingPatientsInBackground = (departmentId) => {
  notifyApproachingPatients(departmentId).catch((err) =>
    console.error(`❌ Notification sweep failed: ${err.message}`)
  );
};

module.exports = {
  NOTIFY_AT_POSITION,
  sendSms,
  buildMessage,
  notifyApproachingPatients,
  notifyApproachingPatientsInBackground,
};
