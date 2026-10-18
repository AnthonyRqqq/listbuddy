# ListBuddy

Inventory tracking prototype using React/Vite, PrimeReact, GraphQL, Express, and MongoDB. Requirements and milestones are in [PROJECT_PLAN.md](PROJECT_PLAN.md); verification and known defects are in [docs/BASELINE.md](docs/BASELINE.md).

## Setup

Prerequisites: Node.js 22 (verified with 22.19.0), npm, and an accessible MongoDB server (local or hosted). From the repository root:

```sh
npm run setup
```

Copy `server/.env.example` to `server/.env` if no configuration exists. Do not overwrite an existing configuration. Set `MONGO_URI` to a dedicated development database, such as `mongodb://127.0.0.1:27017/listbuddy_dev`. Set `JWT_SECRET` to a private random value of at least 32 characters. Generate one with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"` and keep it out of version control. Startup fails if the secret is absent or too short. Changing it invalidates existing tokens; log out and log in again.

```sh
npm run dev
```

Open http://localhost:3000/lists. Vite proxies `/graphql` to port 3001. If changing the backend port, update `client/vite.config.js` too. The backend loads `server/.env` independently of the working directory and uses a ten-second server-selection timeout if MongoDB cannot be reached (DNS lookup can take longer).

The inventory screen supports nested category creation, multiple item memberships, reusable locations, decimal stock entries, separate unit totals, and item editing with conflict recovery. Earlier records are available at `/legacy-lists` and are excluded from the new totals until migration. Sharing, category moves, and canonical deletion are not available yet.

On Windows PowerShell, use `npm.cmd` instead of `npm` if execution policy blocks `npm.ps1`.

## Environment

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | Required backend database URI in `server/.env`. |
| `JWT_SECRET` | Required private token-signing secret, at least 32 characters. |
| `PORT` | Backend port, default 3001. |
| `NODE_ENV` | Set to production to serve the built frontend from Express. |
| `VITE_GRAPHQL_URL` | Optional frontend build-time API URL override in `client/.env`; defaults to `/graphql`. |

The client sends bearer tokens. Typed inventory writes and the new inventory snapshot verify identity and enforce ownership; legacy writes have compatibility restrictions. Legacy read authorization and inherited sharing remain milestone 3 work, so use this prototype for local development only.

## Synthetic demo

With MongoDB running locally, run `npm run seed`. It targets only `mongodb://127.0.0.1:27017/listbuddy_demo`, ignores `.env` and `MONGO_URI`, never deletes records, and refuses databases containing documents. Run one seed process at a time.

The fixture creates a Workshop category, Shelf A location, and Washers item with quantity 24. To view it, point `server/.env` at the demo database, restart, and open `/legacy-lists`. Login: `demo@example.com` / `local-demo-only`. These are public synthetic credentials.

Seeding is not transactional; a failed run can leave partial demo records. Inspect that dedicated database before retrying. The script never clears it automatically. Fixtures represent the current schema, not planned multi-location decimal stock.

## Checks

```sh
npm run lint
npm test
npm run build
# All three, stopping on failure:
npm run check
```

Tests use Node's built-in runner, model validation, and isolated model doubles without loading `.env` or connecting to MongoDB. They do not prove database persistence or browser behavior. Build artifacts under `client/dist` are ignored.

### Database and browser verification

```sh
npm run build
npm run test:e2e
# Verify locked installs and all checks in a new temporary copy:
npm run verify:fresh
```

These checks require the configured MongoDB credentials to create/drop a separate test database and Google Chrome installed. Set `PLAYWRIGHT_CHANNEL=msedge` to use installed Microsoft Edge instead. Playwright runs headlessly. The test always generates its own `listbuddy_test_` database name, checks that it starts empty, and removes only that database afterward. It never uses the configured inventory database for test writes. A hard process interruption can leave a test database; its generated name is logged when the test starts.

The smoke test runs the built frontend and real API, checks synthetic seeding/refusal to reseed, signup, rejected login, returning-user login, category/item creation, reload persistence, and deletion. It also verifies the new stock model directly against MongoDB and GraphQL. `verify:fresh` installs from all three lockfiles in a temporary source copy, runs lint/unit tests/build, and runs the smoke test there. Credentials are supplied in memory, not copied into the temporary checkout. The temporary directory is retained for inspection.

The smoke runner uses a fresh in-memory signing secret and also exercises typed inventory creation, shared membership, exact decimal persistence, unlinking, ownership rejection, and simultaneous edits where exactly one update succeeds. It never replaces your configured signing secret.

Milestone 2's additive stock schema, typed operations, precision limits, compatibility rules, and remaining migration work are documented in [docs/INVENTORY_MODEL.md](docs/INVENTORY_MODEL.md).

For a local static-serving check, build, set `NODE_ENV=production`, and run `npm start`. Express handles `/graphql` before the frontend fallback. Release deployment remains milestone 5 work.

## Manual workflow verification

On a dedicated development database, verify signup/login, nested category and location creation, multiple-category items, decimal stock, reload persistence, editing, conflict recovery, and unlinking in `/lists`. Earlier-list creation/deletion remains at `/legacy-lists`. The smoke runner covers these owner workflows and checks mobile width; sharing and canonical deletion remain incomplete.
