import { api, money } from './api.js';

const selectEl = document.getElementById('restaurant');
const listEl = document.getElementById('orders');

async function loadRestaurants() {
  const restaurants = await api('/api/restaurants');
  selectEl.innerHTML = restaurants
    .map(r => `<option value="${r.id}">${r.name}</option>`)
    .join('');
}

async function loadOrders() {
  if (!selectEl.value) return;
  try {
    const orders = await api(`/api/restaurants/${encodeURIComponent(selectEl.value)}/orders`);
    listEl.innerHTML = orders.length
      ? orders
          .map(
            o => `
          <div class="card row">
            <div>
              <h3>#${o.orderNumber} <span class="badge">${o.status}</span></h3>
              <p class="muted">Pickup ${new Date(o.pickupTime).toLocaleString()}</p>
              <p class="muted">${o.items.map(i => `${i.name} × ${i.quantity}`).join(', ')}</p>
            </div>
            <div class="actions">
              <strong>${money(o.total)}</strong>
              <button data-advance="${o.id}" ${o.status === 'Completed' ? 'disabled' : ''}>
                ${o.status === 'Completed' ? 'Completed' : 'Advance →'}
              </button>
            </div>
          </div>`,
          )
          .join('')
      : '<p class="muted">No orders yet.</p>';

    listEl.querySelectorAll('[data-advance]').forEach(btn =>
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await api(`/api/orders/${btn.dataset.advance}/advance`, { method: 'POST' });
          await loadOrders();
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
        }
      }),
    );
  } catch (err) {
    listEl.innerHTML = `<p class="msg">${err.message}</p>`;
  }
}

selectEl.addEventListener('change', loadOrders);

await loadRestaurants();
const wanted = new URLSearchParams(location.search).get('restaurant');
if (wanted) selectEl.value = wanted;
await loadOrders();
setInterval(loadOrders, 5000);