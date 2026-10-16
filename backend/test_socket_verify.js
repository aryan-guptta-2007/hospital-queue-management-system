const http = require('http');
const { WebSocket } = require('./node_modules/ws');
const { init, close } = require('./src/realtime/socket');
const assert = require('assert');

async function run() {
  const server = http.createServer();
  init(server);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;

  const ws = new WebSocket(`ws://localhost:${port}/ws`);
  await new Promise((res) => ws.on('open', res));

  const recv = () => new Promise((res) => ws.once('message', (d) => res(JSON.parse(d.toString()))));

  const greeting = await recv();
  assert.strictEqual(greeting.type, 'CONNECTED');

  ws.send(JSON.stringify({ type: 'SUBSCRIBE', departmentId: 'invalid' }));
  const invalidReply = await recv();
  assert.strictEqual(invalidReply.type, 'SUBSCRIBE_REJECTED');
  assert.strictEqual(invalidReply.message, 'departmentId must be a valid id');

  for (let i = 1; i <= 20; i++) {
    const id = i.toString(16).padStart(24, '0');
    ws.send(JSON.stringify({ type: 'SUBSCRIBE', departmentId: id }));
    const rep = await recv();
    assert.strictEqual(rep.type, 'SUBSCRIBED');
  }

  const dup = (1).toString(16).padStart(24, '0');
  ws.send(JSON.stringify({ type: 'SUBSCRIBE', departmentId: dup }));
  const dupRep = await recv();
  assert.strictEqual(dupRep.type, 'SUBSCRIBED');

  const extra = (21).toString(16).padStart(24, '0');
  ws.send(JSON.stringify({ type: 'SUBSCRIBE', departmentId: extra }));
  const extraRep = await recv();
  assert.strictEqual(extraRep.type, 'SUBSCRIBE_REJECTED');
  assert.strictEqual(extraRep.message, 'Maximum 20 department subscriptions allowed per connection');

  const ws2 = new WebSocket(`ws://localhost:${port}/ws`);
  await new Promise((res) => ws2.on('open', res));
  await new Promise((res) => ws2.once('message', res));

  const closeP = new Promise((res) => ws2.on('close', (code) => res(code)));
  ws2.send(JSON.stringify({ type: 'SUBSCRIBE', payload: 'a'.repeat(5000) }));
  const code = await closeP;
  assert.strictEqual(code, 1009);

  ws.close();
  await close();
  await new Promise((res) => server.close(res));

  console.log('SUCCESS: All socket verification assertions passed.');
}

run().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
