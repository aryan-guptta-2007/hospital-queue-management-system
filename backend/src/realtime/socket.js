const { WebSocketServer, WebSocket } = require('ws');

/**
 * Real-time queue feed.
 *
 * A client connects to /ws and then asks for the departments it cares about:
 *   → { "type": "SUBSCRIBE",   "departmentId": "<id>" }
 *   → { "type": "UNSUBSCRIBE", "departmentId": "<id>" }
 *
 * Only that department's events reach it, so a display board in Cardiology is
 * not woken by every token issued in OPD.
 */

const HEARTBEAT_INTERVAL_MS = 30_000;

// Mirrors the objectId rule in src/validators/common.js
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

/** departmentId → Set<WebSocket> */
const subscriptions = new Map();

let wss = null;
let heartbeat = null;

const subscribe = (ws, departmentId) => {
  const id = String(departmentId || '');
  if (!OBJECT_ID.test(id)) return false;

  if (!subscriptions.has(id)) subscriptions.set(id, new Set());
  subscriptions.get(id).add(ws);
  ws.departments.add(id);

  return true;
};

const unsubscribe = (ws, departmentId) => {
  const id = String(departmentId || '');
  const sockets = subscriptions.get(id);

  if (sockets) {
    sockets.delete(ws);
    if (sockets.size === 0) subscriptions.delete(id);
  }

  ws.departments.delete(id);
};

/** Drop a socket from every department it had subscribed to */
const forget = (ws) => {
  ws.departments?.forEach((id) => {
    const sockets = subscriptions.get(id);
    if (!sockets) return;
    sockets.delete(ws);
    if (sockets.size === 0) subscriptions.delete(id);
  });
  ws.departments?.clear();
};

const send = (ws, payload) => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
};

const handleMessage = (ws, raw) => {
  let message;

  try {
    message = JSON.parse(raw.toString());
  } catch {
    return; // Malformed frames are ignored, never fatal
  }

  if (!message || typeof message !== 'object') return;

  if (message.type === 'SUBSCRIBE') {
    const ok = subscribe(ws, message.departmentId);
    send(ws, {
      type: ok ? 'SUBSCRIBED' : 'SUBSCRIBE_REJECTED',
      departmentId: message.departmentId,
      ...(ok ? {} : { message: 'departmentId must be a valid id' }),
    });
    return;
  }

  if (message.type === 'UNSUBSCRIBE') {
    unsubscribe(ws, message.departmentId);
    send(ws, { type: 'UNSUBSCRIBED', departmentId: message.departmentId });
  }
};

/**
 * Attaches the WebSocket server to the HTTP server and starts the heartbeat.
 * @param {import('http').Server} server
 */
const init = (server) => {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.departments = new Set();
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    send(ws, { type: 'CONNECTED', message: 'Queue live feed connected' });

    ws.on('message', (raw) => handleMessage(ws, raw));
    ws.on('close', () => forget(ws));
    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
      forget(ws);
    });
  });

  // A client that vanishes (phone asleep, tab closed by the OS) never sends a
  // close frame, so prune anything that stops answering pings.
  heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        forget(ws);
        ws.terminate();
        return;
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);

  // Never hold the process open just for the heartbeat
  if (typeof heartbeat.unref === 'function') heartbeat.unref();

  wss.on('close', () => clearInterval(heartbeat));

  return wss;
};

/**
 * Sends a payload to every socket subscribed to that department.
 * Safe to call when no socket server is running (seeders, tests).
 *
 * @param {String|Object} departmentId
 * @param {Object} payload  e.g. { type: 'NEXT_TOKEN', data: {...} }
 * @returns {Number} how many sockets it reached
 */
const broadcast = (departmentId, payload = {}) => {
  const id = String(departmentId || '');
  const sockets = subscriptions.get(id);

  if (!sockets || sockets.size === 0) return 0;

  const message = JSON.stringify({ ...payload, departmentId: id });
  let delivered = 0;

  sockets.forEach((ws) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(message);
    delivered += 1;
  });

  return delivered;
};

/** Stops the heartbeat and closes the server — used on shutdown and in tests */
const close = () => {
  clearInterval(heartbeat);
  subscriptions.clear();

  return new Promise((resolve) => {
    if (!wss) return resolve();
    wss.close(() => {
      wss = null;
      resolve();
    });
  });
};

module.exports = { init, broadcast, close, HEARTBEAT_INTERVAL_MS };
