const mongoose = require('mongoose');
const { TOKEN_STATUS } = require('../config/constants');

const tokenSchema = new mongoose.Schema(
  {
    // e.g. "OPD-042" — department code + sequence number
    tokenNumber: {
      type: String,
      required: true,
      unique: true,
    },
    // Sequence number within the department for today (e.g. 42)
    sequenceNumber: {
      type: Number,
      required: true,
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
    // Timestamps for each status change
    calledAt: { type: Date, default: null },      // When token was called
    completedAt: { type: Date, default: null },   // When consultation ended
    skippedAt: { type: Date, default: null },     // When patient was skipped
    // Admin note (e.g. reason for emergency insert)
    note: { type: String, default: '' },
  },
  { timestamps: true } // createdAt = token generation time
);

// ── Compound index: fast queue lookup by dept + status + priority ──
tokenSchema.index({ department: 1, status: 1, priority: -1, createdAt: 1 });

// ── Daily sequence resets — index for counting today's tokens ──
tokenSchema.index({ department: 1, createdAt: 1 });

module.exports = mongoose.model('Token', tokenSchema);
