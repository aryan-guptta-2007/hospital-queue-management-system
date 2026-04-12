const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      unique: true,
      // e.g. "Cardiology", "OPD", "Ortho"
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      uppercase: true,
      trim: true,
      unique: true,
      // e.g. "CARD", "OPD", "ORTH" — used as token prefix
    },
    // Average time (minutes) a doctor spends per patient
    // Used for waiting time calculation
    avgConsultationTime: {
      type: Number,
      default: 10,
      min: [1, 'Consultation time must be at least 1 minute'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
