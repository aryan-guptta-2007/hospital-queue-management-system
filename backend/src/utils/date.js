/**
 * Hospital days roll over at midnight IST, no matter where the server runs
 * (Render containers are UTC). Everything date-related must go through here.
 */
const IST_TIME_ZONE = 'Asia/Kolkata';

// en-CA formats as YYYY-MM-DD, which is also how serviceDate is stored
const istDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "2026-10-15" — the IST calendar date of the given instant (default: now) */
const getISTDateString = (date = new Date()) => istDateFormatter.format(date);

/** The exact instant the given date's IST day began (IST is UTC+5:30, no DST) */
const getISTStartOfDay = (date = new Date()) => {
  const [year, month, day] = getISTDateString(date).split('-').map(Number);
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  return new Date(Date.UTC(year, month - 1, day) - IST_OFFSET_MS);
};

module.exports = { IST_TIME_ZONE, getISTDateString, getISTStartOfDay };
