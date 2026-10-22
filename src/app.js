import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  STATUS_FLOW,
  TransitionError,
  assertTransition,
  getSlotAvailability,
  lineTotal,
  DEFAULT_SLOT_OPTIONS,
} from './logic.js';
import { nextOrderNumber } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const round2 = n => Math.round(n * 100) / 100;

export function createApp(store) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  const findRestaurant = id => store.data.restaurants.find(r => r.id === id);
  const findOrder = id => store.data.orders.find(o => o.id === id);

  // QB-1: browse restaurants
  app.get('/api/restaurants', (_req, res) => {
    res.json(
      store.data.restaurants.map(({ id, name, cuisine, address }) => ({ id, name, cuisine, address })),
    );
  });

  // QB-2: view a restaurant's menu
  app.get('/api/restaurants/:id/menu', (req, res) => {
    if (!findRestaurant(req.params.id)) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(
      store.data.menuItems
        .filter(m => m.restaurantId === req.params.id && m.available)
        .map(({ id, name, description, price }) => ({ id, name, description, price })),
    );
  });

  // QB-13: pickup slots limited by the restaurant's current workload
  app.get('/api/restaurants/:id/slots', (req, res) => {
    if (!findRestaurant(req.params.id)) return res.status(404).json({ error: 'Restaurant not found' });
    res.json({
      slotMinutes: DEFAULT_SLOT_OPTIONS.slotMinutes,
      capacityPerSlot: DEFAULT_SLOT_OPTIONS.slotCapacity,
      slots: getSlotAvailability(store.data.orders, req.params.id),
    });
  });

  // QB-4: place an order
  app.post('/api/orders', (req, res) => {
    const { restaurantId, pickupTime, items } = req.body ?? {};

    if (!findRestaurant(restaurantId)) return res.status(400).json({ error: 'Unknown restaurant' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }
    if (!pickupTime) return res.status(400).json({ error: 'Pickup time is required' });

    // QB-13: the pickup time must be one of the currently available slots
    const slots = getSlotAvailability(store.data.orders, restaurantId);
    const slot = slots.find(s => s.time === pickupTime);
    if (!slot) return res.status(400).json({ error: 'Pickup time is not a valid slot' });
    if (!slot.available) {
      return res.status(409).json({ error: 'That pickup time is full. Please choose another.' });
    }

    const lines = [];
    for (const line of items) {
      const quantity = Number(line.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ error: 'Quantity must be a positive whole number' });
      }
      const item = store.data.menuItems.find(
        m => m.id === line.menuItemId && m.restaurantId === restaurantId && m.available,
      );
      if (!item) return res.status(400).json({ error: `Unknown menu item: ${line.menuItemId}` });

      lines.push({
        menuItemId: item.id,
        name: item.name,
        unitPrice: item.price,
        quantity,
        lineTotal: lineTotal(item.price, quantity),
      });
    }

    const order = {
      id: `ord_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      orderNumber: nextOrderNumber(store),
      restaurantId,
      pickupTime,
      status: 'Received',
      createdAt: new Date().toISOString(),
      items: lines,
      total: round2(lines.reduce((sum, l) => sum + l.lineTotal, 0)),
    };

    store.data.orders.push(order);
    store.save();
    res.status(201).json(order);
  });

  // QB-6: customer views order status
  app.get('/api/orders/:id', (req, res) => {
    const order = findOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  });

  // QB-5: staff view incoming orders (oldest pickup first)
  app.get('/api/restaurants/:id/orders', (req, res) => {
    if (!findRestaurant(req.params.id)) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(
      store.data.orders
        .filter(o => o.restaurantId === req.params.id)
        .sort((a, b) => a.pickupTime.localeCompare(b.pickupTime) || a.createdAt.localeCompare(b.createdAt)),
    );
  });

  // QB-5: staff set a status explicitly
  app.patch('/api/orders/:id/status', (req, res) => {
    const order = findOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    try {
      assertTransition(order.status, req.body?.status);
    } catch (err) {
      if (err instanceof TransitionError) return res.status(400).json({ error: err.message });
      throw err;
    }
    order.status = req.body.status;
    order.updatedAt = new Date().toISOString();
    store.save();
    res.json(order);
  });

  // QB-5: convenience for the dashboard button: advance one step
  app.post('/api/orders/:id/advance', (req, res) => {
    const order = findOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const next = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];
    if (!next) return res.status(400).json({ error: 'Order is already Completed' });
    order.status = next;
    order.updatedAt = new Date().toISOString();
    store.save();
    res.json(order);
  });

  return app;
}