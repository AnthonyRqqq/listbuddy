# Inventory model: milestone 2

Status: milestone 2's canonical model and fixture criteria are complete, including the owner UI and version-checked editing. Hierarchy moves, explicit deletions, sharing, and executable migration remain follow-on work. No migration has run against existing inventory.

## Additive category and membership model

`Category.parent_category` is the canonical single parent. Undefined means legacy/unmigrated hierarchy; null explicitly marks a root. Document validation walks ancestors iteratively without a fixed depth limit, rejecting cycles (including preexisting ancestor cycles), missing ancestors, other-owner ancestors, and ancestors whose hierarchy has not been migrated. Canonical roots require an owner too.

`Item.category_ids` is the canonical membership list. Undefined means legacy membership; an empty list explicitly means unassigned. Document validation requires an owner, rejects duplicate IDs, and checks every category exists with that owner. Category-side legacy `items` and `subcategory` arrays are not synchronized or used to infer canonical relationships on reads.

GraphQL adds `Category.parent_category_id`, `child_categories`, `member_items`, and `Item.category_ids`. Children come from parent references; member items come from item category IDs, filtered by category owner. Legacy categories return null for canonical children; member items always query explicit canonical memberships (an empty result makes no claim about legacy `items`). Nullable parent IDs alone cannot distinguish roots from legacy records. Existing legacy GraphQL fields remain intact for the current client.

The generic create API rejects canonical stock/relationship fields both in record data and additional relationship updates, including dotted paths. Legacy relationship updates only permit push/pull on the existing UI's User items/categories and Category items/subcategory fields, require ownership, and reject canonical category targets. Legacy inventory creation derives its owner from the verified token; generic account creation is disabled in favor of signup. Generic update now explicitly rejects requests rather than silently doing nothing.

Canonical categories and items, plus all locations, cannot be deleted through the generic delete operation. Legacy category deletion also checks canonical references. This intentionally blocks deletion until explicit operations with concurrency protection are available. Model validation alone cannot serialize two simultaneous category moves; no public move operation is exposed yet. New category creation only links a new node beneath existing ancestors, and those ancestors cannot be publicly moved or deleted.

`server/fixtures/inventory.js` creates three category levels and a stock item linked at both the root and leaf. The smoke runner reads both memberships through GraphQL and confirms exact, deduplicated mixed-unit totals. Backend tests also exercise 40 levels, invalid ancestors, duplicates, and legacy compatibility.

## Additive stock model

`Item.stock_entries` is an optional array of embedded entries with their own IDs, optional Location reference, required Decimal128 quantity, and optional unit. An absent array means a legacy item; an empty array means explicitly no stock entries. New stock documents require `primary_user`. Referenced locations must exist and have that same owner, checked during document validation/save. Locations may be reused across entries and items. Unspecified location and unit are represented by null.

Quantities enter model code as plain nonnegative decimal strings, never JavaScript numbers. Normalize leading/trailing zeros, allow at most 34 significant digits, at most 34 integer digits, and at most 28 decimal places. Reject negative values, exponent input, NaN/infinity, whitespace, and excess precision. Stored Decimal128 scientific notation is expanded when serializing. Totals use BigInt arithmetic and can exceed individual-entry precision without rounding.

Unit labels are trimmed and case-sensitive. Empty/whitespace labels become null. Totals group by the normalized unit, including a separate null group; there is no conversion. Aggregation deduplicates by item ID so category overlap does not multiply stock. Aggregating an unmigrated item raises an error rather than silently treating its stock as zero.

## GraphQL compatibility

The additive Item fields are `stock_entries: [StockEntry!]` and `stock_totals: [StockTotal!]`. Entry fields are `_id`, `location_id`, `quantity: String!`, and nullable `unit`. Totals contain `quantity: String!` and nullable `unit`. Both Item fields return null for legacy records. Explicitly empty stock returns empty arrays.

The legacy `quantity` and `location` fields remain unchanged for the existing UI. They are not synchronized with the new stock array and must not be used to summarize new stock documents. The generic create operation rejects `stock_entries`; typed operations below support the canonical model. Do not introduce raw/query updates to stock without equivalent validation and location-owner checks; document hooks do not protect raw MongoDB writes.

## Authenticated inventory operations

Requests use `Authorization: Bearer <token>`. Tokens are HS256, expire after two hours, and use the required private `JWT_SECRET` (at least 32 characters). Each inventory write also verifies the user still exists. Owner identity is never an input to typed mutations. The client now sends tokens for its existing operations. Invalid tokens are rejected in request context; anonymous signup/login remain available.

