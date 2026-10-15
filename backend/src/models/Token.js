const mongoose = require('mongoose');
const { TOKEN_STATUS } = require('../config/constants');

const tokenSchema = new mongoose.Schema(
  {
    // e.g. "OPD-042" — department code + sequence number
    tokenNumber: {
      type: String,
      required: true,
      // NOT unique — the sequence restarts every day, so "OPD-001" recurs.
      // Uniqueness is enforced per department per service date, see indexes below.
    },
    // Sequence number within the department for this service date (e.g. 42)
    sequenceNumber: {
      type: Number,
      required: true,
    },
    // IST calendar date this token belongs to, "YYYY-MM-DD"
    serviceDate: {
      type: String,
      required: true,
    },
    // Random handle the patient uses to reopen their own status page
    publicCode: {
      type: String,
      required: true,
      // sparse → tokens created before this field existed carry no publicCode
      // and must not collide with each other on the unique index
      index: { unique: true, sparse: true },
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TOKEN_STATUS),
      default: TOKEN_STATUS.WAITING,
    },
    // Priority copied from patient for fast queue sorting (no join needed)
    priority: {
      type: Number,
      required: true,
      default: 1,
    },
    // Position in the queue (recalculated dynamically — stored for reference)
    position: {
      type: Number,
      default: null,
    },
    // Estimated time (minutes) until this patient is called
    estimatedWaitTime: {
      type: Number,
      default: null,
    },
    // The position this token holds in its priority group: arrival time, or
    // the requeue time once it has been skipped and put back. Materialised so
    // every query can sort on one indexed key.
    queuedAt: {
      type: Date,
      default: Date.now,
    },
    // When the patient was told they are near the front. Set once, so a
    // patient is never messaged twice for the same token.
    notifiedAt: { type: Date, default: null },
    // Timestamps for each status change
    requeuedAt: { type: Date, default: null },    // When a skipped token went back
    calledAt: { type: Date, default: null },      // When token was called
    completedAt: { type: Date, default: null },   // When consultation ended
    skippedAt: { type: Date, default: null },     // When patient was skipped
    expiredAt: { type: Date, default: null },     // When token expired
    // Admin note (e.g. reason for emergency insert)
    note: { type: String, default: '' },
  },
  { timestamps: true } // createdAt = token generation time
);

// ── One sequence number per department per service date ───────────
// Partial filter → only documents that actually carry a serviceDate are
// indexed, so pre-existing tokens can't break the index build.
tokenSchema.index(
  { department: 1, serviceDate: 1, sequenceNumber: 1 },
  { unique: true, partialFilterExpression: { serviceDate: { $type: 'string' } } }
);

// ── Compound index: fast queue lookup in exactly the queue's sort order ──
tokenSchema.index({ department: 1, status: 1, priority: -1, queuedAt: 1 });

// ── At most one token may be 'serving' per department ─────────────
// The database, not the controllers, is the last word on this.
tokenSchema.index(
  { department: 1 },
  { unique: true, partialFilterExpression: { status: 'serving' } }
);

// ── Daily sequence resets — index for counting today's tokens ──
tokenSchema.index({ department: 1, createdAt: 1 });

module.exports = mongoose.model('Token', tokenSchema);
