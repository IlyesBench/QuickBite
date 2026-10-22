import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './src/db.js';
import { createApp } from './src/app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH ?? path.join(__dirname, 'data', 'db.json');
const port = Number(process.env.PORT ?? 3000);

const store = createStore(dbPath);
createApp(store).listen(port, () => {
  console.log(`QuickBite running at http://localhost:${port}`);
  console.log(`Staff dashboard: http://localhost:${port}/dashboard.html`);
});