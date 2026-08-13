# FTE Dashboards — card reference

What every card displays, how it is configured, and where each column comes from in the ETL. Written
for whoever needs to change a card.

## What you are editing

| | `fte reporting` | `nam fte reporting` |
|---|---|---|
| Page id | `1981930666` | `543239663` |
| Cards | 19 (13 data, 6 text) | 10 (8 data, 2 text) |
| Primary view | `fte_full_calendar_allocation_view` `4d9d03d8-2fc3-4752-9a3e-001f14efff45` | `fte_allocations_nam_charge_view` `a83d3d23-f491-4479-a478-0cc454b03dd2` |
| Also reads | `fte_targets_view` `e4dd884e-…`, `fte_full_calendar_allocation_pto` `789261cb-…` | `fte_full_calendar_allocation_pto` `789261cb-…` |
| Time axis | **Gregorian** | **Fiscal 4-4-5** |
| Styling | background `#0F1941`, section headers `#BAD808` | same |

A second Domo environment runs the same dashboard design with different GUIDs throughout (page
`1551650036`, view `eeba8836-…`). Confirm which one you are in before editing, and whether the change
needs applying in both.

---

## Before you change anything

Four conventions the cards depend on. None are optional.

**`rank = 1`** — the dataset keeps every version of every allocation document. `rank = 1` is the
newest; higher ranks are superseded edits. Any card aggregating `allocation_amount` should carry this
filter unless you intend otherwise.

**`allocation_type`** — three values:

| Value | Meaning |
|---|---|
| `weekly` | entered in the Weekly Allocation grid |
| `bulk` | exploded from a monthly bulk profile onto that month's Mondays |
| `placeholder` | synthetic row for a person-week with nothing logged, amount `0` |

Cards showing *what was allocated* filter `IN ('bulk','weekly')`. Cards showing *coverage* need
`placeholder` in scope. Watch for cards where the card filter and the slicer default disagree.

**Two time axes.** A week belongs to a different month depending on which you pick — the week
starting Mon 2026-07-27 is fiscal August but Gregorian July.

| Axis | Week column | Month column |
|---|---|---|
| Gregorian | `week_end_greg` (the Friday) | `month_greg` / `Reporting Month Gregorian` |
| Fiscal 4-4-5 | `Reporting Week Date` (the Sunday) | `Calendar Reporting Month Date`, `Reporting Month Date` |

`fte reporting` uses Gregorian throughout. `nam fte reporting` uses fiscal throughout. Mixing them on
one card means the columns and the measures disagree at month boundaries.

**Grain.** One row per person × Monday × cost centre. `fte` repeats on every cost-centre row for a
person, so it must be de-duplicated (`AVG`, or divide by distinct cost centres) before comparing it
to `allocation_amount`, which legitimately sums.

---

## `fte reporting` — layout order

`PB` = print page break.

| # | Card | id | Type |
|---|---|---|---|
| 1 | dataset last updated (UTC) | 1136521350 | single value |
| 2 | Total FTEs | 1147894975 | single value |
| 3 | Allocated FTEs | 390455741 | single value |
| 4 | *allocations* | 979331715 | text |
| 5 | total allocations | 356045511 | vertical multi bar |
| PB | | | |
| 6 | client roll up | 911852408 | pivot + big number |
| 7 | fte level allocations | 184728100 | pivot |
| PB | | | |
| 8 | over / under allocation | 1984232073 | pivot |
| 9 | missing allocations by manager | 1462533056 | pivot |
| PB | | | |
| 10 | month over month change in allocation by client | 659593651 | pivot |
| 11 | *corrections* | 1777108902 | text |
| PB | | | |
| 12 | previous month corrections | 1038605280 | pivot |
| 13 | *governance* | 324743655 | text |
| PB | | | |
| 14 | manager activity | 1135499081 | basic table |
| 15 | *targets* | 794244009 | text |
| PB | | | |
| 16 | fte targets | 1856836430 | vertical stacked bar |
| 17 | fte targets table | 740866118 | pivot |
| PB | | | |
| 18 | *pto* | 373562795 | text |
| 19 | pto table | 233285129 | pivot |

The three badges sit above the first section header and belong to no section.

