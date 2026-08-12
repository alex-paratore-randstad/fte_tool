# Building `densify_full_calendar_allocation` in Domo

> **SHELVED — not deployed, and not currently needed.** The monthly-average bug was instead fixed in
> the app: users can now enter an explicit `0` in the Weekly Allocation grid and it persists, so the
> zero reaches reporting attached to its cost centre. See §6.1 of
> [`../fte_full_calendar_allocation.md`](../fte_full_calendar_allocation.md).
>
> This is kept because it remains a working option. The app fix only creates a row where somebody
> types a `0` — untouched weeks and existing history are unaffected. If that limitation proves
> unacceptable, this dataflow is the way to close the gap, and it also backfills history.
>
> It was never successfully run: the first build attempt returned no rows from transform 1. The open
> diagnostic is under **Troubleshooting** below.

Step-by-step build and cutover for
[`densify_full_calendar_allocation.sql`](densify_full_calendar_allocation.sql).

**What it fixes:** the monthly total on card `fte level allocations` (1659132694) averages by weeks
*with data* instead of weeks *in the month*, so a person split across cost centres over-reports —
their rows sum to more than their FTE. Background in
[`../domo_reporting_dashboard.md` §5.3](../domo_reporting_dashboard.md) and
[`../fte_full_calendar_allocation.md` §6.1](../fte_full_calendar_allocation.md).

**Shape of the change:** a new MySQL dataflow downstream of the existing Magic ETL. It copies every
row through unchanged and adds a zero-amount row wherever a `(person, cost centre, type)` active in
a month has no row for one of that month's Mondays. No Beast Mode changes. One card gains a filter.

**Time:** roughly an hour to build and run, plus however long you want to sit on the scratch output
before cutting over. There is no rush on step 3 — nothing is live until then.

---

## Phase 0 — before you start (optional, ~10 min)

Not gates, but they tell you what to expect. Run from any card's SQL preview or a scratch dataflow
against `fte_full_calendar_allocation`; the queries are §7.1–§7.5 of
[`../fte_full_calendar_allocation.md`](../fte_full_calendar_allocation.md).

| Query | Tells you |
|---|---|
| §7.1 | How many person-cost-centre-months are affected, by month |
| §7.2 | How many rows the output will gain — sanity-check against the real delta later |
| §7.3 | Whether anything varies within a triple (affects note E in the SQL) |
| §7.4 | Whether bulk lands on fiscal or Gregorian Mondays — **run this one**, it predicts whether bulk numbers visibly drop |
| §7.5 | Whether cost-centre names have whitespace or case variants |

---

## Phase 1 — build the dataflow

**Do not point the output at `0ce8e039-…`.** That dataset is owned by the Magic ETL. This flow
creates a new one.

### 1.1 Create it

Data → DataFlows → New DataFlow → **MySQL**.

- **Name:** `densify_full_calendar_allocation`
- **Description:** Adds zero rows at person-cost-centre-week grain so monthly averages divide by
  weeks in the month, not weeks with data.

### 1.2 Input DataSets

**Select DataSet** → `fte_full_calendar_allocation` (`0ce8e039-d17a-4af9-911d-6d96ff6f7e2e`).

The alias must be exactly `fte_full_calendar_allocation`. Every statement references it by that
name — if Domo aliases it differently, either rename it or find-and-replace throughout the SQL.

### 1.3 Transforms

Add five, **in this order**. Copy each block from the `.sql` file, then set its indexes on the
transform's **INDEXING** tab (not in SQL).

| # | Name | Block | INDEXING tab |
|---|---|---|---|
| 1 | `act` | TRANSFORM 1 — active triples | **Index** `month_greg` · *(optional)* **Unique** `person_id, cost_center_name, allocation_type, month_greg` |
| 2 | `cal` | TRANSFORM 2 — every Monday of each Gregorian month | **Index** `month_greg` · *(optional)* **Unique** `Day` |
| 3 | `existing_keys` | TRANSFORM 3 — existing rank-1 keys | **Unique** `person_id, cost_center_name, allocation_type, Day` |
| 4 | `dense` | TRANSFORM 4 — every existing row, via `SELECT *` | none |
| 5 | `insert_zero_fill` | TRANSFORM 5 — the manufactured zeros | none |

> **`month_greg` must be `Index`, not `Unique`.** Both `act` and `cal` have many rows per month —
> one per triple, and one per Monday respectively — so a unique constraint on that column fails with
> a duplicate-entry error. The two Unique entries above are genuinely unique (they restate a
> `GROUP BY` key and a `SELECT DISTINCT` list), which makes them free assertions that the grain is
> what the query claims.

The index on **transform 3 is the one that matters for runtime** — it's the probe for the anti-join
in transform 5, and without it that `LEFT JOIN` degrades to a scan per row. The optional Unique
entries can be skipped without affecting correctness.

Two things that may need adjusting to your editor:

