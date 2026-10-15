require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { init: initRealtime } = require('./src/realtime/socket');
const { closeStaleTokens, scheduleDayClose } = require('./src/services/dayClose');

const PORT = process.env.PORT || 5001;

// ── Create HTTP server from Express app ───────────────────
const server = http.createServer(app);

// ── Real-time queue feed ──────────────────────────────────
// Per-department subscriptions + a 30s ping/pong heartbeat.
// Controllers publish through src/realtime/socket.js, not a global.
initRealtime(server);

// ── Start Server ──────────────────────────────────────────
// The database connection lives here, not in app.js, so tests can import the
// app and point it at their own database.
const start = async () => {
  await connectDB();
  await closeStaleTokens();
  scheduleDayClose();

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket ready at ws://localhost:${PORT}/ws`);
    console.log(`🏥 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

start();
