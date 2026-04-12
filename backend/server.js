require('dotenv').config();
const http = require('http');
const { WebSocketServer } = require('ws');
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// ── Create HTTP server from Express app ───────────────────
const server = http.createServer(app);

// ── WebSocket Server (for real-time queue updates) ────────
const wss = new WebSocketServer({ server, path: '/ws' });

// Store wss globally so controllers can broadcast to all clients
global.wss = wss;

wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket client connected');

  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Queue live feed connected' }));

  ws.on('close', () => console.log('🔌 WebSocket client disconnected'));
  ws.on('error', (err) => console.error('WebSocket error:', err.message));
});

// ── Broadcast helper — call this from any controller ──────
// Usage: broadcastQueueUpdate({ type: 'QUEUE_UPDATE', data: {...} })
global.broadcastQueueUpdate = (payload) => {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // 1 = OPEN
      client.send(message);
    }
  });
};

// ── Start Server ──────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket ready at ws://localhost:${PORT}/ws`);
  console.log(`🏥 Environment: ${process.env.NODE_ENV || 'development'}`);
});