- **If the editor supplies the table name and wants a bare `SELECT`**, drop the `CREATE TABLE x AS`
  line from transforms 1–4 and keep the `SELECT`. Transform 5 has no bare-`SELECT` form — see below.
- **If it won't accept the `INSERT` in transform 5**, merge 4 and 5 into a single
  `CREATE TABLE dense AS SELECT … UNION ALL SELECT …` with an explicit column list on both sides in
  the same order. This reintroduces the silent-drop risk the `SELECT *` structure removes, so run V9
  against real rows as well as zero-fill rows if you go this way.

### 1.4 Output DataSets

**Add Output DataSet** → table `dense` → name it `fte_full_calendar_allocation_dense_SCRATCH`.

Scratch on purpose. Nothing points at it, so a wrong first run costs nothing.

### 1.5 Run Preview, then save and run

**Run Preview** first — it catches syntax and unknown-column errors without writing anything.

The most likely failure is an unknown column in transform 1, from the `GUIDANCE COLUMNS` block
(`Account Region`, `P&L country`, `service type`, `Opco Tagetik`, `Invoiced entity`). Those names
were read off the card definitions, which query the *view*, so the base dataset may name them
differently. The error names the offending column — correct it in **both** transform 1 and
transform 5 and re-preview.

Leave the schedule alone for now. Manual runs only until Phase 3.

---

## Phase 2 — verify against the scratch output

Full text of each check is in the VERIFICATION block at the bottom of the `.sql` file. Run them in
this order; the cheap decisive ones come first.

### 2.1 Must pass before anything else

**V2 — totals are invariant.** `SUM(allocation_amount)` on the input and on the scratch output must
be identical. Zeros cannot move a sum, so any difference means real rows are being duplicated —
stop and check that the `TRIM()` in transform 3 matches transform 1 exactly.

**V1 — no duplicates at grain.** Must return zero rows.

**V3 — row-count delta** roughly matches §7.2's prediction. A wild miss points at the same
`TRIM` asymmetry.

### 2.2 Confirms the fix actually works

**V4 — every (person, cost centre, month) now spans all of that month's Mondays.** Must return zero
rows. This is the direct statement of what the change is for.

**V5 — on a copy of card 1659132694 pointed at the scratch dataset**, pick any person holding two
cost centres in a month with at least one gap week. Their month totals across cost centres must now
sum to that person's FTE. Before the change they sum to more. Strongest single signal.

**V6 — weekly cells unchanged.** Any cell that already showed a value shows the same value.

### 2.3 Catches the known failure modes

**V7 — no growth in `'On Target'`.** The `allocation_staus` distribution should shift only by added
`'No Logs Entered'`. Growth in `'On Target'` means `fte` is arriving NULL on zero-fill rows.

**V9 — sample zero-fill rows.** `SELECT * FROM … WHERE zero_fill_flag = 1 LIMIT 20`. Only
`previous_fte_value`, `__created__` and `__modified__` should be NULL. Anything else NULL is a column
missing from transform 5's list — add it and re-run. It only *matters* if a card uses that column as
a pivot row dimension, but check before dismissing it.

### 2.4 Expect these to change

Bulk figures may drop if §7.4 said the explosion is fiscal. That's the axis mismatch surfacing, not a
regression — see [`../domo_reporting_dashboard.md` §8](../domo_reporting_dashboard.md).

`client roll up` (84279959) improves too, since it shares the Beast Mode. Its numbers will move.

---

## Phase 3 — cut over

Only after Phase 2 passes. Each step is individually reversible.

**3.1** Point the output at a permanent dataset. Either rename
`fte_full_calendar_allocation_dense_SCRATCH` to `fte_full_calendar_allocation_dense`, or add a new
output dataset with that name and remove the scratch one. Run once more.

**3.2 Set the schedule.** Settings → run **when the input dataset updates**. Not a time schedule.
This is what makes the two dataflows one chain rather than two jobs that can drift apart. On a clock,
if the Magic ETL runs late the views serve a dense dataset built from the previous run's rows —
stale, and silently so.

**3.3 Re-point the views** at `fte_full_calendar_allocation_dense`:
- `fte_full_calendar_allocation_view` (`eeba8836-7e01-4bb7-bc3f-73915fce5523`)
- `fte_full_calendar_allocation_pto` (`9f43ac77-723c-4ab2-9d16-2d03057701ba`)

`fte_targets_view` (`0c0ae204-…`) is fed by a different output — leave it.

**3.4 Expose `zero_fill_flag`** in both views, if their column lists are explicit rather than
pass-through. Step 3.5 fails silently without this — the filter would reference a column the card
cannot see.

**3.5 Add filter `zero_fill_flag = 0`** to card **217188567** (`missing allocations by manager`).

This one is required, not optional. Its Beast Mode `missing fte allocations` is
`SUM(allocation_amount) - SUM(fte)`, which never de-duplicated across cost centres, so extra rows
inflate it. The filter restores that card exactly, because the change is purely additive.

