const mongoose = require('mongoose');

/**
 * Who did what to the queue.
 *
 * Written on every staff action that changes a patient's place or the
 * department setup. Append-only: nothing in the application updates or deletes
 * an entry, because a record that can be edited is not a record.
 */
const AUDIT_ACTIONS = {
  CALL_NEXT: 'call_next',
  SKIP: 'skip',
  COMPLETE: 'complete',
  REQUEUE: 'requeue',
  RECALL: 'recall',
  EMERGENCY_INSERT: 'emergency_insert',
  DEPARTMENT_CREATE: 'department_create',
  DEPARTMENT_UPDATE: 'department_update',
};

const auditLogSchema = new mongoose.Schema(
  {
    // Who — never null: an action without an actor is a bug, not an entry
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTIONS),
      required: true,
    },
    // What it was done to. A department change has no token; a token action
    // always carries the department it belonged to.
    token: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Token',
      default: null,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    // Human-readable context, e.g. the token number or what changed
    details: {
      type: String,
      default: '',
      maxlength: 300,
    },
  },
  // createdAt is the timestamp; nothing ever updates an entry
  { timestamps: { createdAt: true, updatedAt: false } }
);

// The log is read newest-first, usually filtered by one of these
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ department: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
module.exports.AUDIT_ACTIONS = AUDIT_ACTIONS;
