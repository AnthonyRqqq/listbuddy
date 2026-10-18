# ListBuddy

Inventory tracking prototype using React/Vite, PrimeReact, GraphQL, Express, and MongoDB. Requirements and milestones are in [PROJECT_PLAN.md](PROJECT_PLAN.md); verification and known defects are in [docs/BASELINE.md](docs/BASELINE.md).

## Setup

Prerequisites: Node.js 22 (verified with 22.19.0), npm, and a running local MongoDB instance. From the repository root:

```sh
npm run setup
```

Copy `server/.env.example` to `server/.env` if no configuration exists. Do not overwrite an existing configuration. Set `MONGO_URI` to a dedicated development database, such as `mongodb://127.0.0.1:27017/listbuddy_dev`.

```sh
npm run dev
```

Open http://localhost:3000/lists. Vite proxies `/graphql` to port 3001. If changing the backend port, update `client/vite.config.js` too. The backend loads `server/.env` independently of the working directory and fails after approximately five seconds if MongoDB cannot be reached.

On Windows PowerShell, use `npm.cmd` instead of `npm` if execution policy blocks `npm.ps1`.

## Environment

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | Required backend database URI in `server/.env`. |
| `PORT` | Backend port, default 3001. |
| `NODE_ENV` | Set to production to serve the built frontend from Express. |
| `VITE_GRAPHQL_URL` | Optional frontend build-time API URL override in `client/.env`; defaults to `/graphql`. |

API authentication enforcement and signing-secret configuration remain milestone 3 work. Use this prototype for local development only.

## Synthetic demo

With MongoDB running locally, run `npm run seed`. It targets only `mongodb://127.0.0.1:27017/listbuddy_demo`, ignores `.env` and `MONGO_URI`, never deletes records, and refuses databases containing documents. Run one seed process at a time.

The fixture creates a Workshop category, Shelf A location, and Washers item with quantity 24. To view it, point `server/.env` at the demo database and restart. Login: `demo@example.com` / `local-demo-only`. These are public synthetic credentials.

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

For a local static-serving check, build, set `NODE_ENV=production`, and run `npm start`. Express handles `/graphql` before the frontend fallback. Release deployment remains milestone 5 work.

## Manual workflow verification

On a dedicated development database, verify signup, successful and rejected login, category creation, item creation, reload persistence, and deletion. Record results in `docs/BASELINE.md`. Editing and sharing remain incomplete.
