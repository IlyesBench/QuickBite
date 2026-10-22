import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const source = path.join(root, 'data', 'seed.json');
const target = path.join(root, 'data', 'db.json');

const seed = JSON.parse(fs.readFileSync(source, 'utf8'));
fs.writeFileSync(target, JSON.stringify(seed, null, 2));
console.log(`Seeded ${target}: ${seed.restaurants.length} restaurants, ${seed.menuItems.length} menu items, 0 orders.`);