import { api, money, timeLabel } from './api.js';

const restaurantId = new URLSearchParams(location.search).get('restaurant');
const CART_KEY = `quickbite.cart.${restaurantId}`;

const menuEl = document.getElementById('menu');
const cartEl = document.getElementById('cart');
const totalEl = document.getElementById('total');
const slotEl = document.getElementById('slot');
const placeBtn = document.getElementById('place');
const msgEl = document.getElementById('msg');

let menu = [];
let cart = JSON.parse(localStorage.getItem(CART_KEY) ?? '{}');

const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));
const cartItems = () => Object.values(cart);
const cartTotal = () => cartItems().reduce((sum, i) => sum + i.price * i.quantity, 0);

function renderMenu() {
  menuEl.innerHTML = menu
    .map(
      m => `
      <div class="card row">
        <div>
          <h3>${m.name}</h3>
          <p class="muted">${m.description ?? ''}</p>
          <p><strong>${money(m.price)}</strong></p>
        </div>
        <button data-add="${m.id}">Add</button>
      </div>`,
    )
    .join('');
  menuEl.querySelectorAll('[data-add]').forEach(btn =>
    btn.addEventListener('click', () => addItem(btn.dataset.add)),
  );
}

function renderCart() {
  const items = cartItems();
  cartEl.innerHTML = items.length
    ? items
        .map(
          i => `
          <li>
            <span>${i.name} × ${i.quantity}</span>
            <span>${money(i.price * i.quantity)}</span>
            <button class="link" data-remove="${i.menuItemId}" aria-label="Remove one">-</button>
          </li>`,
        )
        .join('')
    : '<li class="muted">Your cart is empty.</li>';

  cartEl.querySelectorAll('[data-remove]').forEach(btn =>
    btn.addEventListener('click', () => removeItem(btn.dataset.remove)),
  );

  totalEl.textContent = money(cartTotal());
  placeBtn.disabled = items.length === 0 || !slotEl.value;
}

function addItem(id) {
  const item = menu.find(m => m.id === id);
  if (!item) return;
  cart[id] ??= { menuItemId: id, name: item.name, price: item.price, quantity: 0 };
  cart[id].quantity += 1;
  saveCart();
  renderCart();
}

function removeItem(id) {
  if (!cart[id]) return;
  cart[id].quantity -= 1;
  if (cart[id].quantity <= 0) delete cart[id];
  saveCart();
  renderCart();
}

async function loadSlots() {
  const data = await api(`/api/restaurants/${restaurantId}/slots`);
  slotEl.innerHTML = data.slots
    .map(
      s => `<option value="${s.time}" ${s.available ? '' : 'disabled'}>
        ${timeLabel(s.time)}${s.available ? '' : ' (full)'}
      </option>`,
    )
    .join('');
  const firstOpen = data.slots.find(s => s.available);
  if (firstOpen) slotEl.value = firstOpen.time;
  renderCart();
}

placeBtn.addEventListener('click', async () => {
  msgEl.textContent = '';
  placeBtn.disabled = true;
  try {
    const order = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        restaurantId,
        pickupTime: slotEl.value,
        items: cartItems().map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      }),
    });
    localStorage.removeItem(CART_KEY);
    location.href = `/status.html?order=${encodeURIComponent(order.id)}`;
  } catch (err) {
    msgEl.textContent = err.message;
    placeBtn.disabled = false;
    await loadSlots();
  }
});

slotEl.addEventListener('change', renderCart);

try {
  const restaurants = await api('/api/restaurants');
  const restaurant = restaurants.find(r => r.id === restaurantId);
  if (restaurant) {
    document.getElementById('title').textContent = restaurant.name;
    document.getElementById('subtitle').textContent = restaurant.cuisine;
  }
  menu = await api(`/api/restaurants/${restaurantId}/menu`);
  renderMenu();
  renderCart();
  await loadSlots();
} catch (err) {
  msgEl.textContent = err.message;
}