**Cards that ignore the page date filter:** 1038605280, 659593651, 1856836430, 740866118, 1136521350.
1136521350 also ignores all page filters.

---

## `fte reporting` — card specs

### 1136521350 · dataset last updated (UTC)
Single value · allocation view

- **Value** `MAX(last_updated)`
- **Filters** none · **Accepts page filters** no

Shows when the dataflow last published. `last_updated` is written by the ETL's final `Add Formula 9`
as a formatted string, one identical value across the whole dataset.

### 1147894975 · Total FTEs
Single value · allocation view

- **Value** `dcount_person` → `COUNT(DISTINCT person_id)`
- **Filters** none · header override "Total FTEs"

Count of **people**, not a sum of FTE. Unfiltered, so it counts everyone in the calendar skeleton —
the whole roster in the reporting window.

### 390455741 · Allocated FTEs
Single value · allocation view

- **Value** `dcount_person` · **Filters** `rank = 1` · header override "Allocated FTEs"

Same measure as above with the rank guard. Read against Total FTEs it gives coverage.

### 356045511 · total allocations
Vertical multi bar · allocation view

- **Item** `Reporting Month Gregorian` (grain MONTH) · **Value** `SUM(allocation_amount)` · **Series** `cost_center_name`
- **Filters** `allocation_type IN ('bulk','weekly')`
- **Date range** current quarter
- **Sort** `CalendarMonth` asc, then `SUM(allocation_amount)` desc
- **Slicers** `cost_center_name` (labelled "client"), `allocation_type`
- Data labels show value

### 911852408 · client roll up
Pivot + big number · allocation view

- **Big number** `SUM(allocation_amount)` aliased "total fte", abbreviated
- **Rows** `cost_center_name`, `Account Region`, `P&L country`, `service type`, `Opco Tagetik`, `Invoiced entity`
- **Columns** `Reporting Month Gregorian` (as "month", `MM-yyyy`), `fte_country`, `department`
- **Value** `allocation_monthly` aliased "fte allocation"
- **Filters** `allocation_type IN ('bulk','weekly')`, `rank = 1`
- **Date range** current month · **Slicers** `department`, `cost_center_name` ("client")
- `total_row` on, `total_col` on, subtotals off

Title is dynamic — it appends the active date range. The five hierarchy rows after `cost_center_name`
all come from the cost-centre guidance join, not from the allocation itself.

### 184728100 · fte level allocations
Pivot · allocation view · description "based on Gregorian calendar"

- **Rows** `full_name`, `person_id`, `fte_country`, `department`, `fte level cost center name`, `cost_center_number`
- **Columns** `Reporting Month Gregorian` (as "month"), `week_end_greg` (as "w/e")
- **Value** `allocation_monthly` aliased "fte allocation"
- **Filters** `allocation_type IN ('bulk','placeholder','weekly')`, `rank = 1`
- **Date range** current month · **Sort** `week_end_greg` asc, `full_name` asc
- **Slicers** `department`, `allocation_type` — **the latter ships with `placeholder` preselected in a `NOT_IN`**, so placeholders are hidden until a user clears it
- `total_col` on, `subtotal_columns` on

### 1984232073 · over / under allocation
Pivot · allocation view · description "based on Gregorian calendar. compares the allocated fte amount
against the assigned weekly fte value for each employee"

- **Rows** `full_name`, `manager`, `fte_country`
- **Columns** `Reporting Month Gregorian` (as "month"), `week_end_greg` (as "w/e date")
- **Values** `allocation_check`, `AVG(fte)`, `SUM(allocation_amount)`
- **Filters** `allocation_type IN ('bulk','weekly')`, `allocation_check ≠ 0`, `rank = 1`
- **Date range** current month · **Slicers** `cost_center_name`, `manager`
- `subtotal_columns` on, totals off

The `≠ 0` filter is what makes it an exceptions list — only rows where allocated and assigned differ.

### 1462533056 · missing allocations by manager
Pivot · allocation view · description "default date is previous month"

