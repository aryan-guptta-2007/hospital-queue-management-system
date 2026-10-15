const { z } = require('zod');
const { personName, email } = require('./common');

const newPassword = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password must be at most 128 characters');

// POST /api/auth/register  (admin only)
const register = {
  body: z.object({
    name: personName,
    email,
    password: newPassword,
    role: z.enum(['admin', 'staff']).optional(),
  }),
};

// POST /api/auth/login — no length rule here, a wrong password is a 401
const login = {
  body: z.object({
    email,
    password: z.string().min(1, 'Password is required'),
  }),
};

// PATCH /api/auth/change-password
const changePassword = {
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword,
  }),
};

module.exports = { register, login, changePassword };
