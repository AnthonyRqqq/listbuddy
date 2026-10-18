# Development baseline

Recorded 2026-10-18. Milestone 1 is complete. Existing inventory records were not accessed or modified; integration tests used newly generated databases on the configured MongoDB server.

## Verification

| Check | Result |
| --- | --- |
| Node | 22.19.0 available. |
| Frontend lint | Pass after baseline repairs. |
| Backend tests | Seven pass: baseline validation/auth contracts plus decimal normalization, stock validation, exact totals, and GraphQL compatibility. |
| Frontend build | Initial build passed with a bundle-size warning. |
| Local MongoDB | No listener at 127.0.0.1:27017; mongod/mongosh not found on PATH. |
| Configured MongoDB | Connection and ping succeeded outside the network-restricted sandbox. No inventory records read or changed. |
| Database-backed startup, seed, persistence | Pass on a generated database on the configured server. Seed persisted expected data and refused a second run. |
| Browser account/create/delete workflows | Pass in headless Chrome using the real API: rejected login, signup/login, category/item creation, reload persistence, item/category deletion, returning-user login. No browser exceptions. |
| Fresh dependency installation | Pass in a temporary source copy: all three locked installs, lint, tests, build, and database/browser smoke test. |
| Stock foundation | Unit coverage passes for Decimal128 input, exact totals, owner validation, legacy compatibility, and GraphQL string output. Database round-trip also checked by the extended smoke test. |

## Confirmed defects and incomplete behavior

- `updateRecord` does not perform an update; edit/expand buttons have no handlers (milestones 2/4).
- API requests lack verified authentication context; client supplies user IDs (milestone 3).
- Delete ownership checks test ownership of any record, separately from the target record (milestone 3).
- Generic writes accept caller-selected models, data, and relationship targets (milestones 3–5).
- JWT signing secret is hardcoded (milestone 3).
- Item creation assigns its category ID to `location` (milestone 2).
- List query omits quantity even though the UI renders it (milestone 4).
- Client user query requests `date_created` and `title`, absent from GraphQL User (milestone 4).
- Deletion lookup is not awaited, cleanup options disagree with helper expectations, and parent references are not cleaned up (milestones 2/4).
- Existing User password length validation can reject saving a previously hashed user document; the seed updates relationship arrays directly instead of resaving the hash (milestone 3).
- Fresh installation reported dependency advisories: root 2 (1 high, 1 critical), server 28 (6 moderate, 20 high, 2 critical), client 16 (1 low, 2 moderate, 13 high). These are npm's install-time reports, not a completed exploitability review. Dependency remediation remains release-readiness work; no forced upgrades were applied.

## Baseline repairs

- Added root setup/dev/start/lint/test/build/check/seed scripts and backend test command.
- Added environment documentation, synthetic fixtures, and a local-only seeder that refuses nonempty databases.
- Fixed lint issues, hook naming/dependencies, dialog initialization, and item keys. Malformed tokens now count as expired.
- Defaulted API requests to same-origin with a Vite development proxy.
- Registered GraphQL before the production frontend fallback.
- Made backend environment loading independent of working directory and bounded database connection failures.
- Made server startup await the database connection before listening, with an exported start function for isolated integration tests and deterministic cleanup.
- Added a Playwright browser smoke runner and fresh-install verification script. Both run against generated test databases and leave existing inventory untouched.
- Corrected the note model reference, per-document creation timestamp, and stale guest-storage comment while starting milestone 2.

## Completion evidence and limitations

`npm run verify:fresh` completed successfully in a new temporary copy, including real browser workflows and database persistence. The unit suite now contains seven passing tests. Test databases were removed after each run. The local-only seed CLI was not run because no local MongoDB is listening; its shared seed implementation was verified against an isolated database on the configured server.

Baseline completion establishes reproducible setup and records existing functionality and defects; it does not imply that editing, sharing, secure authorization, or release readiness are complete. The build retains a bundle-size warning. Dependency advisories above require follow-up before release.