- **Rows** `manager`, `full_name`
- **Columns** `Reporting Month Gregorian` (as "month"), `week_end_greg` (as "w/e date")
- **Values** `fte2` aliased "assigned fte", `SUM(allocation_amount)` aliased "allocated fte", `missing fte allocations`
- **Filters** `missing_flag = 0`, `rank = 1` — **no `allocation_type` filter**, so placeholder rows are in scope, which is what lets absence show
- **Date range** current month (the description says previous; the configuration is current)
- **Slicers** none · manager rows collapsed by default
- `total_row`, `total_col`, `subtotal_rows`, `subtotal_columns` all on

`missing_flag` comes from the HR flow and marks people **not expected** to log allocations — managers.
`= 0` therefore means "should be logging".

### 659593651 · month over month change in allocation by client
Pivot · allocation view

- **Rows** `cost_center_name` · **Columns** `Reporting Month Gregorian` (as "month")
- **Values** `SUM(allocation_amount)` aliased "total fte", `Net Change MoM`
- **Filters** `allocation_type IN ('bulk','weekly')`, `rank = 1`
- **Date range** rolling 3 months · **Slicers** `cost_center_name`, `Reporting Month Gregorian`
- `total_row`, `total_col`, `subtotal_rows` on; red negatives off

### 1038605280 · previous month corrections
Pivot · allocation view · description "previous month corrections made in the current month"

- **Rows** `fte_country`, `department`, `allocation_name` (as "fte"), `manager`, `cost_center_name`, `cost_center_number`
- **Columns** `Reporting Month Gregorian` (as "month")
- **Values** `SUM(allocation_amount)` "current allocation", `SUM(previous_fte_value)` "previous allocation", `SUM(change in allocation)`
- **Filters** `current_month_flag = 1`, `change in allocation NOT IN ('', 0)`, `rank = 1`
- **Date range** previous month · **Slicers** `cost_center_name`, `manager`
- `total_row`, `total_col` on

The mechanism: the date range restricts to rows **reported for** last month, `current_month_flag`
restricts to rows **edited** this month. The intersection is a retroactive correction.
`previous_fte_value` is the app's `baseline_fte_value` — the amount before the correction.

### 1135499081 · manager activity
Basic table · allocation view · description "shows latest allocation by manager"

- **Columns** `manager`, `MAX(__created__)` aliased "last allocation date", `days since last allocation`
- **Filters** `days since last allocation NOT IN ('')`, `manager NOT IN ('')`
- **Sort** `days since last allocation` descending — stalest first
- **Slicers** `cost_center_name`, `manager`
- Heatmap on, log scale, ranged by column, gradient-1

The `NOT IN ('')` filter drops placeholder rows, which have no AppDB document and therefore no
timestamps.

### 1856836430 · fte targets
Vertical stacked bar · **targets view**

- **Item** `CalendarQuarter` (calendar column) · **Value** `SUM(allocation_amount)` · **Series** `cost_center_name`
- **Date grain** `allocation_date` → QUARTER · **Filters** none
- Data labels show value and total
- **Drills to** card `790319402`

### 740866118 · fte targets table
Pivot · **targets view**

- **Rows** `cost_center_name`, `Account Region`, `P&L country`, `Opco Tagetik`, `Invoiced entity`
- **Columns** `CalendarQuarter`, `fte_country`, `department` · **Value** `SUM(allocation_amount)`
- **Date range** current year · **Slicers** `region`, `manager`
- `total_row`, `total_col` on · **Drills to** card `1309369940`

### 233285129 · pto table
Pivot · **PTO view**

- **Rows** `full_name`, `manager`, `fte_country`, `department`
- **Columns** `month_greg` (as "month", `MM-yyyy`), `week_end_greg` (as "w/e date")
- **Value** `SUM(allocation_amount)` aliased "pto fte" · **Filters** `rank = 1`
- **Date range** current month · **Slicers** `department`, `allocation_type`
- `total_col`, `subtotal_columns` on

Uses `month_greg` directly where the rest of this dashboard uses `Reporting Month Gregorian` — the
two views expose the same underlying column under different names.

### Text cards
`979331715` allocations · `1777108902` corrections · `324743655` governance · `794244009` targets ·
`373562795` pto. All h1, colour `#BAD808`, centred, transparent background, titles hidden.

---

## `nam fte reporting` — layout order

