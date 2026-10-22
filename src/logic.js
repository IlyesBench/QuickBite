export const STATUS_FLOW = ['Received', 'Preparing', 'Ready for Pickup', 'Completed'];

const ACTIVE_STATUSES = new Set(['Received', 'Preparing', 'Ready for Pickup']);

export const DEFAULT_SLOT_OPTIONS = {
  slotMinutes: 15,
  leadTimeMinutes: 15,
  windowMinutes: 120,
  slotCapacity: 2,
};

export class TransitionError extends Error {}

export function canTransition(from, to) {
  const index = STATUS_FLOW.indexOf(from);
  return index !== -1 && STATUS_FLOW[index + 1] === to;
}

export function assertTransition(from, to) {
  if (!STATUS_FLOW.includes(to)) {
    throw new TransitionError(`Unknown status: ${to}`);
  }
  if (!canTransition(from, to)) {
    throw new TransitionError(`Cannot move an order from "${from}" to "${to}"`);
  }
}

/** Money for one line of an order. Rounds to 2dp to avoid float drift. */
export function lineTotal(unitPrice, quantity) {
  return Math.round(unitPrice * quantity * 100) / 100;
}

export function roundUpToSlot(date, slotMinutes) {
  const ms = slotMinutes * 60_000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

/** Pickup slots for the next windowMinutes, starting after the lead time. */
export function generateSlots(now = new Date(), options = {}) {
  const opts = { ...DEFAULT_SLOT_OPTIONS, ...options };
  const earliest = new Date(now.getTime() + opts.leadTimeMinutes * 60_000);
  const start = roundUpToSlot(earliest, opts.slotMinutes);
  const step = opts.slotMinutes * 60_000;
  const slots = [];
  for (let t = start.getTime(); t < start.getTime() + opts.windowMinutes * 60_000; t += step) {
    slots.push(new Date(t).toISOString());
  }
  return slots;
}

/** How many orders that restaurant already has in a given slot. */
export function slotLoad(orders, restaurantId, slotIso) {
  return orders.filter(
    o => o.restaurantId === restaurantId && o.pickupTime === slotIso && ACTIVE_STATUSES.has(o.status),
  ).length;
}

/** QB-13: a slot is available only while the restaurant is under capacity. */
export function getSlotAvailability(orders, restaurantId, now = new Date(), options = {}) {
  const opts = { ...DEFAULT_SLOT_OPTIONS, ...options };
  return generateSlots(now, opts).map(time => {
    const load = slotLoad(orders, restaurantId, time);
    return {
      time,
      load,
      capacity: opts.slotCapacity,
      remaining: Math.max(0, opts.slotCapacity - load),
      available: load < opts.slotCapacity,
    };
  });
}