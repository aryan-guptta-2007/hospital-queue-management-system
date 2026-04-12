const mongoose = require('mongoose');
const { PRIORITY } = require('../config/constants');

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      // Stored for optional SMS notifications in future
    },
    age: {
      type: Number,
      min: 0,
      max: 150,
      default: null,
    },
    // Priority is automatically set based on age or emergency flag
    // Emergency (3) > Senior ≥60 (2) > Normal (1)
    priority: {
      type: Number,
      enum: [PRIORITY.NORMAL, PRIORITY.SENIOR, PRIORITY.EMERGENCY],
      default: PRIORITY.NORMAL,
    },
    // Flag set manually by admin to insert emergency patient
    isEmergency: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ── Auto-assign priority based on age before saving ───────
patientSchema.pre('save', function (next) {
  if (this.isEmergency) {
    this.priority = PRIORITY.EMERGENCY;
  } else if (this.age !== null && this.age >= 60) {
    // Senior citizens get elevated priority automatically
    this.priority = PRIORITY.SENIOR;
  } else {
    this.priority = PRIORITY.NORMAL;
  }
  next();
});

// ── Virtual: human-readable priority label ────────────────
patientSchema.virtual('priorityLabel').get(function () {
  const labels = { 3: 'Emergency', 2: 'Senior Citizen', 1: 'Normal' };
  return labels[this.priority] || 'Normal';
});

patientSchema.set('toJSON', { virtuals: true });
patientSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Patient', patientSchema);