| # | Card | id | Type |
|---|---|---|---|
| 1 | *nam fte reporting (based on 4-4-5 calendar)* | 20810839 | text |
| 2 | total allocations nam | 1696488878 | vertical multi bar |
| PB | | | |
| 3 | nam client roll up | 1093140541 | pivot + big number |
| 4 | nam fte level allocations | 990314959 | pivot |
| PB | | | |
| 5 | missing allocations by manager nam | 1115375352 | pivot |
| 6 | month over month change in allocation by client nam | 4535886 | pivot |
| PB | | | |
| 7 | *corrections* | 229450524 | text |
| 8 | previous month corrections nam | 1624066000 | pivot |
| 9 | *pto* | 1885639321 | text |
| PB | | | |
| 10 | pto table nam | 1066754456 | pivot |

The NAM view is already filtered to `fte_country` = United States of America **or** Canada by its
dataflow, so no card repeats that filter.

---

## `nam fte reporting` — card specs

### 1696488878 · total allocations nam
Vertical multi bar · nam charge view

- **Item** `CalendarMonth` (calendar column) · **Value** `SUM(allocation_amount)` · **Series** `cost_center_name`
- **Filters** `allocation_type IN ('bulk','weekly')`
- **Date range** current quarter, bound to `Calendar Reporting Month Date`, grain MONTH
- **Slicers** `cost_center_name` ("client"), `allocation_type`

### 1093140541 · nam client roll up
Pivot + big number · nam charge view

- **Big number** `SUM(allocation_amount)` aliased "total fte"
- **Rows** `cost_center_name`, `Account Region`, `P&L country`, `service type`, `Opco Tagetik`, `Invoiced entity`
- **Columns** `calculation_6c9c1521` (a Beast Mode month column), `fte_country`, `department`
- **Value** `calculation_fd68e718` (monthly average)
- **Filters** `allocation_type IN ('bulk','weekly')`, `rank = 1`
- **Date range** current month, bound to `Reporting Month Date` · **Slicers** `department`, `cost_center_name`
- `total_row`, `total_col` on

### 990314959 · nam fte level allocations
Pivot · nam charge view · description "based on 4-45 calendar"

- **Rows** `full_name`, `person_id`, `fte_country`, `department`, `calculation_023b4622`, `cost_center_number`, **`AVG(Charge Rate)`**
- **Columns** `Reporting Month Date`, `Reporting Week Date` (as "w/e date")
- **Values** `calculation_fd68e718` aliased "fte allocation", `calculation_1928813c`
- **Filters** `allocation_type IN ('bulk','placeholder','weekly')`, `rank = 1`
- **No date range** — shows the full window
- **Slicers** `department`, `allocation_type` (**`placeholder` preselected in `NOT_IN`**)
- `total_col`, `subtotal_columns` on

`Charge Rate` is an aggregate sitting in a **row** position, which is unusual — it comes from the
`fte_nam_charge` file joined on lowercased email. `calculation_1928813c` is the second measure and is
most likely FTE × charge rate; confirm the formula before changing anything that depends on it.

### 1115375352 · missing allocations by manager nam
Pivot · nam charge view · description "default date is previous month"

- **Rows** `manager`, `full_name`
- **Columns** `Calendar Reporting Month Date` (totals and subtotals hidden on this column), `Reporting Week Date` (as "reporting w/e date")
- **Values** `calculation_4f52f36e` aliased "assigned fte", `SUM(allocation_amount)` aliased "allocated fte", `calculation_cfec1f69`
- **Filters** `missing_flag = 0`, `rank = 1`
- **Date range** previous month · manager rows collapsed
- `total_row`, `total_col`, `subtotal_rows`, `subtotal_columns` on

### 4535886 · month over month change in allocation by client nam
Pivot · nam charge view

- **Rows** `cost_center_name` · **Columns** `CalendarMonth`
- **Values** `SUM(allocation_amount)` aliased "total fte", `calculation_550d9d14` — both formatted to 1 decimal
- **Filters** `allocation_type IN ('bulk','weekly')`, `rank = 1`
- **Date range** rolling 3 months on `Calendar Reporting Month Date` · **Slicer** `cost_center_name`

### 1624066000 · previous month corrections nam
Pivot · nam charge view