| Mutation | Input and behavior |
| --- | --- |
| `createInventoryCategory` | `input: {title, parent_category_id?}`. Omitted/null parent creates a canonical root; ancestors must be owned and migrated. |
| `createInventoryLocation` | `title: String!`. Creates a reusable location owned by the caller. |
| `createInventoryItem` | `input: {title, category_ids, stock_entries}`. Both arrays are required and may be empty. Categories must be unique, owned, and canonical. |
| `replaceInventoryItem` | `id`, `expected_version`, and the same complete item input. Replaces title, memberships, and stock on an owned canonical item. Legacy items require migration first. |

Each stock input has `quantity: String!`, optional `location_id`, and optional `unit`. Empty arrays explicitly remove memberships/stock; omitting arrays is rejected. Removing a membership retains the item and its remaining memberships. Replacement assigns fresh stock entry IDs; callers must refresh the returned item instead of preserving entry IDs across replacements.

`Item.version` exposes Mongoose's version counter. Replacement loads and validates the proposed document, then updates using one atomic `_id`/owner/version filter and increments the version. A stale or losing simultaneous edit returns GraphQL code `CONFLICT` with a reload instruction. No partial title/membership/stock update is committed on conflict. This protects against these public writes, not arbitrary external database writes. Relationship existence remains stable because public category moves and canonical/location deletions are blocked; add equivalent transaction/serialization safeguards before enabling those operations.

These operations currently serve owners only. Legacy read resolvers still lack authorization, and inherited viewer/editor permissions remain milestone 3; this is not a completed security boundary or release-ready API.

## Owner inventory UI and snapshot

`myInventory` accepts no owner input, verifies the signed-in account, and queries categories/items/locations by that owner. Its dedicated view types expose only inventory fields, without nested account or sharing relationships. It returns canonical categories and items, reusable owned locations, exact inventory-wide totals, and counts of excluded legacy records. Both category IDs and stock arrays must exist for an item to be included; partial legacy records remain excluded rather than counted as zero. The query currently loads the whole owned inventory; pagination is future scaling work.

The default `/lists` screen uses this snapshot with no Apollo result caching, refetches after successful mutations, and remounts on token changes. Category paths show nesting; item filters select direct category memberships or unassigned items. Aggregate totals always cover the whole canonical inventory, independent of the current filter. Entry quantities remain strings in forms and API variables. The owner can create categories/locations/items and edit title, all memberships, and all stock entries. No unit conversion is performed.

On a conflict, the form retains the unsaved draft and blocks resubmission until the owner explicitly discards it and reloads the latest version (or cancels). Empty memberships keep the item accessible under Unassigned; empty stock remains explicit. Desktop and 390px mobile-width smoke checks cover creation, decimal totals, persistence, conflict recovery, unlinking, and empty stock.

`/legacy-lists` retains earlier forms and hides canonical categories using `Category.uses_inventory_model`. A notice links to it when the snapshot reports legacy records. Legacy quantities are excluded from canonical totals and no migration happens on read. The shared-inventory tab explicitly reports that sharing is pending rather than showing the owner's data as shared inventory.

## Follow-on work (milestones 3–5)

- Add concurrency protection for hierarchy edits and deletion guards before public relationship mutations.
- Migrate legacy category/item arrays into the implemented canonical parent and membership fields after a reviewed report and rehearsal.
- Extend owner-only operations to inherited editor/viewer permissions in milestone 3 and protect all reads.
- Add remaining discovery, location management, and collaboration workflows; complete keyboard/mobile acceptance coverage.
- Remove the earlier-list interface only after reviewed migration and compatibility verification.

## Migration requirements (no executable migration yet)

1. Back up the selected database and verify restore procedures. Run a read-only inventory of schema versions, owner references, quantities, locations, category links, missing references, and duplicate memberships. No such inventory of real records has been performed yet.
2. Produce a report with proposed changes and unresolved records. Legacy items without valid owners, negative/nonfinite quantities, or incompatible relationships require resolution; do not guess owners or discard data.
3. Convert each valid legacy quantity into one decimal-string stock entry. Binary floating-point values already stored cannot regain lost precision; document the string conversion and flag suspicious values for review.
4. Preserve a location only if it refers to an actual Location belonging to the owner. The legacy UI sometimes stored a Category ID in `location`: report these, preserve category membership separately, and require explicit resolution before choosing an unspecified stock location.
5. Translate category child arrays into one parent per category. Report multiple parents and cycles rather than arbitrarily selecting a parent. Derive canonical item memberships from category item arrays, deduplicate, and reject cross-owner memberships for review.
6. Rehearse on a disposable copy; verify record counts, ownership, per-unit totals, references, and representative queries. Keep old fields during the compatibility period. Migration must be idempotent: never overwrite already-migrated stock or duplicate entries on rerun.
7. Apply only after the report is resolved, with writes paused or a documented concurrency strategy. Record migrated IDs/version and pre-change values. Rollback must restore those values without erasing stock edits made after migration; if writes resumed, reconcile rather than blindly restoring.

Owner/location document validation provides data integrity; request identity and owner checks now protect public writes. Full read authorization and inherited sharing enforcement remain milestone 3.
