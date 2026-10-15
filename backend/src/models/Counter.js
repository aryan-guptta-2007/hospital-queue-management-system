const mongoose = require('mongoose');

/**
 * Atomic sequence counters. One document per department + service date, with
 * _id shaped "<departmentId>:<YYYY-MM-DD>" — a single $inc hands out the next
 * token number without the read-then-write race of counting documents.
 */
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false, timestamps: true }
);

module.exports = mongoose.model('Counter', counterSchema);
