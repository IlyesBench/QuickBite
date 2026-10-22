# QuickBite

Online ordering and pickup platform for independent restaurants.
Node + Express + a JSON file store. No build step.

## Run it

Requires Node 20+. Run each step from the `quickbite/` folder, one at a time.

1. **Go to the project folder** (quote the path if it contains spaces):

   ```bash
   cd path/to/quickbite
   ```

2. **Install dependencies** (first time only):

   ```bash
   npm install
   ```

3. **Seed the database** (creates `data/db.json` from `data/seed.json`; re-run to reset):

   ```bash
   npm run db:reset
   ```

4. **Start the server** and leave this terminal open:

   ```bash
   npm start
   ```

5. **Open the app** in a browser:
   - Customer flow: <http://localhost:3000>
   - Staff dashboard: <http://localhost:3000/dashboard.html>

Press `Ctrl+C` in the terminal to stop the server.

### Troubleshooting

- **Port 3000 already in use / wrong page loads:** another server (e.g. `php -S`)
  is on port 3000. Stop it, or run on another port: `PORT=3001 npm start`.
- **Shell shows `quote>`:** a quote was left unclosed. Press `Ctrl+C` and retype
  the command.

## Tests

```bash
npm test
```

## API

| Method | Route | Purpose | PBI |
|---|---|---|---|
| GET | `/api/restaurants` | Browse restaurants | QB-1 |
| GET | `/api/restaurants/:id/menu` | View a menu | QB-2 |
| GET | `/api/restaurants/:id/slots` | Available pickup slots (capacity-aware) | QB-13 |
| POST | `/api/orders` | Place an order → `Received` | QB-4 |
| GET | `/api/orders/:id` | Customer views status | QB-6 |
| GET | `/api/restaurants/:id/orders` | Staff sees incoming orders | QB-5 |
| PATCH | `/api/orders/:id/status` | Staff sets a status | QB-5 |
| POST | `/api/orders/:id/advance` | Staff advances one step (dashboard button) | QB-5 |

### Status rules

Only `Received → Preparing → Ready for Pickup → Completed`. Skips, backwards
moves and unknown statuses return `400`.

### Pickup slot rules

Slots are 15 minutes, start 15 minutes from now, and run for 2 hours. A slot
holds at most 2 active orders (`Received`, `Preparing`, `Ready for Pickup`);
`Completed` orders free their slot. `POST /api/orders` rejects a pickup time
that is not an available slot.

Tunable in `DEFAULT_SLOT_OPTIONS` in `src/logic.js`.

## Deliberately out of scope

No login, payments, notifications, images, search, cart persistence across
restaurants, order cancellation, or CI deployment. See the report for why.