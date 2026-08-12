# Implementation plan — make `previous month corrections` work again (option 1b)

Card `843706280` on the `fte reporting` dashboard cannot show a Weekly Allocation correction
today. This plan makes it work by having the app record the pre-correction value on the
document itself, instead of the ETL trying to recover it from a document version history that
no longer exists.

Read alongside [`domo_reporting_dashboard.md` §4.10](domo_reporting_dashboard.md),
[`fte_full_calendar_allocation.md` §2.3](fte_full_calendar_allocation.md) and
[`_domo_export/beast_modes.md` #4–#5](_domo_export/beast_modes.md).

---

## 1. Why the card is empty

The Weekly Allocation grid **upserts**. On save, a cell that already has an AppDB document id
is written with `PUT` ([`multi-week-grid.tsx:699`](../src/components/allocation/multi-week-grid.tsx)),
so the collection holds exactly one document per
`(allocation_date, allocation_name, cost_center_name)` for the life of that allocation.

The card needs two. Its third measure is Beast Mode `change in allocation ` =
`previous_fte_value - allocation_amount`, filtered `NOT IN ('', 0)`, and `previous_fte_value`
comes from the ETL as `LEAD(allocation_amount, 1)` over `__created__ DESC` — "the second-newest
document for this key". One document ⇒ `LEAD` is `NULL` ⇒ `change in allocation` is `NULL` ⇒ the
`NOT IN ('')` filter drops the row. No weekly correction can ever appear.

The card's *other* half is fine: `current_month_flag`
(`LAST_DAY(__modified__) = LAST_DAY(CURRENT_DATE())`) does detect "edited this month", because
`PUT` bumps `__modified__`. Only the before-value is unrecoverable.

Two consequences worth stating before touching anything:

- **`domo_reporting_dashboard.md` §1.1 is now false.** It says the dataset "holds every version
  of every allocation document" and that `rank > 1` rows are superseded edits. For weekly rows
  there are no superseded versions, so `rank` is always 1 and the twelve `rank = 1` filters are
  no-ops. Harmless, but the doc misleads whoever reads it next.
- **Anything currently visible on the card is not a weekly correction.** The monthly-ratio and
  Freshservice grids write to the same collection `POST`-only
  ([`monthly-ratio-grid.tsx:202`](../src/components/monthly-ratio-allocation/monthly-ratio-grid.tsx),
  [`monthly-freshservice-grid.tsx:331`](../src/components/monthly-freshservice-allocation/monthly-freshservice-grid.tsx)),
  so their re-saves *do* stack documents and *do* satisfy `LEAD`. Those rows are re-saves being
  reported as corrections.

## 2. The design

Record the baseline on the document, stamped with the month the correction cycle started, and
never overwrite it within that cycle. Three new fields in `content`:

| Field | Type | Meaning |
|---|---|---|
| `baseline_fte_value` | number | `allocation_amount` as it stood before the first correction of this cycle |
| `correction_month` | string `"YYYY-MM"` | the month that cycle started — the "was corrected in" stamp |
| `correction_count` | number | how many corrections in that cycle *(optional, §6)* |

Stamping rule, applied on `PUT` only when the document's week belongs to a **closed** month
(i.e. a retroactive edit):

```
if (loaded.correction_month !== currentMonthKey) {
  baseline_fte_value = loaded.amount        // first correction this cycle
  correction_month   = currentMonthKey
  correction_count   = 1
} else {
  baseline_fte_value = loaded.baseline_fte_value   // preserve — do NOT recompute
  correction_month   = loaded.correction_month
  correction_count   = loaded.correction_count + 1
}
```

**This is what handles multiple corrections.** The baseline is written once per cycle, so
1.0 → 0.8 → 0.5 reports `previous 1.0, current 0.5, change 0.5`, not the 0.3 that a
last-value-only scheme (or today's `LEAD`) would report.

The grid only permits edits to the current and previous month
([`multi-week-grid.tsx:369`](../src/components/allocation/multi-week-grid.tsx)), so a given
document can only ever be corrected during one calendar month. `correction_month` is therefore
provably written once per document today. Keep the guard anyway — it is what makes the scheme
survive someone widening that window later.

### Why not a revisions array

`content: { revisions: [{amount, at}] }` would be the obvious way to keep full history, but the
AppDB → dataset connector does not flatten nested arrays into queryable columns. Full history
needs a separate flat audit collection, which is a bigger change than this.

---

## 3. App changes

All in [`src/components/allocation/multi-week-grid.tsx`](../src/components/allocation/multi-week-grid.tsx)
plus the type in [`src/types/index.ts`](../src/types/index.ts).

### 3.1 Types

Extend `WeeklyAllocation['content']` (`src/types/index.ts:52`) with the three optional fields.
Optional, because every document written before this ships lacks them.

In `multi-week-grid.tsx`, `AllocationRow` (line 58) currently keeps only the *edited* values, so
there is nothing to diff a save against. Add a loaded snapshot:

```ts
type LoadedCell = {
  docId: string;
  amount: number;
  costCenterName: string;
  costCenterNumber: string;
  baselineFteValue: number | null;
  correctionMonth: string | null;
  correctionCount: number;
};

type AllocationRow = {
  // ...existing fields
  loaded: { [weekKey: string]: LoadedCell };
};
```

Keep `docIds` as it is. It is read by `handleRemoveAllocationRow` and the `pendingDeletions`
path, and duplicating the id into `loaded` is cheaper than refactoring those.

### 3.2 Populate the snapshot on load

In `fetchMonthData`, in the same `forEach` that fills `weeklyFtes` and `docIds`
(lines 423–428), also write `loaded[a.content.allocation_date]` from `a.content`. Default
`correctionCount` to `0` and the other two to `null` when absent.

Also initialise `loaded: {}` at the two places a fresh empty row is created (line 414 and
`handleAddAllocationRow`, line 643) or the type will not satisfy.

### 3.3 Dirty-check the save loop

`handleSave` currently `PUT`s **every** editable cell it has loaded, with no comparison against
what was loaded (lines 676–711). One "Save All" therefore bumps `__modified__` on rows nobody
touched. That has been invisible so far; under this design it is not, and it also inflates
`correction_count`. Skip unchanged cells:

```ts
const loaded = alloc.loaded[key];
const nextCcNumber = alloc.clientId || alloc.clientName;
const isDirty = !loaded
  || loaded.amount !== fte
  || loaded.costCenterName !== alloc.clientName
  || loaded.costCenterNumber !== nextCcNumber;

if (existingDocId && !isDirty) return;   // nothing to write
```

Compare the cost-centre fields too, not just the amount — `handleClientChange` (line 626) can
change the client on an existing row, and the `PUT` rewrites `cost_center_name` on the same
document (line 684).

### 3.4 Stamp the baseline

Build a `Map<string, Date>` from `weeks` once (week key → `startDate`) rather than parsing the
key string, then reuse the same owning-month rule the editability check uses:

```ts
const monthValue = (d: Date) => d.getFullYear() * 12 + d.getMonth();
const currentMonthKey = format(todayRef, 'yyyy-MM');
const isRetroactive = monthValue(getOwningMonth(weekStart)) < monthValue(todayRef);
```

Using `getOwningMonth` (not the raw Monday) keeps this on the same Friday-offset rule as
`month_greg` in the ETL — see [`fte_full_calendar_allocation.md` §3](fte_full_calendar_allocation.md).
If `OWNING_MONTH_OFFSET_DAYS` ever changes, this moves with it.

Then apply the §2 rule when `existingDocId && isRetroactive`.

> **A Domo AppDB `PUT` replaces the entire `content` object.** The existing code builds `content`
> from scratch on every save, so any field not explicitly included is *deleted*. A later
> current-month `PUT` on a document that already carries a baseline must copy all three fields
> through unchanged, or the correction record is silently erased before the ETL ever sees it.
> This is the most likely bug in this change — cover it in the §5 test matrix.

### 3.5 A client change drops the correction record

Found while implementing. `handleClientChange` rewrites `cost_center_name` on the *same*
document, so the document migrates to a different reporting key — and the corrections card
groups by cost centre. Carrying a baseline across would attribute the old cost centre's previous
value to the new one ("Siemens: previous 1.0" when it was Philips that held 1.0).

`correctionFieldsFor` therefore returns no fields when the cost centre changed, which drops the
record and treats the row as a fresh allocation. The genuine FTE correction in that save is lost
from the card as a result. That is the lesser evil — a correction attributed to the wrong cost
centre is worse than a missing one — but the honest fix is `DELETE` + `POST` on a client change
so the two keys stay distinct. Out of scope here.

### 3.6 Deliberately out of scope

- **`POST` (a brand-new allocation added to a closed month).** No prior value exists, so
  `change in allocation` is `NULL` and the card drops it. Same as today's behaviour.
- **`DELETE` (a cell cleared to un-allocate, line 715).** The document leaves the dataset
  entirely, taking any baseline with it. An explicit `0` does persist as a real row, so the only
  blind spot is a full un-allocation. Closing it means writing a tombstone (`0` plus the
  baseline fields) instead of deleting, which also changes how `fetchMonthData` reconstructs
  cleared cells — a separate change.

Note both in the card description so nobody reads the card as exhaustive.

---

## 4. ETL and card changes

The live chain is AppDB → Magic ETL `fte_full_calendar_allocation` (`0ce8e039-…`) →
`fte_full_calendar_allocation_view` (`eeba8836-…`) → card. The `densify_full_calendar_allocation`
MySQL flow is shelved and not in the path.

**Do the app deploy first.** Until the ETL changes, the new fields are just extra columns nobody
reads, `previous_fte_value` still comes from `LEAD` (still `NULL` for weekly rows), and the card
behaves exactly as it does now. There is no window where reporting is worse than today.

1. **Let the AppDB dataset pick up the schema.** After the first save that writes the new fields,
   confirm `baseline_fte_value`, `correction_month` and `correction_count` appear as columns on
   the `weekly_allocation_…_APP_DB` dataset. Nothing downstream works until they do.

2. **Cast `baseline_fte_value` to DOUBLE — at the load tile, not later.** On the
   `weekly_allocation_…_APP_DB` `LoadFromVault` tile, add a `baseline_fte_value` → DOUBLE column
   type override next to the `allocation_amount` one that is already there.

   **Not** the `Alter Columns` tile in the weekly branch: it runs *after* `Add Formula 2`, so
   `previous_fte_value` would already have been assigned from the STRING and would stay a STRING
   even though `baseline_fte_value` gets cast. The card displays `SUM(previous_fte_value)`, and
   summing text is the part that breaks — while the subtraction may coerce to a plausible-looking
   answer, which hides it. Casting at the load tile makes `previous_fte_value` inherit DOUBLE.

   This also restores the old behaviour: `LEAD(allocation_amount, 1)` inherited DOUBLE because
   `allocation_amount` is force-cast at load.

3. **Replace the `LEAD` window.** In the weekly branch's `Rank & Window` tile
   ([§2.3](fte_full_calendar_allocation.md)), delete the
   `previous_fte_value = LEAD(allocation_amount, 1)` output. Keep `rank` — twelve cards filter on
   it. Then add `previous_fte_value = baseline_fte_value` in the adjacent `Add Formula 2`.

   Aliasing back into `previous_fte_value` is deliberate: every downstream tile, the Beast Mode
   and the card already carry that column, so nothing else needs touching. Removing `LEAD` also
   stops the ratio/Freshservice re-saves from appearing as corrections, since their stacked
   documents were the only thing `LEAD` was still finding.

4. **Add `correction_month` to `Group By 2`.** That tile sums `allocation_amount` over ~29
   descriptive columns; a column not listed there is dropped. `previous_fte_value` is already in
   the list (the card reads it downstream), so the alias in step 3 needs nothing — but
   `correction_month` will vanish unless added as a group-by column. **This is the step most
   likely to be forgotten**, and the symptom is a card filter on a column that isn't there.

5. **Redefine the `current_month_flag` Beast Mode — do not touch the card filter.** BM `11771`
   becomes:

   ```sql
   CASE WHEN `correction_month` = DATE_FORMAT(CURRENT_DATE(), '%Y-%m') THEN 1 ELSE 0 END
   ```

   The card's existing `current_month_flag = 1` filter then needs no edit. Do **not** put a
   literal month into the card filter instead — `correction_month = '2026-08'` works this month
   and silently reports nothing next month. The gain over the old `LAST_DAY(__modified__)`
   definition is precision: `__modified__` moves on any write, `correction_month` only where an
   FTE actually changed. This BM's only consumer is this card (filter only, never displayed).

   **Check which column the card's date range runs on.** `correction_month` is stamped from
   `getOwningMonth`, i.e. the Friday rule, so it is Gregorian-aligned with `month_greg`. If the
   `INTERVAL_OFFSET MONTH offset 1` range is on a fiscal column, edge weeks disagree — Mon
   2026-07-27 is fiscal **August** but Gregorian **July**, so that correction would be stamped
   July and fall outside an August-fiscal range. See [§1.3 and §3](fte_full_calendar_allocation.md).

6. **Leave the sign convention alone, but label it.** `change in allocation ` stays
   `previous - current`, so positive means the allocation went *down* — the opposite of
   `Net Change MoM` one section up ([§5.6](domo_reporting_dashboard.md)). Renaming the Beast Mode
   is out of scope here; at minimum put the direction in the column header or card description.

7. **No backfill is possible.** No pre-correction values were ever stored. The card stays empty
   of weekly rows until the first correction after deploy, then fills going forward. Say so on
   the card so an empty card doesn't read as "no corrections were made".

---

## 5. Verification

Sandbox, one employee, a client with a known amount. `PM` = previous month, `CM` = current month.

| # | Scenario | Expect in AppDB | Expect on card |
|---|---|---|---|
| 1 | Edit a PM cell 1.0 → 0.8 | `baseline 1.0`, `correction_month = CM`, `count 1`, `__modified__` bumped | prev 1.0, curr 0.8, change 0.2 |
| 2 | Edit the same cell 0.8 → 0.5 | `baseline` still **1.0**, `count 2` | prev 1.0, curr 0.5, change **0.5** |
| 3 | Edit a CM cell | all three fields absent/unchanged | absent (date range excludes CM) |
| 4 | **Edit a CM cell on a row whose PM sibling was corrected** | PM document's three fields **intact** | scenario 1/2 row still present |
| 5 | Save with no edits | no `PUT` issued at all; `__modified__` unchanged | nothing new |
| 6 | Change the client on a corrected PM row | `PUT` fires; all three fields **dropped** (§3.5) | row disappears from the card |
| 7 | Edit a PM cell to `0` | `baseline` = old value, amount `0` | change = old value |
| 8 | Clear a PM cell | document deleted | absent — known gap (§3.5) |

Scenario 4 is the `PUT`-replaces-`content` trap. Scenario 5 is the dirty-check. Neither is
visible without inspecting the document directly — read it back through
`/domo/datastores/v1/collections/weekly_allocation/documents/<id>`, not just the grid.

Then run the ETL and reconcile: the card's row count should equal the number of distinct
`(week, employee, cost centre)` triples where `correction_month` = the current month and
`baseline_fte_value <> allocation_amount`.

---

## 6. Sequencing

1. App: types, snapshot, dirty-check, baseline stamp (§3). `npm run typecheck`.
2. Bump the Domo app version in `public/manifest.json` — **confirm the next version number
   first**, the committed value lags what is deployed and a stale one fails with `DA0081`.
3. `npm run deploy`, verify on sandbox against the §5 matrix (steps 1–8 are all app-side except
   the card column).
4. ETL steps 4.1–4.4, run the flow, confirm `previous_fte_value` is populated on exactly the
   corrected rows and `NULL` elsewhere.
5. Card steps 4.5–4.7.
6. Docs: correct [`domo_reporting_dashboard.md` §1.1](domo_reporting_dashboard.md) (weekly rows
   have no version history), rewrite §4.10's mechanism paragraph, update
   [`beast_modes.md`](_domo_export/beast_modes.md) #4 and #5, and update
   [`fte_full_calendar_allocation.md` §2.3](fte_full_calendar_allocation.md) for the
   `Rank & Window` change.

`correction_count` can be dropped from a first pass — it costs one more column in `Group By 2`
and buys the "how many times was this revised" column. The baseline mechanism does not depend
on it.

## 7. Related, not fixed here

The ratio and Freshservice grids are `POST`-only, so every re-save appends a duplicate document
for the same month/name/cost centre. Removing `LEAD` stops those duplicates from surfacing as
corrections, but they still double-count in any `SUM(allocation_amount)` on a card that does not
filter `rank = 1` — and `rank` only deduplicates them because they *do* stack versions. Worth a
separate look at which cards are exposed.
