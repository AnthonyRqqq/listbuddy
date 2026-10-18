# Development baseline

Recorded 2026-10-18. Configured database records were not accessed.

## Verification

| Check | Result |
| --- | --- |
| Node | 22.19.0 available. |
| Frontend lint | Pass after baseline repairs. |
| Backend tests | Three pass: item validation, signup/login GraphQL contracts with model doubles, bcrypt password comparison. |
| Frontend build | Initial build passed with a bundle-size warning. |
| Local MongoDB | No listener at 127.0.0.1:27017; mongod/mongosh not found on PATH. |
| Configured MongoDB | Connection and ping succeeded outside the network-restricted sandbox. No inventory records read or changed. |
| Database-backed startup, seed, persistence | Not yet verified. Configured MongoDB is reachable; demo seeding still requires a separate local database. |
| Browser account/create/delete workflows | Not verified end to end. |
| Fresh dependency installation | Commands documented; not rerun against existing dependency directories. |

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
- Base schema references `Notes`, but the registered model is `Note` (milestone 2).
- Creation timestamp default calls `Date.now()` at schema load instead of using a per-document factory (milestone 2).
- Comments describe guest inventory storage that is not implemented; account-required scope supersedes it (milestone 2).

## Baseline repairs

- Added root setup/dev/start/lint/test/build/check/seed scripts and backend test command.
- Added environment documentation, synthetic fixtures, and a local-only seeder that refuses nonempty databases.
- Fixed lint issues, hook naming/dependencies, dialog initialization, and item keys. Malformed tokens now count as expired.
- Defaulted API requests to same-origin with a Vite development proxy.
- Registered GraphQL before the production frontend fallback.
- Made backend environment loading independent of working directory and bounded database connection failures.

## Remaining baseline gate

Validate fresh dependency installation and perform the README workflow checks against a designated test database. The configured MongoDB connection is available, but its existing records must not be treated as disposable fixtures. The demo seeder intentionally targets a separate local database. Record actual successes and failures here. Milestone 1 stays open until these checks are performed; a successful database ping, isolated tests, and a successful bundle do not establish end-to-end functionality.
