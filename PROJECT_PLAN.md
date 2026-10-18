# ListBuddy Inventory App Roadmap

Status: Milestones 1 and 2 complete for the canonical inventory model. The owner UI now uses nested categories, multiple memberships, decimal stock, exact totals, and version-checked edits. Legacy records remain explicitly separate and unchanged. Next: milestone 3 authorization and sharing. Hierarchy moves/deletions and migration tooling remain tracked in milestones 3–5. See [docs/BASELINE.md](docs/BASELINE.md) and [docs/INVENTORY_MODEL.md](docs/INVENTORY_MODEL.md).

## Summary

Build an inventory tracking app for personal and shared use. The first release requires an account and supports nested shareable categories, items belonging to multiple categories, and decimal stock quantities across multiple locations with optional units.

This document is the living project checklist. Update checkboxes, decisions, and completion evidence as work progresses. The initial implementation step creates this roadmap only; application milestones are separate development work.

## Existing foundation

Repository inspection found:

- React/Vite frontend using PrimeReact and Apollo Client.
- Express/GraphQL backend using MongoDB/Mongoose.
- Models for users, categories, items, locations, and notes.
- Account forms and basic list/item creation and deletion controls; runtime behavior still needs verification.
- An unfinished update resolver, no API request authentication enforcement, relationship cleanup defects, and item creation assigning a category ID to a location field.
- No checked-in inventory datasets or tests. The seed script references an absent file.

The initial findings above describe the repository before implementation. Existing inventory records have not been inspected. The README now contains project setup and verification instructions; baseline tests use isolated databases on the configured MongoDB server.

## Agreed product behavior

- Accounts are required, and MongoDB stores inventory data.
- Categories can nest, and every category can be shared individually.
- Owners add registered users by email as viewers or editors.
- Children inherit ancestor access. Direct sharing can add or strengthen access but cannot revoke inherited access.
- An item can belong to multiple categories. Access through any category grants access to that item; the strongest applicable role wins.
- Each item can have stock at multiple locations, with nonnegative decimal quantities and optional units per stock entry.
- Units can differ between locations. Totals remain separated by unit; there is no automatic conversion.
- Editing an item changes the same item everywhere it appears. The interface must communicate this behavior.

## Milestone 1: Establish a reproducible baseline

Dependencies: none.

- [x] Document installation, environment variables, local startup, and build commands.
- [x] Verify existing account and inventory workflows and record confirmed defects.
- [x] Repair missing or misleading scripts, including the seed command.
- [x] Establish lint/build checks and a minimal backend test harness.
- [x] Create synthetic development fixtures. Keep real-data inspection as a separately authorized phase.

Completion criteria: a fresh checkout can run with a development database, and known failures are documented.

## Milestone 2: Define and implement the inventory model

Dependencies: milestone 1.

- [x] Retain the current stack as the default.
- [x] Give categories one optional parent, prevent cycles, and support arbitrary nesting.
- [x] Represent item membership in multiple categories explicitly.
- [x] Replace the item's single quantity/location fields with stock entries containing location, decimal quantity, and optional unit in the canonical model and default UI; preserve unmigrated records on the legacy path.
- [x] Use decimal-safe storage and arithmetic, transmitting quantities as decimal strings through GraphQL.
- [x] Give each canonical item and category an owner. Make locations reusable across that owner's items.
- [x] Allow unspecified locations and units; total unspecified units separately.
- [x] Keep cross-category item membership within the same owner's inventory for the first release.
- [x] Document migration requirements for existing quantities, category membership, and malformed location references before changing stored data.

Implemented model: Decimal128 stock, decimal-string GraphQL reads/writes, exact per-unit totals with item deduplication, owner/location validation, single-parent categories, and canonical item category IDs. Typed operations create owned records and replace item contents with an atomic version check. The default `/lists` UI uses the authenticated `myInventory` snapshot and typed mutations; `/legacy-lists` retains earlier records without silently converting them. Persisted fixtures and browser workflows meet the milestone completion criteria. Category moves/deletions were never part of that fixture criterion and remain unavailable pending their milestones 3–4 safeguards. Executable migration/rehearsal belongs to milestone 5; milestone 2's migration requirements are documented.

### Milestone 2 completion checkpoint

