import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUS_FLOW,
  TransitionError,
  assertTransition,
  canTransition,
  generateSlots,
  getSlotAvailability,
  lineTotal,
} from '../src/logic.js';

const order = (pickupTime, status = 'Received', restaurantId = 'r1') => ({
  id: `o-${pickupTime}-${status}`,
  restaurantId,
  pickupTime,
  status,
});

test('status flow is the four QuickBite states in order', () => {
  assert.deepEqual(STATUS_FLOW, ['Received', 'Preparing', 'Ready for Pickup', 'Completed']);
});

test('each forward step is allowed', () => {
  assert.ok(canTransition('Received', 'Preparing'));
  assert.ok(canTransition('Preparing', 'Ready for Pickup'));
  assert.ok(canTransition('Ready for Pickup', 'Completed'));
});

test('going backwards is rejected', () => {
  assert.throws(() => assertTransition('Preparing', 'Received'), TransitionError);
});

test('skipping a step is rejected', () => {
  assert.throws(() => assertTransition('Received', 'Ready for Pickup'), TransitionError);
});

test('unknown statuses are rejected', () => {
  assert.throws(() => assertTransition('Received', 'Cancelled'), /Unknown status/);
});

test('Completed is terminal', () => {
  assert.throws(() => assertTransition('Completed', 'Received'), TransitionError);
});

test('lineTotal multiplies price by quantity', () => {
  assert.equal(lineTotal(12.5, 1), 12.5);
  assert.equal(lineTotal(12.5, 3), 37.5);
  assert.equal(lineTotal(0.1, 3), 0.3); // float drift rounded away
});

test('slots start after the lead time and step by slotMinutes', () => {
  const now = new Date('2026-01-01T12:00:00.000Z');
  const slots = generateSlots(now, { slotMinutes: 15, leadTimeMinutes: 15, windowMinutes: 60 });
  assert.equal(slots.length, 4);
  assert.equal(slots[0], '2026-01-01T12:15:00.000Z');
  assert.equal(slots[3], '2026-01-01T13:00:00.000Z');
});

test('every slot is available when there are no orders', () => {
  const now = new Date('2026-01-01T12:00:00.000Z');
  const slots = getSlotAvailability([], 'r1', now, { windowMinutes: 60 });
  assert.ok(slots.every(s => s.available));
  assert.ok(slots.every(s => s.remaining === 2));
});

test('a slot stops being available once it reaches capacity', () => {
  const now = new Date('2026-01-01T12:00:00.000Z');
  const opts = { windowMinutes: 60, slotCapacity: 2 };
  const [first] = getSlotAvailability([], 'r1', now, opts);
  const orders = [order(first.time), order(first.time)];
  const slots = getSlotAvailability(orders, 'r1', now, opts);
  assert.equal(slots[0].load, 2);
  assert.equal(slots[0].available, false);
});

test('completed orders do not count towards a slot workload', () => {
  const now = new Date('2026-01-01T12:00:00.000Z');
  const opts = { windowMinutes: 60, slotCapacity: 2 };
  const [first] = getSlotAvailability([], 'r1', now, opts);
  const slots = getSlotAvailability([order(first.time, 'Completed'), order(first.time, 'Completed')], 'r1', now, opts);
  assert.equal(slots[0].load, 0);
  assert.ok(slots[0].available);
});

test('other restaurants do not affect this restaurant workload', () => {
  const now = new Date('2026-01-01T12:00:00.000Z');
  const opts = { windowMinutes: 60, slotCapacity: 2 };
  const [first] = getSlotAvailability([], 'r1', now, opts);
  const slots = getSlotAvailability([order(first.time, 'Received', 'r2')], 'r1', now, opts);
  assert.equal(slots[0].load, 0);
});