- **Rows** `fte_country`, `department`, `allocation_name` (as "fte"), `manager`, `cost_center_name`, `cost_center_number`
- **Columns** `Calendar Reporting Month Date`
- **Values** `SUM(allocation_amount)` "current allocation", `SUM(previous_fte_value)` "previous allocation", `SUM(calculation_0b641cab)`
- **Filters** `calculation_0b641cab NOT IN ('')`, `calculation_ee56f30c = 1`, `rank = 1`
- **Date range** previous month · **Slicers** `cost_center_name`, `manager`

### 1066754456 · pto table nam
Pivot · **PTO view** (not the NAM view)

- **Rows** `full_name`, `manager`, `fte_country`, `department`
- **Columns** `Calendar Reporting Month Date`, `Reporting Week Date` (as "w/e date")
- **Value** `SUM(allocation_amount)` aliased "pto fte"
- **Filters** `rank = 1`, **`region CONTAINS 'NAM'`**
- **Date range** previous month · **Slicers** `department`, `allocation_type`

Because this reads the shared PTO view rather than the NAM one, it has to filter region itself.
`region` is set per source in the HR dataflow.

### Text cards
`20810839` page header · `229450524` corrections · `1885639321` pto.

---

## Beast Modes

Ids are per environment. These are page `1981930666`'s; the NAM page has its own set.

| Name | id | Type | Computes | Used by |
|---|---|---|---|---|
| `dcount_person` | `…d28c0dcb` | LONG | `COUNT(DISTINCT person_id)` | 1147894975, 390455741 |
| `allocation_monthly` | `…c3044639` | DOUBLE | `SUM(allocation_amount) / COUNT(DISTINCT Day)` — weekly average across the group | 911852408, 184728100 |
| `allocation_check` | `…978e20f6` | DOUBLE | `SUM(allocation_amount) - AVG(fte)` — over/under against assigned FTE | 1984232073 |
| `change in allocation` | `…bd43e89c` | DOUBLE | `previous_fte_value - allocation_amount` — positive means the allocation went **down** | 1038605280 |
| `current_month_flag` | `…71991855` | LONG | `1` when `LAST_DAY(__modified__) = LAST_DAY(CURRENT_DATE())` — edited this calendar month | 1038605280 (filter only) |
| `fte2` | `…1c70ccfb` | DOUBLE | `SUM(fte) / NULLIF(COUNT(DISTINCT cost_center_name), 0)` — de-duplicated assigned FTE | 1462533056 |
| `missing fte allocations` | `…054572a4` | DOUBLE | `SUM(allocation_amount) - SUM(fte)` | 1462533056 |
| `Net Change MoM` | `…5e828d42` | DOUBLE | `SUM(amount) - LAG(SUM(amount)) OVER (PARTITION BY cost_center_name ORDER BY Calendar Reporting Month Date)` | 659593651 |
| `days since last allocation` | `…901a4e07` | LONG | `DATEDIFF(CURRENT_DATE(), MAX(__modified__))` | 1135499081 |
| `fte level cost center name` | `…ff6b16f3` | STRING | `CASE WHEN allocation_type = 'bulk' THEN department ELSE cost_center_name END` | 184728100 |

Formula text above was read from the other environment's Beast Mode Manager. The roles are confirmed
by usage; verify the text before editing.

**NAM page ids**, roles inferred from position, formulas not captured:
`…fd68e718` monthly average · `…6c9c1521` month column · `…023b4622` cost-centre name ·
`…1928813c` second measure on the detail card · `…4f52f36e` assigned fte ·
`…cfec1f69` missing allocations · `…550d9d14` net change MoM · `…0b641cab` change in allocation ·
`…ee56f30c` current month flag.

---

## Where each column comes from

Every column the cards use, and the ETL tile that produces it.

### From the HR roster (`consolidated_hr_fte_report`)

`full_name` · `person_id` · `department` · `manager` · `manager_email` · `fte` · `region` ·
`opco` · `person_email` · `missing_flag` · `status` · `end_date` · `fte_country` (renamed from
`country`)

Reaches the main flow via `Select Columns` and `Select Columns 6`. The HR flow unions five regional
systems and normalises status, department buckets, country spellings and FTE nulls before this point.
`missing_flag` is set per source and marks managers not expected to log.

### From the app (`weekly_allocation` AppDB)

