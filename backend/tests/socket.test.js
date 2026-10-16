const http = require('http');
const { WebSocket } = require('ws');
const { init, close, MAX_SUBSCRIPTIONS_PER_SOCKET } = require('../src/realtime/socket');

describe('realtime socket server', () => {
  let server;
  let port;
  const openClients = new Set();

  beforeAll((done) => {
    server = http.createServer();
    init(server);
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      done();
    });
  });

  afterEach(() => {
    // A failed assertion must not leave a socket open and hang afterAll
    openClients.forEach((ws) => ws.terminate());
    openClients.clear();
  });

  afterAll(async () => {
    await close();
    await new Promise((resolve) => server.close(resolve));
  });

  /**
   * Opens a client that queues every message from the moment it is created.
   *
   * The server greets on connection, and that frame often arrives in the same
   * packet as the handshake, so 'message' fires right after 'open' — before
   * an `await` on the open promise resumes. A listener attached after the
   * await would miss the greeting and wait forever.
   */
  const createClient = () =>
    new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      const queue = [];
      const waiters = [];

      ws.on('message', (raw) => {
        const message = JSON.parse(raw.toString());
        const waiter = waiters.shift();
        if (waiter) waiter(message);
        else queue.push(message);
      });

      ws.nextMessage = () =>
        queue.length > 0 ? Promise.resolve(queue.shift()) : new Promise((res) => waiters.push(res));

      openClients.add(ws);
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });

  it('sends CONNECTED greeting upon connection', async () => {
    const ws = await createClient();

    expect(await ws.nextMessage()).toEqual({
      type: 'CONNECTED',
      message: 'Queue live feed connected',
    });
  });

  it('rejects subscribe with invalid departmentId', async () => {
    const ws = await createClient();
    await ws.nextMessage(); // greeting

    ws.send(JSON.stringify({ type: 'SUBSCRIBE', departmentId: 'bad-id' }));

    expect(await ws.nextMessage()).toEqual({
      type: 'SUBSCRIBE_REJECTED',
      departmentId: 'bad-id',
      message: 'departmentId must be a valid id',
    });
  });

  it(`caps department subscriptions at ${MAX_SUBSCRIPTIONS_PER_SOCKET} per connection`, async () => {
    const ws = await createClient();
    await ws.nextMessage(); // greeting

    for (let i = 1; i <= MAX_SUBSCRIPTIONS_PER_SOCKET; i += 1) {
      const departmentId = i.toString(16).padStart(24, '0');
      ws.send(JSON.stringify({ type: 'SUBSCRIBE', departmentId }));
      expect(await ws.nextMessage()).toEqual({ type: 'SUBSCRIBED', departmentId });
    }

    // Re-subscribing to one it already has still succeeds
    const existing = (1).toString(16).padStart(24, '0');
    ws.send(JSON.stringify({ type: 'SUBSCRIBE', departmentId: existing }));
    expect(await ws.nextMessage()).toEqual({ type: 'SUBSCRIBED', departmentId: existing });

    // One more distinct department is refused
    const extra = (MAX_SUBSCRIPTIONS_PER_SOCKET + 1).toString(16).padStart(24, '0');
    ws.send(JSON.stringify({ type: 'SUBSCRIBE', departmentId: extra }));
    expect(await ws.nextMessage()).toEqual({
      type: 'SUBSCRIBE_REJECTED',
      departmentId: extra,
      message: `Maximum ${MAX_SUBSCRIPTIONS_PER_SOCKET} department subscriptions allowed per connection`,
    });
  });

  it('closes the connection with 1009 when a frame exceeds 4096 bytes', async () => {
    const ws = await createClient();
    await ws.nextMessage(); // greeting

    const closed = new Promise((resolve) => ws.on('close', (code) => resolve(code)));

    ws.send(
      JSON.stringify({
        type: 'SUBSCRIBE',
        departmentId: '0'.repeat(24),
        padding: 'x'.repeat(5000),
      })
    );

    // 1009 = Message Too Big
    expect(await closed).toBe(1009);
  });
});
