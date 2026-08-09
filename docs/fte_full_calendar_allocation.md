# `fte_full_calendar_allocation` — how it is built and how the dates work

Reference for the Domo Magic ETL that produces the reporting dataset
`fte_full_calendar_allocation` (dataset guid `0ce8e039-d17a-4af9-911d-6d96ff6f7e2e`).

The same dataflow publishes two other datasets from partly shared tiles:

| Output | Fed by | Grain |
|---|---|---|
| `fte_weekly_allocation` | `Join Data 4` | one row per allocation document (no calendar skeleton) |
| **`fte_full_calendar_allocation`** | `Alter Columns 3` | **one row per (employee × fiscal Monday × cost centre)**, including employees and weeks with no allocation |
| `fte_targets` | `String Operations` | one row per weekly-targets document |

Everything below is about the middle one.

---

## 1. The one thing to understand first: the spine is Mondays

Every date in this dataset hangs off a single column, `Day`, which is **the Monday that
starts a fiscal week**, taken from `mst_blue_global_calendar_445`.

Three independent things agree on that Monday, which is why the flow works:

1. **The app** writes `weekly_allocation.allocation_date` as the Monday of the fiscal week
   (`startOfWeek(reportingWeekDate, {weekStartsOn: 1})` in
   [`multi-week-grid.tsx:38`](../src/components/allocation/multi-week-grid.tsx#L38)),
   even though the grid *displays* the Sunday week-ending date to users.
2. **The bulk branch** explodes each monthly profile onto the Mondays of that fiscal month
   (`Filter Rows` → `Day of Week = 'Monday'`).
3. **The skeleton** is built from the same Monday rows (`Filter Rows 3`).

So a user who sees `W/E Aug 2` in the tool is editing the row whose `Day` is `2026-07-27`.
That six-day gap is *by design* and is resolved correctly, because fiscal month attribution
is **looked up from the calendar**, never derived by date arithmetic — see §3.

---

## 2. Tile-by-tile map

### 2.1 Sources

| Tile | Dataset | Notes |
|---|---|---|
| `weekly_allocation_..._APP_DB` | AppDB collection written by the Weekly Allocation grid | `allocation_amount` force-cast to DOUBLE at load |
| `consolidated_hr_fte_report_view` | HR roster | supplies `fte`, `department`, `manager`, `region`, `opco`, `person_id` |
| `bulk_allocation_fte_..._APP_DB` | bulk profile → employee membership | carries `allocation_monthyear` |
| `bulk_allocation_summary_..._APP_DB` | bulk profile → cost-centre split | carries `allocation_percentage`, `allocation_group` |
| `mst_blue_global_calendar_445` | master 4-4-5 calendar, **daily grain** | the only source of fiscal truth |
| `gbs_cost_center_guidance_consolidated` | cost-centre reference | joined on `AI level name` |
| `weekly_targets_..._APP_DB` | quarterly targets | feeds `fte_targets` only |
| `fte_full_calendar_allocation_input` | **this flow's own previous output** | see §5 |

### 2.2 HR roster → one row per person

```
consolidated_hr_fte_report_view
  → Rank & Window 1   RANK() over person_id ORDER BY start_date DESC  → row_rank
  → Filter Rows 2     row_rank = 1                                    (latest record per person)
  → Select Columns    full_name, department, region, fte, manager, manager_email,
                      country→fte_country, person_email, opco, person_id, missing_flag
  → Select Columns 6  (skeleton subset: full_name, fte, person_id, department,
                       manager, manager_email, fte_country, missing_flag)
```

### 2.3 Weekly branch

```
weekly_allocation
  → Add Formula 1     allocation_type = 'weekly'
  → Append Rows       UNION with the bulk branch (schema from the weekly side, strict = false)
  → Add Formula       allocation_name = REGEXP_REPLACE(allocation_name, '^\[.*?\]\s*', '')
                      i.e. "[12345] Jane Doe" → "Jane Doe"
  → Join Data         LEFT OUTER to HR on allocation_name = full_name
                      (HR department arrives as fte_department)
  → Rank & Window     partition (allocation_date, allocation_name, cost_center_name, allocation_type)
                      order __created__ DESC
                        rank                = RANK()
                        previous_fte_value  = LEAD(allocation_amount, 1)
  → Add Formula 2     fte = IFNULL(fte, 1.0)
                      department = weekly ? fte_department : department
  → Alter Columns     fte → DOUBLE
  → Join Data 4       LEFT OUTER to cost-centre guidance on cost_center_name = "AI level name"
                      ├── publishes fte_weekly_allocation
  → Group By 2        SUM(allocation_amount) grouped by ~29 descriptive columns
  → Join Data 7
```

### 2.4 Bulk branch — monthly profile → weekly per-person FTE

```
bulk_allocation_fte ⨝ bulk_allocation_summary   (INNER on bulk_allocation_id)
  → Alter Columns 1   allocation_percentage → DOUBLE
  → Filter Rows 1     cost_center_name <> 'UNALLOCATED'
  → Select Columns 2
  → Group By 1        employee_count = COUNT(DISTINCT employee_name) per bulk_allocation_id
  → Join Data 5       attach employee_count
  → Join Data 2       INNER to calendar Mondays on allocation_monthyear = monthyear
                      ── this is the explosion: one row per Monday of that fiscal month
  → Group By          num_weeks = COUNT(DISTINCT Day) per (allocation_monthyear, bulk_allocation_id)
  → Join Data 3       attach num_weeks
  → Select Columns 1  Day → allocation_date, allocation_group → department,
                      allocation_percentage → allocation_amount, employee_name → allocation_name
  → Add Formula 4     allocation_type = 'bulk'
                      allocation_amount = allocation_amount / num_weeks / employee_count
```

So a profile holding 3.0 FTE for a client, covering 6 people, in a 4-week fiscal month,
yields `3.0 / 4 / 6 = 0.125` on each of the 4 Mondays for each of the 6 people.

### 2.5 The skeleton — why it is called "full calendar"

```
mst_blue_global_calendar_445
  → Select Columns 5  Day, Day of Week, Calendar Reporting Month, Calendar Reporting Year,
                      Reporting Month Date, Reporting Week Date
  → Filter Rows 3     Day of Week = 'Monday'
                      AND Calendar Reporting Year >= 2026
                      AND Calendar Reporting Year <= YEAR(CURRENT_DATE() + 1)
  → Add Formula 6     skeleton_cost_center = 'Unassigned', skeleton_amount = 0

Select Columns 6 (roster)  ⨯  the above     ← Join Data 6 is a CROSS JOIN
  = every employee × every in-window Monday
```

That cross join is what guarantees a row exists for a person-week even when nobody logged
anything — which is what makes `'No Logs Entered'` reporting possible.

```
  → Join Data 7       LEFT OUTER skeleton ⨝ Group By 2
                      ON (full_name, person_id, Day) = (allocation_name, person_id, allocation_date)
                      skeleton's department is renamed placeholder_department
```

### 2.6 `Add Formula 5` — the semantics tile

Expressions run **in listed order** and later ones see earlier results. The order matters:

| # | Column | Expression | Purpose |
|---|---|---|---|
| 1 | `allocation_amount` | `NULL → 0.0` | unmatched skeleton rows become zero, not null |
| 2 | `allocation_staus` | 4-branch CASE | see §4 |
| 3 | `fte` | `fte = '1' → 1.0` | guards a string `'1'` arriving from HR |
| 4 | `cost_center_name` | `COALESCE(cost_center_name, skeleton_cost_center)` | unmatched → `'Unassigned'` |
| 5 | `rank` | `NULL → 1` | skeleton rows join the rank=1 population |
| 6 | `allocation_type` | `NULL → 'placeholder'` | tags the synthetic rows |
| 7 | `department` | `placeholder ? placeholder_department : department` | **depends on #6 having already run** |
| 8 | `person_email` | `lower(...)` | |

Reordering #6 and #7 in the Domo UI would silently break department attribution.

Then `Alter Columns 2` casts `fte` → DOUBLE, `Join Data 8` attaches
`Calendar Reporting Month Date` (INNER on `Day`), `String Operations 1` trims
`cost_center_name`, and `Add Formula 8` adds the Gregorian axis (§3).

---

## 3. The date columns — read this before writing a card

The published dataset carries **two parallel time axes**. Picking the wrong one is the single
most common source of "the numbers look wrong for August".

### Fiscal axis (4-4-5, authoritative)

| Column | Meaning |
|---|---|
| `Day` | The Monday starting the fiscal week. The join key for everything. |
| `Reporting Week Date` | **The Sunday that ends the fiscal week.** This is what the app shows as `W/E Aug 2`. Use this to label weeks. |
| `Calendar Reporting Month` / `Calendar Reporting Year` | Fiscal month/year of that Monday, looked up from the master calendar. |
| `Calendar Reporting Month Date` | Fiscal month anchor date (from `Join Data 8`). |
| `Reporting Month Date` | Fiscal month anchor date carried from `Select Columns 5`. |

### Gregorian axis (derived by arithmetic)

| Column | Expression | Meaning |
|---|---|---|
| `week_end_greg` | `DATE_ADD(Day, INTERVAL 4 DAY)` | **The Friday** of the week — a Mon–Fri business week end, *not* the fiscal Sunday. |
| `month_greg` | `DATE_TRUNC('month', week_end_greg)` | First of the Gregorian month containing that Friday. |

### Why they disagree

`month_greg` re-introduces exactly the boundary drift the fiscal axis avoids, because a fiscal
week can start in one Gregorian month and be reported in another:

| `Day` | `Reporting Week Date` | Fiscal month | `week_end_greg` | `month_greg` |
|---|---|---|---|---|
| 2026-07-27 | 2026-08-02 | **AUG 2026** | 2026-07-31 (Fri) | **2026-07-01** |
| 2026-08-03 | 2026-08-09 | AUG 2026 | 2026-08-07 | 2026-08-01 |
| 2026-08-10 | 2026-08-16 | AUG 2026 | 2026-08-14 | 2026-08-01 |
| 2026-08-17 | 2026-08-23 | AUG 2026 | 2026-08-21 | 2026-08-01 |
| 2026-08-24 | 2026-08-30 | **SEP 2026** | 2026-08-28 | **2026-08-01** |
| 2026-08-31 | 2026-09-06 | **SEP 2026** | 2026-09-04 | 2026-09-01 |

**Which axis to use.** This dataset exists for **calendar-month** reporting, so `month_greg` is
the intended grouping. The fiscal columns are there for reconciliation against finance, not for
day-to-day allocation reporting.

The Weekly Allocation grid was switched to the **same** Friday rule
([`fiscal-calendar.ts`](../src/lib/fiscal-calendar.ts), `OWNING_MONTH_OFFSET_DAYS = 4`), so the
month a user fills in is the month `month_greg` reports. If that offset is ever changed on one
side it must change on the other, or the two silently drift apart again — which is the bug that
sent the week of Mon 2026-07-27 to July while the tool showed it under August.

---

## 4. `allocation_staus` — what it actually measures

```sql
CASE
  WHEN IFNULL(allocation_amount, 0) = 0 AND fte > 0 THEN 'No Logs Entered'
  WHEN IFNULL(allocation_amount, 0) < fte           THEN 'Under-Allocated'
  WHEN IFNULL(allocation_amount, 0) > fte           THEN 'Over-Allocated'
  ELSE 'On Target'
END
```

(The column name is misspelled in the flow — `allocation_staus`, not `allocation_status`.)

It compares **one cost-centre row** against the person's **whole** FTE. At this point in the
flow the grain is one row per (person × Monday × cost centre), so a person correctly allocated
1.0 but split 0.6 / 0.4 across two clients produces **two `'Under-Allocated'` rows**.

The column is only meaningful after `allocation_amount` has been summed to the person-week
level. Any card that shows a status breakdown without that aggregation is wrong.

---

## 5. The self-referencing history mechanism

The tail of the flow reads the dataflow's **own previous output**: the LoadFromVault tile
`fte_full_calendar_allocation_input` points at dataset `0ce8e039-…`, which is the same guid the
flow publishes to.

```
fte_full_calendar_allocation_input
  → Select Columns 9   manager→historical_manager, department→historical_department,
                       manager_email→historical_manager_email, person_id, Day
  → Remove Duplicates  on (person_id, Day)
  → Join Data 11       LEFT OUTER on (person_id, Day)
  → Add Formula 9      department    = COALESCE(historical_department,    department)
                       manager       = COALESCE(historical_manager,       manager)
                       manager_email = COALESCE(historical_manager_email, manager_email)
                       last_updated  = DATE_FORMAT(CURRENT_TIMESTAMP(), '%d/%m/%Y %h:%i %p')
  → Alter Columns 3    drop the three historical_* helper columns
  → PublishToVault     fte_full_calendar_allocation (REPLACE)
```

**Intent:** freeze the org structure as it was when a week was first reported, so a reorg does
not retroactively restate history. Manager and department for a past week stay as they were.

**How it behaves across runs:**

- Run 1 (empty output): all `historical_*` are NULL → everything falls back to current HR.
- Run N: any (person_id, Day) that already exists keeps its **first-ever** published values.

Consequences to keep in mind when troubleshooting — see §6.

---

## 6. Known traps and failure modes

*(populated below from the audit — see the findings table)*

---

## 7. Diagnostic queries

*(see below)*
