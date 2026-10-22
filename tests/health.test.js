const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');
const { startTestServer } = require('./helpers');

test('GET /api/health returns ok', async () => {
  const server = await startTestServer(createApp());
  try {
    const res = await fetch(`${server.url}/api/health`);
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(await res.json(), { status: 'ok' });
  } finally {
    await server.close();
  }
});
