/**
 * Shapes tokens for anywhere unauthenticated eyes can reach: the waiting-room
 * display board, a patient's own status page, and the WebSocket feed (which
 * any browser can open).
 *
 * Patient age, phone and ObjectIds never leave the building through these.
 */

/** "Rahul Sharma" → "Rahul S."  ·  "Rahul" → "Rahul"  ·  "" → "Patient" */
const maskPatientName = (fullName) => {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return 'Patient';

  const [first, ...rest] = parts;
  const surname = rest[rest.length - 1];

  return surname ? `${first} ${surname[0].toUpperCase()}.` : first;
};

/**
 * The only token fields a public caller gets.
 *
 * @param {Object} token    Token document or plain object (patient populated)
 * @param {Object} [extra]  { position, estimatedWaitTime, estimatedWaitRange }
 */
const toPublicToken = (token, extra = {}) => {
  if (!token) return null;

  const doc = typeof token.toObject === 'function' ? token.toObject() : token;

  const view = {
    tokenNumber: doc.tokenNumber,
    status: doc.status,
    // Priority is a queue attribute (1–3), not personal data — the patient's
    // own status page and the staff badge both read it
    priority: doc.priority,
    patient: { name: maskPatientName(doc.patient?.name) },
  };

  // Only present when the caller populated it
  if (doc.department?.name) {
    view.department = {
      // Not a patient id — the department list is public anyway, and the
      // status page needs it to subscribe to that department's live feed
      id: String(doc.department._id),
      name: doc.department.name,
      code: doc.department.code,
    };
  }

  if ('position' in extra) view.position = extra.position ?? null;
  if ('estimatedWaitTime' in extra) view.estimatedWaitTime = extra.estimatedWaitTime ?? null;
  if ('estimatedWaitRange' in extra) view.estimatedWaitRange = extra.estimatedWaitRange ?? null;

  return view;
};

module.exports = { maskPatientName, toPublicToken };