- [x] Add optional `Category.parent_category` with iterative ancestor validation (same owner, existing canonical ancestors, cycle rejection).
- [x] Add optional `Item.category_ids` with unique, existing, same-owner membership validation.
- [x] Expose canonical relationship reads separately from legacy arrays; prevent canonical fields and dotted-path updates through the generic create API.
- [x] Verify persisted nested/multiple-membership fixtures and deduplicated mixed-unit totals in the isolated database/browser smoke runner.
- [x] Introduce explicit validated inventory creation and full item replacement, deriving owners from verified tokens. Pulled the necessary identity/signing-secret setup forward from milestone 3.
- [x] Reject stale and simultaneous item edits with atomic version checks; verify unlinking preserves the item and remaining memberships.
- [x] Restrict legacy writes and block canonical item/category and all location deletion through the legacy API, preserving references until explicit deletion is implemented.
- [x] Transition default frontend reads/forms from legacy arrays and quantity to canonical memberships and stock; keep legacy behavior explicit until migration.
- [x] Add an owner-scoped inventory snapshot, unassigned-item view, separate unit totals, loading/error states, and explicit conflict reload that preserves drafts until discarded.
- [x] Verify new owner workflows in a browser, including mobile-width stock editing, and retain earlier-list smoke coverage.

Verification at this checkpoint: 14 backend tests, frontend lint, and production build pass (existing bundle-size warning). `npm.cmd run test:e2e` passes owner-isolated snapshots, legacy exclusion, typed writes, decimal precision, concurrency rejection, and both earlier/new browser workflows. New browser coverage includes nested category creation, two locations, multiple membership, exact mixed-unit totals, reload persistence, stale-draft recovery, unlinking, empty stock, and a 390px viewport. The runner removes only its randomly named database. No preserved inventory was read or changed. The previous checkpoint configured a private ignored local `JWT_SECRET`.

Next session: begin milestone 3 by centralizing verified identity and access checks across every legacy/new read and write, then implement inherited viewer/editor sharing. The new snapshot is owner-scoped, but legacy read endpoints are still not authorized. Preserve the tested canonical UI. Category moves and deletion require a database-level concurrency strategy before exposure, not a process-local lock or document hook alone. Migration tooling must remain separate from authorization to inspect/apply changes to preserved inventory.

Completion criteria: fixtures demonstrate nested categories, shared item membership, and stock across locations with mixed units without duplicate counting.

## Milestone 3: Enforce authentication and sharing

Dependencies: milestone 2.

- [x] Send account tokens with frontend requests and validate them in GraphQL context.
- [ ] Derive identity from the authenticated session instead of caller-supplied user IDs.
- [x] Move the signing secret into environment configuration.
- [ ] Centralize inherited viewer/editor access checks for every query and mutation.
- [ ] Reserve sharing changes, category moves, and category deletion for owners.
- [ ] Allow editors to manage item contents and stock; reserve permanent item deletion for its owner.
- [ ] Treat removing an item from a category as unlinking it, retaining the item and its other memberships.
- [ ] Prevent access to a shared item from exposing other categories or other items the user cannot access.

Completion criteria: automated tests prove ownership, inherited sharing, direct sharing, and access revocation across nested categories and shared items.

## Milestone 4: Complete the core inventory workflows

Dependencies: milestones 2 and 3.

- [ ] Provide category navigation, item details, search, and filters for category and location.
- [ ] Implement item creation, editing, category linking/unlinking, and stock editing across locations.
- [ ] Show totals grouped by unit, counting each item once in aggregate views.
- [ ] Provide owner-managed locations and category sharing controls.
- [ ] Keep unassigned items accessible to their owner.
- [ ] Block category deletion until children and item memberships have been moved or removed.
- [ ] Block location deletion while stock entries reference it.
- [ ] Serialize category moves and relationship/deletion changes at the database level before exposing them; current public API blocks these operations entirely.
- [ ] Add clear loading, empty, validation, permission-denied, and failure states.
- [ ] Support usable layouts and keyboard interaction on desktop and mobile browsers.

Completion criteria: an owner and collaborator can perform the agreed workflows end to end without database manipulation.

## Milestone 5: Validate and prepare the first release

Dependencies: milestones 1–4. Introduce explicit API operations alongside the workflows that need them; complete removal of unrestricted operations here.

- [ ] Replace unrestricted generic record operations with explicit, validated GraphQL operations for inventory and sharing workflows.
- [ ] Validate quantities, units, relationships, and allowed changes on the server.
- [x] Prevent stale stock edits from silently overwriting newer changes through typed item writes, with explicit frontend conflict/reload handling.
- [ ] Implement an idempotent migration report and disposable-copy rehearsal; do not inspect or migrate preserved inventory without the separately authorized data phase.
- [ ] Test migrations against disposable copies before applying them to preserved data.
- [ ] Document deployment configuration, backup/restore, and rollback procedures.
- [ ] Run a release checklist covering account access, inventory editing, sharing, responsive behavior, and error handling.

Completion criteria: acceptance tests pass, and deployment and recovery procedures are documented.

