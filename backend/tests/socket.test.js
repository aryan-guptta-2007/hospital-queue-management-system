const http = require('http');
const { WebSocket } = require('ws');
const { init, close } = require('../src/realtime/socket');

describe('realtime socket server', () => {
  let server;
  let port;

  beforeAll((done) => {
    server = http.createServer();
    init(server);
    server.listen(0, () => {
      port = server.address().port;
      done();
    });
  });

  afterAll(async () => {
    await close();
    await new Promise((resolve) => server.close(resolve));
  });

  const createClient = () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${port}/ws`);
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  };

  const waitForMessage = (ws) => {
    return new Promise((resolve) => {
      ws.once('message', (raw) => {
        resolve(JSON.parse(raw.toString()));
      });
    });
  };

  it('sends CONNECTED greeting upon connection', async () => {
    const ws = await createClient();
    const greeting = await waitForMessage(ws);
    expect(greeting).toEqual({
      type: 'CONNECTED',
      message: 'Queue live feed connected',
    });
    ws.close();
  });

  it('rejects subscribe with invalid departmentId', async () => {
    const ws = await createClient();
    await waitForMessage(ws); // consume greeting

    ws.send(JSON.stringify({ type: 'SUBSCRIBE', departmentId: 'bad-id' }));
    const reply = await waitForMessage(ws);

    expect(reply).toEqual({
      type: 'SUBSCRIBE_REJECTED',
      departmentId: 'bad-id',
      message: 'departmentId must be a valid id',
    });
    ws.close();
  });

  it('caps department subscriptions at 20 per connection', async () => {
    const ws = await createClient();
    await waitForMessage(ws); // consume greeting

    // Subscribe to 20 valid distinct ObjectIds
    for (let i = 1; i <= 20; i++) {
      const deptId = i.toString(16).padStart(24, '0');
      ws.send(JSON.stringify({ type: 'SUBSCRIBE', departmentId: deptId }));
      const res = await waitForMessage(ws);
      expect(res).toEqual({
        type: 'SUBSCRIBED',
        departmentId: deptId,
      });
    }

    // Subscribing to an existing department again still succeeds
    const existingDeptId = (1).toString(16).padStart(24, '0');
    ws.send(JSON.stringify({ type: 'SUBSCRIBE', departmentId: existingDeptId }));
    const reSub = await waitForMessage(ws);
    expect(reSub).toEqual({
      type: 'SUBSCRIBED',
      departmentId: existingDeptId,
    });

    // 21st department subscription is rejected
    const extraDeptId = (21).toString(16).padStart(24, '0');
    ws.send(JSON.stringify({ type: 'SUBSCRIBE', departmentId: extraDeptId }));
    const rejected = await waitForMessage(ws);
    expect(rejected).toEqual({
      type: 'SUBSCRIBE_REJECTED',
      departmentId: extraDeptId,
      message: 'Maximum 20 department subscriptions allowed per connection',
    });

    ws.close();
  });

  it('enforces maxPayload 4096 bytes and closes connection when exceeded', async () => {
    const ws = await createClient();
    await waitForMessage(ws); // consume greeting

    const closePromise = new Promise((resolve) => {
      ws.on('close', (code) => resolve(code));
    });

    // Send a payload exceeding 4096 bytes
    const hugePayload = JSON.stringify({
      type: 'SUBSCRIBE',
      departmentId: '0'.repeat(24),
      padding: 'x'.repeat(5000),
    });
    ws.send(hugePayload);

    const closeCode = await closePromise;
    // ws protocol code 1009 is 'Message Too Big'
    expect(closeCode).toBe(1009);
  });
});
