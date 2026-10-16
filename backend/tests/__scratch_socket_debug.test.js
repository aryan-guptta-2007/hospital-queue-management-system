const http = require('http');
const { WebSocket } = require('ws');
const { init } = require('../src/realtime/socket');

describe('socket debug', () => {
  it('reports exactly what happens when a client connects', async () => {
    const server = http.createServer();
    const wss = init(server);

    await new Promise((resolve) => server.listen(0, resolve));
    const { port, address, family } = server.address();
    console.log('listening on', { port, address, family });
    console.log('wss path:', wss?.options?.path, '| maxPayload:', wss?.options?.maxPayload);

    let upgradeSeen = false;
    server.on('upgrade', (req) => {
      upgradeSeen = true;
      console.log('upgrade request for', req.url);
    });

    const outcome = await new Promise((resolve) => {
      const ws = new WebSocket(`ws://localhost:${port}/ws`);
      ws.on('open', () => resolve('open'));
      ws.on('error', (err) => resolve('error: ' + err.message));
      ws.on('unexpected-response', (_req, res) => resolve('unexpected-response ' + res.statusCode));
      setTimeout(() => resolve('TIMED OUT after 8s, readyState=' + ws.readyState), 8000);
    });

    console.log('client outcome:', outcome, '| upgrade seen:', upgradeSeen);

    await new Promise((resolve) => server.close(resolve));
    expect(outcome).toBe('open');
  }, 20000);
});
