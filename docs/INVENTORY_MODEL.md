# Inventory model: milestone 2

Status: stock-entry, category hierarchy, and multiple-category membership foundations implemented and verified with isolated persisted fixtures. Migration, public writes, and UI transition remain pending. No migration has run against existing inventory.

## Additive category and membership model

`Category.parent_category` is the canonical single parent. Undefined means legacy/unmigrated hierarchy; null explicitly marks a root. Document validation walks ancestors iteratively without a fixed depth limit, rejecting cycles (including preexisting ancestor cycles), missing ancestors, other-owner ancestors, and ancestors whose hierarchy has not been migrated. Canonical roots require an owner too.

`Item.category_ids` is the canonical membership list. Undefined means legacy membership; an empty list explicitly means unassigned. Document validation requires an owner, rejects duplicate IDs, and checks every category exists with that owner. Category-side legacy `items` and `subcategory` arrays are not synchronized or used to infer canonical relationships on reads.

GraphQL adds `Category.parent_category_id`, `child_categories`, `member_items`, and `Item.category_ids`. Children come from parent references; member items come from item category IDs, filtered by category owner. Legacy categories return null for canonical children; member items always query explicit canonical memberships (an empty result makes no claim about legacy `items`). Nullable parent IDs alone cannot distinguish roots from legacy records. Existing legacy GraphQL fields remain intact for the current client.

The generic create API rejects canonical stock/relationship fields both in record data and additional relationship updates, including dotted paths. No public canonical mutation is available yet. Model validation is not a concurrency guarantee: two simultaneous moves could each pass validation and introduce a cycle. Explicit mutations must serialize conflicting hierarchy changes or use an equivalent database concurrency protocol, guard referenced deletions, and enforce verified identity before exposure. Raw/query updates bypass document hooks and must not be used for canonical edits without equivalent safeguards.

`server/fixtures/inventory.js` creates three category levels and a stock item linked at both the root and leaf. The smoke runner reads both memberships through GraphQL and confirms exact, deduplicated mixed-unit totals. Backend tests also exercise 40 levels, invalid ancestors, duplicates, and legacy compatibility.

## Additive stock model

`Item.stock_entries` is an optional array of embedded entries with their own IDs, optional Location reference, required Decimal128 quantity, and optional unit. An absent array means a legacy item; an empty array means explicitly no stock entries. New stock documents require `primary_user`. Referenced locations must exist and have that same owner, checked during document validation/save. Locations may be reused across entries and items. Unspecified location and unit are represented by null.

Quantities enter model code as plain nonnegative decimal strings, never JavaScript numbers. Normalize leading/trailing zeros, allow at most 34 significant digits, at most 34 integer digits, and at most 28 decimal places. Reject negative values, exponent input, NaN/infinity, whitespace, and excess precision. Stored Decimal128 scientific notation is expanded when serializing. Totals use BigInt arithmetic and can exceed individual-entry precision without rounding.

Unit labels are trimmed and case-sensitive. Empty/whitespace labels become null. Totals group by the normalized unit, including a separate null group; there is no conversion. Aggregation deduplicates by item ID so category overlap does not multiply stock. Aggregating an unmigrated item raises an error rather than silently treating its stock as zero.

## GraphQL compatibility

The additive Item fields are `stock_entries: [StockEntry!]` and `stock_totals: [StockTotal!]`. Entry fields are `_id`, `location_id`, `quantity: String!`, and nullable `unit`. Totals contain `quantity: String!` and nullable `unit`. Both Item fields return null for legacy records. Explicitly empty stock returns empty arrays.

The legacy `quantity` and `location` fields remain unchanged for the existing UI. They are not synchronized with the new stock array and must not be used to summarize new stock documents. The current generic create operation rejects `stock_entries`; the new model is exercised by fixtures and internal tests until validated public write operations and UI support are implemented. Existing generic update is still unfinished. Do not introduce raw/query updates to stock without equivalent validation and location-owner checks; document hooks do not protect raw MongoDB writes.

## Remaining model work

- Add concurrency protection for hierarchy edits and deletion guards before public relationship mutations.
- Migrate legacy category/item arrays into the implemented canonical parent and membership fields after a reviewed report and rehearsal.
- Require owners for newly created categories, locations, and items through explicit public operations.
- Wire canonical relationships and stock into frontend queries/forms/cache; existing UI still uses legacy fields.
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
