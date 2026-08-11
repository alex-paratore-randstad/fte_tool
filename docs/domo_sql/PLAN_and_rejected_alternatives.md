> **Archived planning record.** This is the approved plan as written on 2026-08-11, kept for the
> parts not carried into the other docs — chiefly the **rejected 16-tile Magic ETL design**, retained
> as a fallback if the SQL route is ever abandoned.
>
> For current guidance use [`README.md`](README.md) (build and cutover),
> [`densify_full_calendar_allocation.sql`](densify_full_calendar_allocation.sql) (the query), and
> [`../domo_reporting_dashboard.md` §8](../domo_reporting_dashboard.md) (status). Where this file and
> those disagree, those win.

# Fix `allocation_monthly` — monthly average divides by weeks-with-data, not weeks-in-month

## Context

Reported against the Domo card **`fte level allocations`** (card `1659132694`): the monthly
total column does not average correctly when a week is blank; blanks should count as `0`.

Confirmed. The card's measure is the Beast Mode `allocation_monthly`:

```sql
SUM(`allocation_amount`) / COUNT(DISTINCT `Day`)
```

`COUNT(DISTINCT Day)` counts only the Mondays that still have rows after filtering. A blank
cell is not a zero — it is the absence of a row — so it never enters the denominator.

From the reported screenshot (August 2026, 4 reporting weeks):

| Person / cost centre | 08-07 | 08-14 | 08-21 | 08-28 | Shown | Correct |
|---|---|---|---|---|---|---|
| Edina Baja / Philips EMEA | 1.00 | — | 1.00 | 1.00 | **1.00** | 0.75 |
| Edina Baja / UCB DE | — | 1.00 | — | — | **1.00** | 0.25 |
| Csilla Ottenberger / BioGen UK | — | 0.50 | — | — | **0.50** | 0.125 |

Clearest symptom: Edina Baja's two rows imply **2.0 FTE** for a 1.0 FTE person. Corrected they
sum to 1.00. Anyone split across cost centres over-reports by exactly the factor by which their
weeks are sparse.

### Why the existing skeleton doesn't already cover this

The flow does build a zero skeleton (§2.5 of the ETL doc) — but at **person-week** grain.
`Join Data 7` matches it to allocations on `(full_name, person_id, Day)`; `cost_center_name` is
not in the join key. So the skeleton fans out to whichever cost centres a person-week already
has and never manufactures a row for a cost centre they hold elsewhere in the month.

Csilla Ottenberger, w/e 08-14, is the proof: she has Commerzbank UK 0.50 and BioGen UK 0.50 that
week, so she is fully allocated, the skeleton row *matches*, and no `'Unassigned'` placeholder is
emitted. Her Biogen CH cell stays blank because nothing creates it.

The `placeholder` rows that do exist only appear when a person has **nothing at all** that week,
they land on `cost_center_name = 'Unassigned'` (a different pivot row), and card 1659132694's
`allocation_type` slicer preselects `placeholder` in a `NOT_IN`, hiding them by default.

### Why blanks will never arrive as zeros from the app

