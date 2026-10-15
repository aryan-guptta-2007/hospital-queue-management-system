const { TOKEN_STATUS } = require('../config/constants');
const { createError } = require('../middleware/errorHandler');

/**
 * The only status changes this system allows. Anything that writes a token's
 * status goes through here, so the rules live in exactly one place.
 *
 *   waiting   → serving    (called next)
 *   waiting   → skipped    (patient absent before being called)
 *   serving   → completed  (consultation done)
 *   serving   → skipped    (called, but did not turn up)
 *   skipped   → waiting    (requeued at the end of their priority group)
 *   completed → ∅          (terminal)
 */
const ALLOWED_TRANSITIONS = {
  [TOKEN_STATUS.WAITING]: [TOKEN_STATUS.SERVING, TOKEN_STATUS.SKIPPED],
  [TOKEN_STATUS.SERVING]: [TOKEN_STATUS.COMPLETED, TOKEN_STATUS.SKIPPED],
  [TOKEN_STATUS.SKIPPED]: [TOKEN_STATUS.WAITING],
  [TOKEN_STATUS.COMPLETED]: [],
};

/** Every status a token may legally be in to reach `target` */
const sourceStatusesFor = (target) =>
  Object.keys(ALLOWED_TRANSITIONS).filter((from) => ALLOWED_TRANSITIONS[from].includes(target));

/** `true` if that one step is allowed */
const canTransition = (from, to) => Boolean(ALLOWED_TRANSITIONS[from]?.includes(to));

/**
 * Mongo filter fragment for a status-guarded update into `target`.
 * Used as `findOneAndUpdate({ _id, status: statusGuard('completed') }, ...)` —
 * if the token has moved on, the update matches nothing instead of
 * overwriting a state somebody else just set.
 */
const statusGuard = (target) => {
  const sources = sourceStatusesFor(target);

  if (sources.length === 0) {
    throw new Error(`No transition leads to status "${target}"`);
  }

  return sources.length === 1 ? sources[0] : { $in: sources };
};

/**
 * 409 for "this token moved on before the request landed". Reports the status
 * actually found, so the staff screen can say something useful.
 */
const transitionConflict = (target, token) => {
  const expected = sourceStatusesFor(target).join(' or ');
  const label = token?.tokenNumber ? `Token ${token.tokenNumber}` : 'That token';
  const actual = token ? `is already "${token.status}"` : 'no longer exists';

  return createError(
    `${label} ${actual} and cannot be moved to "${target}" (expected ${expected}). Queue changed, please refresh.`,
    409
  );
};

/** 409 for "what you were looking at is not what the queue holds now" */
const queueChangedConflict = () => createError('Queue changed, please refresh', 409);

module.exports = {
  ALLOWED_TRANSITIONS,
  sourceStatusesFor,
  canTransition,
  statusGuard,
  transitionConflict,
  queueChangedConflict,
};
