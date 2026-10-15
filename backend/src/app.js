require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { errorHandler } = require('./middleware/errorHandler');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./docs/openapi');

// ── Import Routes ──────────────────────────────────────────
const authRoutes       = require('./routes/authRoutes');
const tokenRoutes      = require('./routes/tokenRoutes');
const queueRoutes      = require('./routes/queueRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const analyticsRoutes  = require('./routes/analyticsRoutes');
const auditRoutes      = require('./routes/auditRoutes');

const app = express();

// Render/Vercel sit in front of this API — without this the rate limiter
// would see the proxy IP and share one bucket across all clients.
app.set('trust proxy', 1);

// ── Global Middleware ──────────────────────────────────────
app.use(helmet());

// Allowed browser origins come from CLIENT_URL (comma-separated).
// Auth uses Bearer tokens, so cookie credentials are not needed.
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false }));

app.use(express.json());           // Parse JSON request bodies
app.use(express.urlencoded({ extended: true }));

// ── Health Check ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Hospital Queue API is running 🏥' });
});

// ── API Documentation ──────────────────────────────────────
// Swagger UI needs inline styles, which the default helmet policy forbids —
// so this one path gets helmet without the content security policy.
app.use(
  '/api/docs',
  helmet({ contentSecurityPolicy: false }),
  swaggerUi.serve,
  swaggerUi.setup(openapi, {
    customSiteTitle: 'Hospital Queue API',
    swaggerOptions: { persistAuthorization: true },
  })
);

// The raw document, for client generators
app.get('/api/docs.json', (req, res) => res.json(openapi));

// ── API Routes ─────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/tokens',      tokenRoutes);
app.use('/api/queue',       queueRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/analytics',   analyticsRoutes);
app.use('/api/audit',       auditRoutes);

// ── 404 Handler ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler (must be last) ───────────────────
app.use(errorHandler);

module.exports = app;
