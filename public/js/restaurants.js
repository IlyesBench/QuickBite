import { api } from './api.js';

const el = document.getElementById('restaurants');

try {
  const restaurants = await api('/api/restaurants');
  el.innerHTML = restaurants
    .map(
      r => `
      <a class="card" href="/menu.html?restaurant=${encodeURIComponent(r.id)}">
        <h2>${r.name}</h2>
        <p class="muted">${r.cuisine}</p>
        <p class="muted">${r.address}</p>
      </a>`,
    )
    .join('');
} catch (err) {
  el.innerHTML = `<p class="msg">${err.message}</p>`;
}