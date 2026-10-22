export async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

export const money = n => `$${Number(n).toFixed(2)}`;

export const timeLabel = iso =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });