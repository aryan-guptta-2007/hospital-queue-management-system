const { z } = require('zod');

/** 24-character hex Mongo ObjectId — rejects junk before it reaches Mongoose */
const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid id');

/** Patient or staff name: 2–80 characters */
const personName = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(80, 'Name must be at most 80 characters');

/** Email, stored lowercase like the User model expects */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Must be a valid email address');

/**
 * Optional Indian mobile number. Spaces, dashes, brackets and a leading +91
 * or 0 are stripped first, then exactly 10 digits starting 6–9 are required.
 * An empty string means "not given" — the Patient model stores that as ''.
 */
const indianMobile = z
  .preprocess(
    (value) =>
      typeof value === 'string'
        ? value.replace(/[\s\-()]/g, '').replace(/^(\+?91|0)/, '')
        : value,
    z.union([
      z.literal(''),
      z.string().regex(/^[6-9]\d{9}$/, 'Phone must be a 10-digit Indian mobile number'),
    ])
  )
  .nullish();

/** Optional age in whole years, 0–120. '' is treated as "not given". */
const age = z
  .preprocess(
    (value) => {
      if (value === '') return undefined;
      return typeof value === 'string' ? Number(value) : value;
    },
    z
      .number()
      .int('Age must be a whole number')
      .min(0, 'Age must be 0 or more')
      .max(120, 'Age must be 120 or less')
      .optional()
  )
  .nullish();

module.exports = { objectId, personName, email, indianMobile, age };