Consider the same filter on **728770033** (`over / under allocation`). Fully-absent weeks are
invisible there today — only a `placeholder` row exists and its `IN ('bulk','weekly')` filter
excludes it — and after the change they appear as `−fte`. That is arguably the card working properly
for the first time. Your call; look at it before deciding.

**3.6 Regression sweep (V8).** Compare against pre-change numbers on 217188567, 728770033, 843706280,
1392644214, 909787458. The last three should be identical — if they aren't, `__created__` /
`__modified__` are not NULL on the zero-fill rows.

---

## Troubleshooting

### `act` returns no rows (open — hit on the first build attempt, 2026-08-11)

**Status: unresolved.** The dataflow was built, all five transforms validated, and the run produced
an empty output because transform 1 returned nothing.

`act` is the only transform with a `WHERE` clause, so one of its seven predicates is eliminating
every row. This one query isolates which — add it as a temporary transform, read the result, delete
it:

```sql
SELECT
    COUNT(*)                                                                    AS total_rows,
    SUM(CASE WHEN `rank` = 1 THEN 1 ELSE 0 END)                                 AS pass_rank,
    SUM(CASE WHEN `allocation_type` IN ('bulk','weekly') THEN 1 ELSE 0 END)     AS pass_type,
    SUM(CASE WHEN `person_id` IS NOT NULL
              AND TRIM(`person_id`) <> '' THEN 1 ELSE 0 END)                    AS pass_person,
    SUM(CASE WHEN `cost_center_name` IS NOT NULL
              AND TRIM(`cost_center_name`) <> '' THEN 1 ELSE 0 END)             AS pass_cc,
    SUM(CASE WHEN TRIM(`cost_center_name`)
              NOT IN ('Unassigned','UNALLOCATED') THEN 1 ELSE 0 END)            AS pass_cc_named,
    SUM(CASE WHEN `month_greg` IS NOT NULL THEN 1 ELSE 0 END)                   AS pass_month
FROM fte_full_calendar_allocation;
```

Whichever column returns `0` is the culprit.

**Narrowing it before you run that:** if `cal` and `dense` returned rows, then `Day`, `month_greg`
and `week_end_greg` all exist and are populated, which rules out half the candidates and points at
`rank` or `allocation_type`.

**Prime suspects,** both the same underlying mistake — these predicate values were taken from the
card definitions, and cards query the *view*, not the base dataset, so the literals may not match
what the base actually stores:

```sql
SELECT DISTINCT `allocation_type` FROM fte_full_calendar_allocation;
SELECT DISTINCT `rank` FROM fte_full_calendar_allocation ORDER BY 1 LIMIT 20;
```

If `allocation_type` comes back as `Weekly` / `Bulk` rather than lowercase, that is the bug — the
ETL sets those literals in `Add Formula 1` and `Add Formula 4`, and they have only ever been observed
through the view. Fix by matching the real values in transform 1's `WHERE`, and check whether
transform 5's `CASE` and the notes about `'placeholder'` need the same correction.

**Also worth ruling out cheaply:** confirm the input dataset is the **base**
`fte_full_calendar_allocation` (`0ce8e039-d17a-4af9-911d-6d96ff6f7e2e`) and not
`fte_full_calendar_allocation_view` (`eeba8836-…`). The view renames `month_greg` to
`Reporting Month Gregorian`, so the view would more likely error than return zero rows — but it is
one click to check.

**If the answer turns out to be a column-name or value mismatch**, it also invalidates assumptions
elsewhere in these docs, since the same card-definition-derived names appear in
[`../domo_reporting_dashboard.md`](../domo_reporting_dashboard.md) §7 open gaps. Worth a sweep.

---

## Rollback

No step needs undoing in sequence; the fastest full revert is:

1. Re-point both views back at `fte_full_calendar_allocation` (`0ce8e039-…`).
2. Remove the `zero_fill_flag = 0` filter from card 217188567.

Cards recover on their next refresh. The new dataflow and dataset can be left in place, or paused
and deleted at leisure. Nothing in the Magic ETL was touched, and because the densification sits
downstream, its self-referencing history branch never saw a zero-fill row — so there is no frozen
bad state to unwind.

---

## After it's live

Update [`../domo_reporting_dashboard.md` §8](../domo_reporting_dashboard.md) from "written, not yet
deployed" to deployed, with the date and the new dataset GUID, and add `zero_fill_flag` to the column
notes in [`../fte_full_calendar_allocation.md`](../fte_full_calendar_allocation.md).

Two things worth scheduling separately, both surfaced by this work and neither fixed by it:

- **The bulk axis mismatch** (§6.4 of the ETL doc) — resolve which axis `Join Data 2` actually uses
  and correct whichever of the two sources is wrong.
- **`missing fte allocations`** on card 217188567 — it should arguably be
  `SUM(allocation_amount) - fte2` rather than `- SUM(fte)`, at which point the `zero_fill_flag`
  filter from 3.5 becomes unnecessary.