[`multi-week-grid.tsx:689-691`](../../src/components/allocation/multi-week-grid.tsx#L689)
hard-`DELETE`s the AppDB document when a cell is cleared, and the read path at `:390` (and `:501`,
`:545`) discards any document with `allocation_amount <= 0`. No zero-amount document ever exists in
`weekly_allocation`. The reporting layer has to supply the zero.

### The denominator rule already exists in two places

- `getWeeksForMonth()` — [`fiscal-calendar.ts:123`](../../src/lib/fiscal-calendar.ts#L123):
  weeks whose **Friday** falls in the month, read from the calendar, not from allocations.
- The ETL bulk branch — `num_weeks = COUNT(DISTINCT Day)` from the **calendar join** (§2.4).

`allocation_monthly` is the only one deriving its week count from allocation rows. That is the bug.

### There is no Beast Mode-only fix

`SUM(amount) / MAX(weeks_in_month)` is right at the month subtotal and wrong (÷4) in every weekly
column. `COUNT(DISTINCT Day)` is right weekly and wrong monthly. One expression cannot switch on
pivot grain, and the existing placeholder rows sit on a different pivot row so they cannot rescue
the denominator. The data has to change.

---

## Approach

Extend the zero-fill to **cost-centre grain**: for every `(person, cost centre, allocation_type)`
active in a month, ensure a row exists for every reporting Monday of that month, `allocation_amount
= 0` where nothing was logged. The existing Beast Mode then becomes correct at both levels with **no
formula change** — denominator 1 weekly, 4 (or 5) monthly.

Splice as an **additive branch**, appended between `Alter Columns 2` and `Join Data 8`, rather than
rebuilding `Join Data 7`. Existing rows never leave their current path, so a `zero_fill_flag = 0`
filter is an exact restore on any card that wants today's behaviour, and rollback is deleting one
tile and re-pointing one input.

### Decisions taken

**Denominator = all weeks in the month.** Tile C1 joins the triple to every Monday of its Gregorian
month, with no employment-date predicate. This matches the bulk branch's `num_weeks` and
`getWeeksForMonth()`, and it is the truthful reading: an employed-but-unallocated week genuinely is
zero capacity used, which is the signal the `missing allocations` card exists to surface.

Accepted consequence: a mid-month joiner's first month reads diluted (start in week 3, allocated 1.00
in weeks 3–4 → month total 0.50). The dataset already treats joiners as employed for the whole window
— the skeleton cross-joins every Monday regardless of `start_date` — so this is not a new distortion,
but it becomes more visible, because the zeros now land on the person's real cost centre instead of
on `'Unassigned'`. Expect it to be reported as a bug by someone; the answer is that bounding by
employment dates is a separate change (option B in the questions), needing `start_date` and a leave
date brought into `Select Columns 6`.

---

## Pre-checks — run before building

> **DECIDED — SQL dataflow downstream, triggered on input dataset update.** The in-flow Magic ETL
> design below was reconsidered (one dataflow, no chaining) and rejected: it puts zero-fill rows
> into the self-referencing history branch, where `COALESCE(historical_department, department)`
> freezes the first-ever value permanently. Rebuilding the whole flow in SQL from the raw inputs was
> also rejected — the active triples don't exist before the bulk explosion and rank window have run,
> and MySQL 5.x has no `RANK()`/`LEAD()`. The chaining cost is paid down by the update trigger.
>
> **P0 RESOLVED — SQL transform tiles are available.** The build is therefore
> [`docs/domo_sql/densify_full_calendar_allocation.sql`](../domo_sql/densify_full_calendar_allocation.sql),
> a separate SQL dataflow downstream of the Magic ETL, **not** the 16-tile Magic ETL design below.
> That design is retained only as a fallback. Two consequences: Groups A and E are unnecessary
> (`month_greg`, `week_end_greg` and the roster attributes are already columns on the published
> dataset), and the history-mechanism risks in the section below no longer apply, because the
> history branch keeps reading the Magic ETL's own undensified output. The semantics, the
> compensating card filter, and the verification steps are unchanged.

**P0 (blocking, determines the build). Which transform tiles does the instance have?**
In the dataflow editor, check whether **MySQL** or **Redshift** transform tiles are offered
alongside the Magic ETL tiles (Domo shows these as a separate dataflow type — "SQL" vs "Magic ETL"
— when creating a dataflow; an existing Magic ETL cannot mix them, so this may mean building the
dense branch as a *separate* SQL dataflow feeding an intermediate dataset).

- **Available** → tell me which engine and I will write the query and check it into this repo. The
  whole densification is ~15 lines, version-controlled and reviewable, instead of 16 tiles of
  hand-maintained UI state. Strongly preferred.
- **Not available** → build the Magic ETL design below as specified.

Everything else in this plan (the semantics, the pre-checks, the compensating card filter, the
verification) is identical either way. Only the Build section changes.

**P1 (blocking). Is the bulk explosion fiscal or Gregorian?**
[`fiscal-calendar.ts:18`](../../src/lib/fiscal-calendar.ts#L18) says the
dataflow matches `allocation_monthyear` against `DATE_FORMAT(<the week's Friday>, '%b %Y')`.
[`fte_full_calendar_allocation.md:98`](../fte_full_calendar_allocation.md#L98)
describes `Join Data 2` as landing on the Mondays of that **fiscal** month. Both are prose; neither
is the tile. Open `Join Data 2` and read what `monthyear` actually is.

- Gregorian → bulk rows are already dense; densification is a correct no-op for them.
- Fiscal → densifying on the Gregorian axis **dilutes bulk allocations at every month boundary**
  (0.125 → 0.031). Fix `Join Data 2` in the same change, or exclude bulk from densification
  (`allocation_type = 'weekly'` in B2) and accept the bug remains for bulk.

Also possible: `monthyear` is the *Monday's* Gregorian month — a third rule again. Confirm, don't infer.

**P2. Which column is card 1659132694's date range bound to?** If it filters `Day` rather than
`Reporting Month Gregorian`, "August" clips to five Mondays while `month_greg` groups four, and the
denominator stays wrong after densification.

**P3 (safety). Is `Remove Duplicates` in the history branch (§5) keyed on the subset
`(person_id, Day)` or on all columns?** If all columns, `Join Data 11` can multiply the dataset when
a person-week carries heterogeneous `department` values — and this change makes that common rather
than rare. Confirm before shipping.

**P4. Does `Group By 2` carry `rank` and the `Join Data 4` guidance columns** (`Account Region`,
`P&L country`, `service type`, `Opco Tagetik`, `Invoiced entity`)? The design sources roster
attributes separately to avoid depending on this, but B4 needs the guidance columns.

Run diagnostics D1–D5 (below) alongside.

---

## Build (Magic ETL path — see P0)

Sixteen new tiles, three edited. Nothing outside this path is touched — `fte_weekly_allocation`
branches off `Join Data 4` and `fte_targets` off `String Operations`, both upstream.

### Edits to existing tiles

| Tile | Change |
|---|---|
| `Add Formula 5` | **Append** expression #9: `zero_fill_flag = 0`. Appended last — the #6-before-#7 ordering dependency is untouched. |
| `Join Data 8` | Re-point its input from `Alter Columns 2` to the new `Append Rows 2`. Only rewiring. |
| `Alter Columns 3` | Confirm it doesn't drop `zero_fill_flag`. |
| `String Operations 1` | **Recommended**: move upstream of `Group By 2` so the whole flow works on one trimmed `cost_center_name`. Otherwise tile B3 is required. |

### Group A — Gregorian month map

| # | Tile | Type | Detail |
|---|---|---|---|
| A1 | `Filter Rows 20` | Filter Rows | Off `Select Columns 5`. `Day of Week = 'Monday'`, `Calendar Reporting Year >= 2025` and `<= YEAR(CURRENT_DATE()) + 2` — deliberately **wider** than `Filter Rows 3`; see edge (i). |
| A2 | `Add Formula 20` | Add Formula | `month_greg_map = DATE_TRUNC('month', DATE_ADD(\`Day\`, INTERVAL 4 DAY))`. Must be semantically identical to `Add Formula 8`. |
| A3 | `Select Columns 20` | Select Columns | `Day`, `month_greg_map`, `Reporting Week Date`, `Calendar Reporting Month`, `Calendar Reporting Year`, `Reporting Month Date`. ~150 rows. |
| A4 | `Select Columns 21` | Select Columns | `Day → map_day`, `month_greg_map`. |

**Worth doing while here:** change `Add Formula 8` to compute only `week_end_greg` and obtain
`month_greg` by joining A4 on `Day`. Otherwise the `INTERVAL 4 DAY` offset lives in three places
(app, `Add Formula 8`, `Add Formula 20`) with nothing enforcing agreement — the same drift that
per §3 of the ETL doc "sent the week of Mon 2026-07-27 to July while the tool showed it under August".

### Group B — active triples

| # | Tile | Type | Detail |
|---|---|---|---|
| B1 | `Join Data 20` | **INNER** | Left `Group By 2`, right A4, on `allocation_date = map_day`. |
| B2 | `Filter Rows 21` | Filter Rows | `rank = 1`, `person_id` not null/blank, `cost_center_name` not null/blank and `NOT IN ('Unassigned','UNALLOCATED')`. |
| B3 | `Add Formula 21` | Add Formula | `cost_center_name = TRIM(...)`. Omit if `String Operations 1` moved upstream. |
| B4 | `Group By 20` | Group By | **Key:** `allocation_name`, `person_id`, `cost_center_name`, `allocation_type`, `month_greg_map`. **Aggregate:** `MIN()` of `department`, `fte_department`, `cost_center_number` and each guidance column; `COUNT(*) AS src_rows`. |

The key is exactly those five columns. Any extra column that varies within the triple produces two
triples, hence two parallel dense series, hence a visually duplicated pivot row. Run **D3** first —
anything it flags must not go in the key.

`allocation_type` is in the key deliberately: a person-CC-month with both bulk and weekly activity
legitimately renders as two pivot rows today and each needs its own dense series.

### Group C — explode onto Mondays

| # | Tile | Type | Detail |
|---|---|---|---|
| C1 | `Join Data 21` | **INNER** | Left B4, right **A3**, on `month_greg_map`. The controlled cross join. |
| C2 | `Add Formula 22` | Add Formula | `allocation_date = \`Day\``, `allocation_amount = 0.0`, `rank = 1`, `zero_fill_flag = 1`; explicit `NULL` for `previous_fte_value`, `__created__`, `__modified__`, `placeholder_department`, `skeleton_cost_center`, `skeleton_amount`. `allocation_type` left **inherited**. |

The NULLs on `__created__` / `__modified__` are load-bearing: they are what keeps card 1392644214
(`days since last allocation NOT IN ('')`) and card 843706280 (`current_month_flag = 1`) from
picking these rows up. Do not populate them "for completeness".

### Group D — anti-join

| # | Tile | Type | Detail |
|---|---|---|---|
| D1 | `Select Columns 22` | Select Columns | Off `Group By 2`: `allocation_name`, `person_id`, `cost_center_name`, `allocation_date`, `allocation_type`. |
| D2 | `Add Formula 23` | Add Formula | `cost_center_name = TRIM(...)` — **must match B3 exactly**, or the probe misses and you emit a zero beside an identical real row. `existing_flag = 1`. |
| D3 | `Remove Duplicates 2` | Remove Duplicates | On all five keys. Essential — `Group By 2` emits rank>1 rows and the probe would otherwise fan out. |
| D4 | `Join Data 22` | **LEFT OUTER** | Left C2, right D3, on all five keys. |
| D5 | `Filter Rows 22` | Filter Rows | `existing_flag IS NULL`. |

Anti-join rather than LEFT-OUTER-plus-coalesce because disjointness becomes structural rather than
argued, and existing rows never pass through a new join. The coalesce alternative needs ~25
hand-written `COALESCE(real, triple_min)` expressions, each able to silently overwrite a correct
value on a currently-correct row.

### Group E — enrich, align, append

| # | Tile | Type | Detail |
|---|---|---|---|
| E1 | `Join Data 23` | **LEFT OUTER** | Left D5, right the **wide roster projection** (`Select Columns`, post `Filter Rows 2`), on `person_id`. Supplies `full_name`, `fte`, `manager`, `manager_email`, `fte_country`, `missing_flag`, `region`, `opco`, `person_email`. **Do not take `department` from here** — see below. |
| E2 | `Add Formula 24` | Add Formula | `full_name = COALESCE(full_name, allocation_name)`; `fte = CASE WHEN \`fte\` = '1' THEN 1.0 ELSE \`fte\` END`; `person_email = LOWER(...)`; `allocation_staus` = the 4-branch CASE, **character-identical to `Add Formula 5` #2**. |
| E3 | `Select Columns 23` | Select Columns | Exactly the column set `Alter Columns 2` emits, plus `zero_fill_flag`. Drop `month_greg_map`, `map_day`, `existing_flag`, `src_rows`. |
| E4 | `Alter Columns 4` | Alter Columns | `allocation_amount`→DOUBLE, `fte`→DOUBLE, `rank`→LONG, `zero_fill_flag`→LONG. |
| E5 | **`Append Rows 2`** | Append Rows | Inputs `Alter Columns 2` + E4. Both carry `zero_fill_flag`, so run it **strict**. Then re-point `Join Data 8`. |

**`department` must come from the triple (B4), not from HR.** On `bulk` rows it holds the bulk
`allocation_group`, and `fte level cost center name` resolves to `department` for bulk rows. Source
it from HR and every bulk zero row lands on a different pivot row from its real siblings — the fix
would ship and do nothing.

`allocation_type` must be **inherited**, not set to `'placeholder'` (hidden by the card's default
slicer) and not to a new value like `'zero_fill'` (excluded by the card's own `IN` filter, and it
breaks bulk pivot-row alignment for the same reason as `department`).

---

## Compensating card change

Add `zero_fill_flag = 0` to the filters on card **217188567** (`missing allocations by manager`).
Because the splice is additive, this restores today's behaviour exactly.

Without it: `fte2` actually survives (numerator and denominator both grow — `'Unassigned'` counts as
a third distinct cost centre and `fte` is populated on all rows), but `missing fte allocations`
(`SUM(allocation_amount) - SUM(fte)`) degrades from −1 to −3 on a two-cost-centre person, because it
never de-duplicated in the first place (§5.3 of the dashboard doc). The alternative to the filter is
fixing that Beast Mode to `SUM(allocation_amount) - fte2`, which it arguably should be regardless.

**Do not null `fte` on the zero-fill rows** as a cheaper substitute for the flag. It corrupts
`allocation_staus` (`NULL > 0` is NULL, so every zero-fill row falls through to `'On Target'`),
breaks `fte2` (numerator counts real rows, denominator counts all cost centres → 0.5 instead of 1.0),
and re-hides fully-absent weeks on card 728770033 (`AVG(fte)` NULL → `allocation_check` NULL →
excluded by `≠ 0`).

### Other cards

| Card | Effect |
|---|---|
| 1659132694 fte level allocations | **Fixed.** Weekly `0/1 = 0`; month `3.00/4 = 0.75`. No card change. |
| 84279959 client roll up | **Improved** — less dramatically, since at CC grain the denominator already unions across people. |
| 728770033 over / under | **Changed, arguably fixed.** Fully-absent weeks are invisible today (only a `placeholder` row exists, excluded by `IN ('bulk','weekly')`); after, they appear as `−fte`. Add `zero_fill_flag = 0` if unwanted. |
| 747955760, 207264998 | Unchanged — plain `SUM`, zeros contribute nothing. |
| 843706280, 1392644214 | Unchanged — the NULL timestamps keep the new rows out. |
| 909787458, 1947398748 | Unchanged — distinct counts, no new people. |
| targets cards | Unchanged — different dataset. |

**Deployment detail:** `fte_full_calendar_allocation_view` is a *dataset view*. If its column list
is explicit, `zero_fill_flag` will not reach the cards until the view is edited. Same for
`fte_full_calendar_allocation_pto`.

---

## History-mechanism interaction (§5 of the ETL doc)

No feedback loop — the dense set is a pure function of the AppDB sources plus the calendar, and
`Join Data 11` adds columns, never rows. But three real cross-run effects:

1. **Fan-out** if `Remove Duplicates` is keyed on all columns (P3). The risk pre-exists; this change
   raises it from rare to common by putting bulk `allocation_group` departments onto person-weeks
   that previously had only an HR department.
2. **Arbitrary-pick contamination.** Which row survives `Remove Duplicates` is not deterministic. A
   zero-fill row carrying a bulk group label could win and freeze that as `historical_department` for
   the whole person-week, forever. **Mitigation:** filter the history input to `zero_fill_flag = 0` —
   but *not on the first run*, since the previous output won't have the column yet and a filter on a
   missing column fails the dataflow. Deploy in two steps.
3. **Partial irreversibility.** `department = COALESCE(historical_department, department)` means the
   first-ever value wins permanently. A bad first run does not self-heal. Publish to a scratch
   dataset and inspect before cutting over.

---

## Verification

**Publish to a scratch dataset first.** Do not overwrite `0ce8e039-…` until the checks below pass —
point 3 above makes a bad first run expensive to undo.

1. **Row-count delta** matches D2's prediction (`dense_target − existing_real`). A wild miss means the
   anti-join is fanning out — check D3 (`Remove Duplicates 2`) and the B3/D2 `TRIM` symmetry.
2. **No duplicate rows:** `SELECT person_id, cost_center_name, allocation_type, Day, COUNT(*) FROM …
   WHERE rank = 1 GROUP BY 1,2,3,4 HAVING COUNT(*) > 1` returns nothing.
3. **The reported cells,** against a copy of card 1659132694 pointed at the scratch dataset:
   Edina Baja / Philips EMEA → **0.75**, / UCB DE → **0.25**; Csilla Ottenberger / Biogen CH →
   **0.375**, / Commerzbank UK → **0.50**, / BioGen UK → **0.125**.
4. **Per-person month rows sum to their FTE.** Edina Baja 0.75 + 0.25 = 1.00; Csilla 0.375 + 0.50 +
   0.125 = 1.00. This is the single strongest signal the fix is right.
5. **Weekly cells unchanged** — Charinha Isbell / RPO Bodycote still reads 1.20 in each populated week.
6. **`SUM(allocation_amount)` is invariant** across the whole dataset before and after. Zeros must not
   move any total. If it moves, the anti-join is missing rows and real rows are being duplicated.
7. **No new `'On Target'` rows:** `allocation_staus` distribution shifts only by added
   `'No Logs Entered'`. Any growth in `'On Target'` means `fte` is arriving NULL on zero-fill rows.
8. **Regression sweep** on cards 217188567, 728770033, 843706280, 1392644214, 909787458 — each should
   match its pre-change numbers once `zero_fill_flag = 0` is applied where specified.

## Diagnostics (read-only, run before building)

**D1 — size of the bug**
```sql
SELECT a.month_greg, COUNT(*) AS person_cc_months,
       SUM(CASE WHEN a.weeks_present < m.weeks_in_month THEN 1 ELSE 0 END) AS affected
FROM (SELECT person_id, cost_center_name, allocation_type, month_greg,
             COUNT(DISTINCT `Day`) AS weeks_present
      FROM fte_full_calendar_allocation
      WHERE `rank` = 1 AND allocation_type IN ('bulk','weekly')
      GROUP BY 1,2,3,4) a
JOIN (SELECT month_greg, COUNT(DISTINCT `Day`) AS weeks_in_month
      FROM fte_full_calendar_allocation GROUP BY 1) m ON a.month_greg = m.month_greg
GROUP BY 1 ORDER BY 1;
```

**D2 — row-count multiplier**
```sql
WITH m AS (SELECT month_greg, COUNT(DISTINCT `Day`) w
           FROM fte_full_calendar_allocation GROUP BY 1),
     t AS (SELECT DISTINCT person_id, cost_center_name, allocation_type, month_greg
           FROM fte_full_calendar_allocation
           WHERE `rank` = 1 AND allocation_type IN ('bulk','weekly')
             AND cost_center_name NOT IN ('Unassigned','UNALLOCATED'))
SELECT (SELECT SUM(m.w) FROM t JOIN m ON t.month_greg = m.month_greg) AS dense_target,
       (SELECT COUNT(*) FROM fte_full_calendar_allocation
          WHERE `rank` = 1 AND allocation_type IN ('bulk','weekly')
            AND cost_center_name NOT IN ('Unassigned','UNALLOCATED')) AS existing_real;
```

**D3 — fan-out check for B4's key** (any row returned is a column that must not be in the key)
```sql
SELECT person_id, cost_center_name, allocation_type, month_greg,
       COUNT(DISTINCT department) d, COUNT(DISTINCT cost_center_number) n,
       COUNT(DISTINCT fte) f, COUNT(DISTINCT manager) mg
FROM fte_full_calendar_allocation WHERE `rank` = 1
GROUP BY 1,2,3,4 HAVING d > 1 OR n > 1 OR f > 1 OR mg > 1;
```

**D4 — bulk axis (P1)**
```sql
SELECT month_greg, COUNT(DISTINCT `Day`) AS bulk_mondays, MIN(`Day`) AS first_monday
FROM fte_full_calendar_allocation
WHERE `rank` = 1 AND allocation_type = 'bulk' GROUP BY 1 ORDER BY 1;
```
A first Monday one week earlier than the month's first Monday means the explosion is fiscal.

**D5 — cost-centre normalisation**
```sql
SELECT LOWER(TRIM(cost_center_name)) AS norm, COUNT(DISTINCT cost_center_name) AS variants
FROM fte_full_calendar_allocation GROUP BY 1 HAVING variants > 1;
```

---

## Edge cases

- **Person with nothing all month** — no triples, no dense rows, unchanged. Making them visible with
  a zero needs a person-level default cost centre the data doesn't have.
- **Mid-month joiners and leavers** — diluted first/last month, accepted; see *Decisions taken*.
- **Cost centre in one month only** — densified in that month, no leakage. A person moving from client
  X to Y mid-year gets no X zeros afterwards. Correct: the fix does not manufacture history.
- **Five-week months** — handled, because membership comes from the Friday rule, not a fixed count.
- **Whitespace / case in `cost_center_name`** — `String Operations 1` trims *after* `Group By 2`, so
  `' Philips'` and `'Philips'` are distinct triples upstream and collapse downstream. Fix by moving
  that tile upstream, or apply `TRIM` identically in B3 **and** D2. `TRIM` does not handle case — D5.
- **Superseded documents** — B2's `rank = 1` is essential; without it a cost centre that only ever
  appeared on a rank-2 document would be resurrected as visible `rank = 1` zero rows on twelve cards.

---

## Repo deliverables

The ETL and cards are in Domo and cannot be edited from here. In this repo:

1. `docs/fte_full_calendar_allocation.md` — new section documenting the dense branch (tiles A–E),
   and a correction to §2.5 making explicit that the skeleton is person-week grain, not
   person-cost-centre-week.
2. `docs/domo_reporting_dashboard.md` — rewrite §5.3 with the root cause and worked example; note
   `zero_fill_flag` and the card 217188567 filter; update the §6 breakage table.
3. Resolve the P1 contradiction in whichever of `fiscal-calendar.ts:18` or
   `fte_full_calendar_allocation.md:98` turns out to be wrong.

---

## Execution order

1. **P0** — check which transform tiles the instance offers. If SQL is available, come back to me and
   I'll write the query instead of the 16 tiles; everything else in this plan stands unchanged.
2. **P1–P4** and **D1–D5** — settle the bulk axis contradiction, the card's date binding, the
   `Remove Duplicates` configuration, and the fan-out check. P1 and P3 can each invalidate the build.
3. Build the dense branch, publishing to a **scratch dataset**.
4. Run verification steps 1–8 against the scratch dataset, with a copy of card 1659132694 pointed at it.
5. Cut over `Join Data 8`; add the `zero_fill_flag = 0` filter to card 217188567; edit the dataset
   views to expose `zero_fill_flag`.
6. Second deploy: add the `zero_fill_flag = 0` filter to the history branch input (must not be present
   on the first run — the previous output won't have the column, and a filter on a missing column
   fails the dataflow).
7. Update the two docs in this repo and resolve the P1 contradiction in whichever source was wrong.
