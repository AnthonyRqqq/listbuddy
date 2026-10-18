# Inventory model: milestone 2

Status: stock-entry foundation implemented; category hierarchy, membership migration, public writes, and UI transition remain pending. No migration has run against existing inventory.

## Additive stock model

`Item.stock_entries` is an optional array of embedded entries with their own IDs, optional Location reference, required Decimal128 quantity, and optional unit. An absent array means a legacy item; an empty array means explicitly no stock entries. New stock documents require `primary_user`. Referenced locations must exist and have that same owner, checked during document validation/save. Locations may be reused across entries and items. Unspecified location and unit are represented by null.

Quantities enter model code as plain nonnegative decimal strings, never JavaScript numbers. Normalize leading/trailing zeros, allow at most 34 significant digits, at most 34 integer digits, and at most 28 decimal places. Reject negative values, exponent input, NaN/infinity, whitespace, and excess precision. Stored Decimal128 scientific notation is expanded when serializing. Totals use BigInt arithmetic and can exceed individual-entry precision without rounding.

Unit labels are trimmed and case-sensitive. Empty/whitespace labels become null. Totals group by the normalized unit, including a separate null group; there is no conversion. Aggregation deduplicates by item ID so category overlap does not multiply stock. Aggregating an unmigrated item raises an error rather than silently treating its stock as zero.

## GraphQL compatibility

The additive Item fields are `stock_entries: [StockEntry!]` and `stock_totals: [StockTotal!]`. Entry fields are `_id`, `location_id`, `quantity: String!`, and nullable `unit`. Totals contain `quantity: String!` and nullable `unit`. Both Item fields return null for legacy records. Explicitly empty stock returns empty arrays.

The legacy `quantity` and `location` fields remain unchanged for the existing UI. They are not synchronized with the new stock array and must not be used to summarize new stock documents. The current generic create operation rejects `stock_entries`; the new model is exercised by fixtures and internal tests until validated public write operations and UI support are implemented. Existing generic update is still unfinished. Do not introduce raw/query updates to stock without equivalent validation and location-owner checks; document hooks do not protect raw MongoDB writes.

## Remaining model work

- Add one optional category parent, same-owner checks, and cycle prevention.
- Establish canonical item-to-category membership for multiple categories owned by one user; avoid maintaining conflicting relationship arrays.
- Require owners for newly created categories, locations, and items through explicit public operations.
- Add fixtures demonstrating nested categories and shared membership through the persisted model; current duplicate-count tests exercise the aggregation helper only.
- Implement explicit stock writes, frontend transition, and conflict handling before deprecating legacy fields.

## Migration requirements (no executable migration yet)

1. Back up the selected database and verify restore procedures. Run a read-only inventory of schema versions, owner references, quantities, locations, category links, missing references, and duplicate memberships. No such inventory of real records has been performed yet.
2. Produce a report with proposed changes and unresolved records. Legacy items without valid owners, negative/nonfinite quantities, or incompatible relationships require resolution; do not guess owners or discard data.
3. Convert each valid legacy quantity into one decimal-string stock entry. Binary floating-point values already stored cannot regain lost precision; document the string conversion and flag suspicious values for review.
4. Preserve a location only if it refers to an actual Location belonging to the owner. The legacy UI sometimes stored a Category ID in `location`: report these, preserve category membership separately, and require explicit resolution before choosing an unspecified stock location.
5. Translate category child arrays into one parent per category. Report multiple parents and cycles rather than arbitrarily selecting a parent. Derive canonical item memberships from category item arrays, deduplicate, and reject cross-owner memberships for review.
6. Rehearse on a disposable copy; verify record counts, ownership, per-unit totals, references, and representative queries. Keep old fields during the compatibility period. Migration must be idempotent: never overwrite already-migrated stock or duplicate entries on rerun.
7. Apply only after the report is resolved, with writes paused or a documented concurrency strategy. Record migrated IDs/version and pre-change values. Rollback must restore those values without erasing stock edits made after migration; if writes resumed, reconcile rather than blindly restoring.

The owner/location validation in this foundation is data integrity, not authentication. Verified request identity and inherited sharing enforcement remain milestone 3.
