import { api, money } from './api.js';

const FLOW = ['Received', 'Preparing', 'Ready for Pickup', 'Completed'];
const params = new URLSearchParams(location.search);
const input = document.getElementById('orderId');
const out = document.getElementById('order');
const orderId = params.get('order');

if (orderId) input.value = orderId;

async function check() {
  const id = input.value.trim();
  if (!id) return;
  out.innerHTML = '<p class="muted">Loading...</p>';
  try {
    const order = await api(`/api/orders/${encodeURIComponent(id)}`);
    const reached = FLOW.indexOf(order.status);
    out.innerHTML = `
      <h2>Order #${order.orderNumber}</h2>
      <p class="muted">Pickup ${new Date(order.pickupTime).toLocaleString()}</p>
      <ol class="timeline">
        ${FLOW.map((s, i) => `<li class="${i <= reached ? 'done' : ''}">${s}</li>`).join('')}
      </ol>
      <p>${order.items.map(i => `${i.name} × ${i.quantity}`).join(', ')}</p>
      <p>Total <strong>${money(order.total)}</strong></p>`;
  } catch (err) {
    out.innerHTML = `<p class="msg">${err.message}</p>`;
  }
}

document.getElementById('check').addEventListener('click', check);

if (orderId) {
  check();
  setInterval(check, 5000);
}