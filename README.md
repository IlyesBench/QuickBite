# QuickBite

Online ordering and pickup for independent restaurants. Course project built with Scrum.

## Run it

Requires Node.js 20 or newer.

```
npm install
npm start
```

Open http://localhost:3000

## Run the tests

```
npm test
```

Tests also run automatically on every pull request (GitHub Actions).

## Team workflow

- One branch per backlog item: `feature/QB-<id>-short-name`
- Commit messages start with the item ID: `QB-4: validate pickup time`
- Every pull request needs one approval from someone who did not write it, and green tests
- See `DEFINITION_OF_DONE.md`
