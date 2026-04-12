require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

// ── Import Routes ──────────────────────────────────────────
const authRoutes       = require('./routes/authRoutes');
const tokenRoutes      = require('./routes/tokenRoutes');
const queueRoutes      = require('./routes/queueRoutes');
const departmentRoutes = require('./routes/departmentRoutes');

// ── Connect to MongoDB ─────────────────────────────────────
connectDB();

const app = express();

// ── Global Middleware ──────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || '*', // Lock down in production
  credentials: true,
}));
app.use(express.json());           // Parse JSON request bodies
app.use(express.urlencoded({ extended: true }));

// ── Health Check ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Hospital Queue API is running 🏥' });
});

// ── API Routes ─────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/tokens',      tokenRoutes);
app.use('/api/queue',       queueRoutes);
app.use('/api/departments', departmentRoutes);

// ── 404 Handler ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler (must be last) ───────────────────
app.use(errorHandler);

module.exports = app;