## API and data compatibility checklist

- [ ] Replace client-selected table names and unrestricted JSON writes with explicit inventory and sharing inputs and operations.
- [ ] Remove reliance on supplied user IDs for authorization; use verified request identity.
- [ ] Replace the single item quantity/location interface with stock entries and decimal-string quantities.
- [ ] Expose category hierarchy, multiple item memberships, and effective access without leaking inaccessible relationships.
- [ ] Update frontend queries, mutations, forms, and cache handling alongside backend interface changes.
- [ ] Inventory existing data and define migration/rollback steps before applying schema changes to preserved records.

## Acceptance tests

- [x] Fractional and zero quantities work; negative and malformed quantities are rejected.
- [x] Mixed units and unspecified units produce separate totals without duplicate counting.
- [ ] Nested access inheritance and stronger direct child permissions work.
- [ ] Multiple-category access uses the strongest role; revoking one grant preserves any remaining valid access path.
- [ ] Unauthorized requests, expired tokens, forged user IDs, and unauthorized relationship changes are rejected.
- [x] Category cycles are rejected by document validation; public category moves remain unavailable pending concurrency protection.
- [ ] Unlinking preserves an item and its other memberships; permanent deletion follows owner permissions.
- [ ] Category and location deletion respect referenced data.
- [x] Concurrent stock edits through the typed API cannot silently overwrite newer changes.
- [ ] Owner, editor, and viewer workflows work in desktop and mobile browser layouts.

## Implementation defaults

These defaults were included in the proposed roadmap and can be revised explicitly before the affected milestone:

- Keep React/Vite, PrimeReact, GraphQL, Express, and MongoDB/Mongoose.
- Each category has at most one parent; each item has one owner and may belong to multiple categories owned by that same owner.
- Locations belong to an owner and can be reused across that owner's items.
- Use trimmed, case-sensitive unit labels; blank means unspecified. Unit aliases and conversion are deferred.
- Viewers read; editors manage item contents and stock. Owners manage sharing, category moves/deletion, and permanent item deletion.
- Deleting a category requires first moving/removing its child categories and item memberships. Deleting a referenced location is blocked.
- Preserve existing data until migration requirements are understood; do not assume configured database records are disposable.

## Deferred features

- Guest inventories, offline mode, and synchronization.
- Stock movement history and receiving/usage/transfer workflows.
- Purchasing and suppliers.
- Barcode workflows and low-stock alerts.
- Unit conversion and aliases.
- Expanded notes and related-item interfaces; retain existing capabilities while prioritizing core inventory workflows.

## Progress and decision log

| Date | Update |
| --- | --- |
| 2026-10-18 | Recorded repository baseline, agreed requirements, implementation defaults, milestones, and acceptance criteria. No application code or database records changed. |
| 2026-10-18 | Added baseline tooling, documentation, fixtures/seeder, and three passing isolated tests. Local MongoDB unavailable; persistence/browser verification remains open. |
| 2026-10-18 | Corrected database availability assessment: configured MongoDB connects and responds to ping outside the network-restricted sandbox. The earlier check covered only localhost. No inventory records read or changed. |
| 2026-10-18 | Completed milestone 1 with fresh locked installs and real browser/database workflows in isolated databases. Began milestone 2 with decimal stock schema, exact totals, GraphQL reads, validation tests, and migration documentation. Existing inventory remains untouched. |
| 2026-10-18 | Continued milestone 2 with additive category parents, canonical multi-category item membership, GraphQL relationship reads, legacy-write guards, and isolated persisted hierarchy fixtures. All 11 tests, lint, build, and database/browser smoke checks pass. Public writes, concurrency protection, UI transition, and migration remain open; checkpoint above records the next work. |
| 2026-10-18 | Added authenticated typed inventory creation and version-checked item replacement. Pulled bearer-token transport and environment signing-secret setup forward from milestone 3. Restricted legacy writes, blocked canonical/location deletion, and verified exact decimal writes, unlinking, ownership, and simultaneous edit rejection. All 14 backend tests, lint, build, and isolated database/browser checks pass. UI, authorized reads/sharing, hierarchy moves/deletions, and migration remain open. |
| 2026-10-18 | Completed milestone 2's canonical model and fixture criteria with an owner-scoped snapshot and default inventory UI. Verified nested categories, mixed-unit decimal stock, deduplication, conflict reload, unlinking, empty stock, and mobile width. Earlier records remain on `/legacy-lists`, excluded from canonical totals. Remaining moves/deletions and executable migration work are tracked in their original milestones 3–5, rather than extending milestone 2 beyond its model/migration-requirements scope. |
