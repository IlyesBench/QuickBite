import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

function makeStore() {
  const data = {
    meta: { nextOrderNumber: 1000 },
    restaurants: [{ id: 'r1', name: 'Test Kitchen', cuisine: 'Test', address: '1 Test Street' }],
    menuItems: [
      { id: 'm1', restaurantId: 'r1', name: 'Pizza', description: '', price: 10, available: true },
      { id: 'm2', restaurantId: 'r1', name: 'Salad', description: '', price: 5, available: true },
    ],
    orders: [],
  };
  return { get data() { return data; }, save() {} };
}

let store;
let server;
let base;

before(async () => {
  store = makeStore();
  server = createApp(store).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const post = (path, body) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

async function firstAvailableSlot() {
  const res = await fetch(`${base}/api/restaurants/r1/slots`);
  const body = await res.json();
  return body.slots.find(s => s.available).time;
}

async function createOrder(quantity = 1) {
  const res = await post('/api/orders', {
    restaurantId: 'r1',
    pickupTime: await firstAvailableSlot(),
    items: [{ menuItemId: 'm1', quantity }],
  });
  assert.equal(res.status, 201);
  return res.json();
}

test('GET /api/restaurants lists restaurants', async () => {
  const res = await fetch(`${base}/api/restaurants`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.length, 1);
  assert.equal(body[0].name, 'Test Kitchen');
});

test('GET /api/restaurants/:id/menu returns the menu', async () => {
  const res = await fetch(`${base}/api/restaurants/r1/menu`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.map(m => m.id), ['m1', 'm2']);
});

test('GET /api/restaurants/:id/menu 404s for an unknown restaurant', async () => {
  const res = await fetch(`${base}/api/restaurants/nope/menu`);
  assert.equal(res.status, 404);
});

test('GET slots offers available pickup times', async () => {
  const res = await fetch(`${base}/api/restaurants/r1/slots`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.slots.length > 0);
  assert.ok(body.slots.every(s => typeof s.available === 'boolean'));
});

test('POST /api/orders creates an order in Received', async () => {
  const order = await createOrder(2);
  assert.equal(order.status, 'Received');
  assert.equal(order.total, 20);
  assert.equal(order.items[0].quantity, 2);
  assert.match(order.id, /^ord_/);
});

test('POST /api/orders rejects an empty cart', async () => {
  const res = await post('/api/orders', { restaurantId: 'r1', pickupTime: await firstAvailableSlot(), items: [] });
  assert.equal(res.status, 400);
});

test('POST /api/orders rejects a pickup time that is not a slot', async () => {
  const res = await post('/api/orders', {
    restaurantId: 'r1',
    pickupTime: '2020-01-01T00:00:00.000Z',
    items: [{ menuItemId: 'm1', quantity: 1 }],
  });
  assert.equal(res.status, 400);
});

test('POST /api/orders rejects an unknown menu item', async () => {
  const res = await post('/api/orders', {
    restaurantId: 'r1',
    pickupTime: await firstAvailableSlot(),
    items: [{ menuItemId: 'nope', quantity: 1 }],
  });
  assert.equal(res.status, 400);
});

test('PATCH advances the status one step at a time', async () => {
  const order = await createOrder();
  const res = await fetch(`${base}/api/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Preparing' }),
  });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'Preparing');
});

test('PATCH rejects skipping a step', async () => {
  const order = await createOrder();
  const res = await fetch(`${base}/api/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Completed' }),
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /Cannot move/);
});

test('POST advance walks an order to Completed', async () => {
  const order = await createOrder();
  for (const expected of ['Preparing', 'Ready for Pickup', 'Completed']) {
    const res = await post(`/api/orders/${order.id}/advance`, {});
    assert.equal((await res.json()).status, expected);
  }
  const res = await post(`/api/orders/${order.id}/advance`, {});
  assert.equal(res.status, 400);
});