`allocation_date` (**the Monday** of the week) · `allocation_name` · `allocation_amount` ·
`cost_center_name` · `cost_center_number` · `no_charge_flag` · `baseline_fte_value` ·
`correction_month` · `__created__` · `__modified__`

`allocation_name` arrives as `[id] Name` and has the prefix stripped by `Add Formula` before the HR
join.

### From the bulk profile collections

`allocation_type = 'bulk'` · `department` (from `allocation_group`) · `employee_count` · `num_weeks`

The bulk branch joins to calendar Mondays on
`allocation_monthyear = DATE_FORMAT(DATE_ADD(Day, INTERVAL 4 DAY), '%b %Y')`, then divides:
`allocation_amount / num_weeks / employee_count`. So bulk rows land on the **Gregorian** month.

### From the 4-4-5 calendar (`mst_blue_global_calendar_445`)

`Day` (the Monday, the spine of the whole dataset) · `Reporting Week Date` (the Sunday) ·
`Calendar Reporting Month` · `Calendar Reporting Year` · `Reporting Month Date` ·
`Calendar Reporting Month Date` (attached by `Join Data 8`) · `CalendarMonth` / `CalendarQuarter`
(calendar columns available to cards directly)

### From the cost-centre guidance file

`AI level name` · `Account Region` · `P&L country` · `service type` · `Opco Tagetik` ·
`Invoiced entity` · `cost center code report`

Attached by `Join Data 4`, joined `cost_center_name = AI level name`. A cost centre missing from the
guidance file gets nulls in all of these and will group separately on the roll-up cards.

### Derived inside the main ETL

| Column | Tile | Expression |
|---|---|---|
| `allocation_type` | `Add Formula 1` / `4` / `5` | `'weekly'` / `'bulk'` / null → `'placeholder'` |
| `rank` | `Rank & Window` | `RANK()` over `(allocation_date, allocation_name, cost_center_name, allocation_type)` ordered `__created__ DESC` |
| `previous_fte_value` | `Add Formula 2` | `= baseline_fte_value` |
| `allocation_staus` | `Add Formula 5` | 4-branch CASE comparing amount to `fte` |
| `week_end_greg` | `Add Formula 8` | `DATE_ADD(Day, INTERVAL 4 DAY)` — the Friday |
| `month_greg` | `Add Formula 8` | `DATE_TRUNC('month', week_end_greg)` |
| `last_updated` | `Add Formula 9` | `DATE_FORMAT(CURRENT_TIMESTAMP(), '%d/%m/%Y %h:%i %p')` |

`Reporting Month Gregorian` does not exist in the base dataset — it is `month_greg` renamed by
`fte_full_calendar_allocation_view`.

### Only on the NAM dataset

`Charge Rate` — from `fte_nam_charge`, LEFT JOINed on `person_email = LOWER(Employee Email Address)`.
Nulls where a person is absent from that file or their email has changed.

---

## Making common changes

**Adding a column to a card.** Check §"Where each column comes from" first — if it isn't there, it
isn't in the dataset and needs an ETL change, not a card change. Columns from the guidance join will
be null for unmatched cost centres.

**Changing a date range.** Note which column the range is bound to; it is not always the column in
the pivot. On the NAM cards especially, the range often binds `Calendar Reporting Month Date` while
the columns show `CalendarMonth`.

**Switching a card between axes.** Change the week column, the month column **and** any Beast Mode
that orders or partitions on a date — `Net Change MoM` orders on `Calendar Reporting Month Date`
regardless of what the card displays.

**Adding a filter.** `rank = 1` and an `allocation_type` filter are the two most cards carry. Check
the slicer defaults too — a slicer with preselected `NOT_IN` values silently narrows the population
beyond what the card filter says.

**Editing a Beast Mode.** They are shared across cards — `allocation_monthly` and `dcount_person`
each drive two. Check the "Used by" column above, and remember the other environment has its own copy
that will not change.

**Adding a card.** Copy the closest existing one rather than starting fresh; the filter set,
date-range binding and slicer defaults are easy to get subtly wrong.

---

Raw page and dataflow exports: [`_domo_export/`](_domo_export/). ETL detail:
[`fte_full_calendar_allocation.md`](fte_full_calendar_allocation.md).
