# `fte reporting` — the Domo dashboard, card by card

Reference for the Domo page `fte reporting` (page id `1551650036`, parent `1578237276`,
internal `pageName` = `alerts`). It documents what each card computes, which dataset it
reads, and how the cards relate to the ETL described in
[`fte_full_calendar_allocation.md`](fte_full_calendar_allocation.md).

Source of truth for everything below: the page card definition JSON (the
`content/v3/stacks/<pageId>/cards` response) and the Beast Mode formulas captured in
[`_domo_export/beast_modes.md`](_domo_export/beast_modes.md).

> The page JSON itself is not yet checked in. Save it to
> `docs/_domo_export/fte_reporting_page.json` so this doc can be re-derived, and re-capture
> it whenever cards are added or re-pointed.

---

## 1. Read this first: four conventions the whole page depends on

### 1.1 `rank = 1` is the deduplication key

The allocation dataset holds **every version** of every allocation document. `rank` comes
from the ETL's `Rank & Window` tile — `RANK()` over
`(allocation_date, allocation_name, cost_center_name, allocation_type)` ordered by
`__created__ DESC` — so `rank = 1` is the newest document and `rank > 1` are superseded
edits that were never deleted.

**Any card that sums `allocation_amount` without `rank = 1` counts superseded edits.**
Twelve of the thirteen data cards apply it. One does not — see §5.1.

### 1.2 `allocation_type` decides which population you are looking at

| Value | Meaning |
|---|---|
| `weekly` | written by the Weekly Allocation grid |
| `bulk` | exploded from a monthly bulk profile onto that month's Mondays |
| `placeholder` | synthetic skeleton row — person-week with **nothing logged**, amount `0` |

Cards that report *what was allocated* filter `IN ('bulk','weekly')`. Cards that report
*coverage* (who is missing) need the `placeholder` rows. Getting this wrong turns a
"no logs entered" gap into a silent zero.

### 1.3 Two time axes, and this page mixes them

Per [§3 of the ETL doc](fte_full_calendar_allocation.md), the dataset carries a fiscal 4-4-5
axis (`Day`, `Reporting Week Date`, `Calendar Reporting Month Date`) and a Gregorian axis
(`week_end_greg` = the **Friday**, `month_greg` = the Gregorian month containing that Friday).
The dataset exists for **calendar-month** reporting, so the Gregorian axis is the intended one.

Almost every card on this page groups by `Reporting Month Gregorian` and `week_end_greg` —
correct. **One Beast Mode reaches for the fiscal axis instead**, see §5.2.

### 1.4 Beast Modes here are correct at the leaf, not in totals

Six of the ten Beast Modes divide or subtract across the grain (person × week × cost centre).
They give the right answer in a leaf cell and a wrong one in any subtotal or total row that
spans multiple weeks or multiple cost centres. Several cards have `total_row` / `total_col`
/ `subtotal_columns` switched on. See §5.3.

---

## 2. Sources

| Dataset (view) | GUID | Used by |
|---|---|---|
| `fte_full_calendar_allocation_view` | `eeba8836-7e01-4bb7-bc3f-73915fce5523` | 10 cards |
| `fte_targets_view` | `0c0ae204-d9dc-4dc8-924c-b2a789e3922d` | 2 cards |
| `fte_full_calendar_allocation_pto` | `9f43ac77-723c-4ab2-9d16-2d03057701ba` | 1 card |

All three are **dataset views**, not the base datasets the ETL publishes. Their view
definitions are not yet captured — see §7.

---

## 3. Layout and reading order

Page background `#0F1941`, section headers `#BAD808` (Randstad brand). Six text cards act
as section dividers; `PB` marks a print page break.

| Order | Card | id | Type | Section |
|---|---|---|---|---|
| 1 | dataset last updated (UTC) | 371769740 | single value | — |
| 2 | Total FTEs | 909787458 | single value | — |
| 3 | Allocated FTEs | 1947398748 | single value | — |
| 4 | **allocations** | 1746037119 | text | header |
| 5 | total allocations | 747955760 | stacked/multi bar | allocations |
| PB | | | | |
| 6 | client roll up | 84279959 | pivot + big number | allocations |
| 7 | fte level allocations | 1659132694 | pivot | allocations |
| PB | | | | |
| 8 | over / under allocation | 728770033 | pivot | allocations |
| 9 | missing allocations by manager | 217188567 | pivot | allocations |
| PB | | | | |
| 10 | month over month change in allocation by client | 207264998 | pivot | allocations |
| 11 | **corrections** | 1581178706 | text | header |
| PB | | | | |
| 12 | previous month corrections | 843706280 | pivot | corrections |
| 13 | **governance** | 2079027766 | text | header |
| PB | | | | |
| 14 | manager activity | 1392644214 | basic table | governance |
| 15 | **targets** | 1038112575 | text | header |
| PB | | | | |
| 16 | fte targets | 650855124 | vertical stacked bar | targets |
| 17 | fte targets table | 1248215968 | pivot | targets |
| PB | | | | |
| 18 | **pto** | 2026209425 | text | header |
| 19 | pto table | 1402421756 | pivot | pto |

Note the section headers sit *below* the three summary badges, so the badges belong to no
section, and `month over month change` falls under **allocations** rather than **corrections**
despite reading like a corrections card.

**Cards that ignore the page date filter** (`acceptDateFilter: false`): previous month
corrections, month over month change, both targets cards, and dataset last updated. The
last one also sets `acceptFilters: false`, so no page filter of any kind reaches it —
correct, since it is a freshness indicator rather than an analytic.

---

## 4. Card reference

### 4.1 dataset last updated (UTC) — `371769740`

`MAX(last_updated)` from `fte_full_calendar_allocation_view`. No filters.

`last_updated` is written by the ETL's final `Add Formula 9` as
`DATE_FORMAT(CURRENT_TIMESTAMP(), '%d/%m/%Y %h:%i %p')` — a **string**, so `MAX()` is a
lexicographic comparison, not a chronological one. It is harmless today only because the
dataflow publishes with `REPLACE`, so every row carries the identical timestamp. See §5.5.

### 4.2 Total FTEs — `909787458`

`dcount_person` = `COUNT(DISTINCT person_id)`. **No filters at all.**

Because the measure is a distinct count, the missing `rank = 1` does not distort it. It
counts every person present in the calendar skeleton — i.e. the whole roster in the reporting
window, allocated or not. That is the correct denominator for "how many people should have
allocations", which is what it is paired with.

### 4.3 Allocated FTEs — `1947398748`

Same Beast Mode, filtered `rank = 1`. Header says "Allocated FTEs" but the measure is
`COUNT(DISTINCT person_id)` — it is a **count of people**, not a sum of FTE. Read as
"people with a current allocation record". Set against 4.2 it gives coverage.

### 4.4 total allocations — `747955760`

Vertical multi-bar. `Reporting Month Gregorian` on the item axis (grain: MONTH),
`SUM(allocation_amount)` as the value, `cost_center_name` as the series. Date range:
current quarter (`INTERVAL_OFFSET QUARTER offset 0`). Sorted by fiscal `CalendarMonth`
ascending, then value descending. Slicers: `cost_center_name` (labelled "client"),
`allocation_type`.

**Filters: `allocation_type IN ('bulk','weekly')` only — no `rank = 1`.** See §5.1.

### 4.5 client roll up — `84279959`

Two components. The big number is `SUM(allocation_amount)` aliased "total fte", abbreviated.
The pivot is:

- **Rows:** `cost_center_name`, `Account Region`, `P&L country`, `service type`, `Opco Tagetik`, `Invoiced entity`
- **Columns:** `Reporting Month Gregorian` (as "month", `MM-yyyy`), `fte_country`, `department`
- **Value:** `allocation_monthly` aliased "fte allocation"
- **Filters:** `allocation_type IN ('bulk','weekly')`, `rank = 1`
- **Date range:** current month · **Slicers:** `department`, `cost_center_name` ("client")
- `total_row` and `total_col` on, subtotals off

The dynamic title appends the active date range, so it renders as "client roll up - <range>".

Note the big number is a plain `SUM`, while the pivot cells are `allocation_monthly`
(a weekly *average*). The headline number and the grid are in different units.

### 4.6 fte level allocations — `1659132694`

- **Rows:** `full_name`, `person_id`, `fte_country`, `department`, `fte level cost center name`, `cost_center_number`
- **Columns:** `Reporting Month Gregorian` ("month"), `week_end_greg` ("w/e")
- **Value:** `allocation_monthly` aliased "fte allocation"
- **Filters:** `allocation_type IN ('bulk','placeholder','weekly')`, `rank = 1`
- **Date range:** current month · `total_col` and `subtotal_columns` on

This is the only card whose filter admits `placeholder` rows — but its `allocation_type`
slicer ships with `placeholder` **preselected in a `NOT_IN` slicer**, so by default the user
sees the same population as every other card and has to clear the slicer to reveal the gaps.
That toggle also changes the `allocation_monthly` denominator; see §5.3.

Two `department`-ish columns sit side by side here, and they do not mean the same thing —
see §5.4.

### 4.7 over / under allocation — `728770033`

Card description: *"based on Gregorian calendar. compares the allocated fte amount against
the assigned weekly fte value for each employee"*.

- **Rows:** `full_name`, `manager`, `fte_country`
- **Columns:** `Reporting Month Gregorian` ("month"), `week_end_greg` ("w/e date")
- **Values:** `allocation_check`, `AVG(fte)`, `SUM(allocation_amount)`
- **Filters:** `allocation_type IN ('bulk','weekly')`, `allocation_check ≠ 0`, `rank = 1`
- **Date range:** current month · **Slicers:** `cost_center_name`, `manager`
- Totals off, `subtotal_columns` on

`allocation_check` = `SUM(allocation_amount) - AVG(fte)`. `AVG` is the de-duplication
device: `fte` is the person's whole FTE repeated on every cost-centre row, so averaging it
recovers the single value while `allocation_amount` legitimately sums across cost centres.
Exactly right in a person-week cell. The `subtotal_columns` are not — see §5.3.

### 4.8 missing allocations by manager — `217188567`

Card description: *"default date is previous month"* — though the captured definition has
`INTERVAL_OFFSET MONTH offset 0`, i.e. the **current** month. The description and the
configuration disagree; the configuration wins.

- **Rows:** `manager`, `full_name` · **Columns:** `Reporting Month Gregorian` ("month"), `week_end_greg` ("w/e date")
- **Values:** `fte2` aliased "assigned fte", `SUM(allocation_amount)` aliased "allocated fte", `missing fte allocations`
- **Filters:** `missing_flag = 0`, `rank = 1` — **no `allocation_type` filter**, so placeholder rows are included (deliberate: this card is about absence)
- `total_row`, `total_col`, `subtotal_rows`, `subtotal_columns` all on; manager rows collapsed by default

The two FTE-side measures on this card use **different** de-duplication strategies, so the
displayed "assigned fte" is not the value subtracted inside "missing fte allocations".
See §5.3.

### 4.9 month over month change in allocation by client — `207264998`

- **Rows:** `cost_center_name` · **Columns:** `Reporting Month Gregorian` ("month")
- **Values:** `SUM(allocation_amount)` aliased "total fte", `Net Change MoM`
- **Filters:** `allocation_type IN ('bulk','weekly')`, `rank = 1` · no date range
- **Slicers:** `cost_center_name`, `Reporting Month Gregorian`
- `total_row`, `total_col`, `subtotal_rows` on; red negatives off

`Net Change MoM` is a `LAG` window — and it orders on the fiscal month axis while the card
displays the Gregorian one. See §5.2.

### 4.10 previous month corrections — `843706280`

Card description: *"previous month corrections made in the current month"*.

- **Rows:** `fte_country`, `department`, `allocation_name` ("fte"), `manager`, `cost_center_name`, `cost_center_number`
- **Columns:** `Reporting Month Gregorian` ("month")
- **Values:** `SUM(allocation_amount)` ("current allocation"), `SUM(previous_fte_value)` ("previous allocation"), `SUM(change in allocation )`
- **Filters:** `current_month_flag = 1`, `change in allocation NOT IN ('', 0)`, `rank = 1`
- **Date range:** previous month (`INTERVAL_OFFSET MONTH offset 1`) · **Slicers:** `cost_center_name`, `manager`

The mechanism is clean: the date range restricts to rows *reported for* last month, and
`current_month_flag` (`LAST_DAY(__modified__) = LAST_DAY(CURRENT_DATE())`) restricts to rows
*edited* this month. The intersection is precisely a retroactive correction.

`previous_fte_value` comes from the ETL as `LEAD(allocation_amount, 1)` over a `__created__ DESC`
partition — on a `rank = 1` row that is the second-newest document, i.e. the value before the
edit. Rows with only one document get `NULL`, which the `NOT IN ('')` filter removes.

**The sign is inverted relative to the other change measure on the page** — see §5.6.

### 4.11 manager activity — `1392644214`

Card description: *"shows latest allocation by manager."* Basic table with heatmap colouring
(log scale, gradient-1, ranged by column).

- **Columns:** `manager`, `MAX(__created__)` aliased "last allocation date", `days since last allocation`
- **Filters:** `days since last allocation NOT IN ('')`, `manager NOT IN ('')`
- **Sort:** `days since last allocation` descending — most-stale manager first
- **Slicers:** `cost_center_name`, `manager` · no `rank` filter (both measures are maxima, so rank duplication cannot distort them)

The `NOT IN ('')` filter is load-bearing: placeholder skeleton rows carry no AppDB document
and therefore null timestamps, and this drops them.

The two adjacent columns are computed from **different timestamp columns** — see §5.7.

### 4.12 fte targets — `650855124`

Vertical stacked bar on `fte_targets_view`. `CalendarQuarter` (fiscal calendar column) as the
item, `SUM(allocation_amount)` as the value, `cost_center_name` as the series, date grain
QUARTER on `allocation_date`. No filters. Data labels show the value plus a total.
Drills through to card `222399651`.

### 4.13 fte targets table — `1248215968`

- **Rows:** `cost_center_name`, `Account Region`, `P&L country`, `Opco Tagetik`, `Invoiced entity`
- **Columns:** `CalendarQuarter`, `fte_country`, `department` · **Value:** `SUM(allocation_amount)`
- **Date range:** current year · **Slicers:** `region`, `manager` · `total_row`, `total_col` on

Drills through to card `316986536`.

### 4.14 pto table — `1402421756`

Reads the separate `fte_full_calendar_allocation_pto` view.

- **Rows:** `full_name`, `manager`, `fte_country`, `department`
- **Columns:** `month_greg` ("month", `MM-yyyy`), `week_end_greg` ("w/e date")
- **Value:** `SUM(allocation_amount)` aliased "pto fte" · **Filter:** `rank = 1`
- **Date range:** current month · **Slicers:** `department`, `allocation_type`
- `total_col`, `subtotal_columns` on

This card uses `month_greg` directly, whereas every card on the main view uses
`Reporting Month Gregorian`. Most likely the same underlying column exposed under different
names by the two views — unconfirmed, see §7.

---

## 5. Known traps

### 5.1 `total allocations` does not deduplicate by `rank`

[Card 747955760](#44-total-allocations--747955760) filters `allocation_type` only. Every
superseded version of every edited allocation is therefore included in the bars. A cost
centre whose allocations were revised three times contributes all three amounts.

This is the most prominent chart in the allocations section, and it is the only card that
sums `allocation_amount` without `rank = 1`. **Adding `rank = 1` to its filters is almost
certainly the fix**, and it will make the chart's numbers drop — the current figures are
inflated, not the corrected ones deflated.

### 5.2 `Net Change MoM` orders on the fiscal axis, the card displays the Gregorian one

```sql
SUM(`allocation_amount`)
  - LAG(SUM(`allocation_amount`), 1)
      OVER (PARTITION BY `cost_center_name`
            ORDER BY `Calendar Reporting Month Date`)
```

`Calendar Reporting Month Date` is the **fiscal 4-4-5** month anchor. The card's columns are
`Reporting Month Gregorian`. Per [§3 of the ETL doc](fte_full_calendar_allocation.md), those
two axes disagree at every boundary — the week beginning Mon 2026-07-27 is fiscal **AUG** but
Gregorian **JUL**.

So the "previous" value the `LAG` reaches for is the previous *fiscal* month, while the cell
to the left in the pivot is the previous *Gregorian* month. Where a Gregorian month spans two
fiscal months, the window can also produce more than one ordering position per displayed
column. The delta is not reliably the difference between the two adjacent cells the user is
comparing.

Changing the `ORDER BY` to the same column the card pivots on aligns them.

### 5.3 Six Beast Modes are leaf-correct and total-wrong

The dataset grain is person × Monday × cost centre. These measures compensate for that grain
in ways that only hold inside a single leaf cell:

| Beast Mode | Compensation | Breaks when |
|---|---|---|
| `allocation_monthly` | `÷ COUNT(DISTINCT Day)` | the group spans a different number of weeks than intended |
| `allocation_check` | `- AVG(fte)` | the group spans multiple weeks (subtotals) |
| `fte2` | `÷ COUNT(DISTINCT cost_center_name)` | the group spans people with different cost-centre counts |
| `missing fte allocations` | none — plain `SUM(fte)` | the person is split across >1 cost centre |
| `days since last allocation` | `MAX` | — (safe) |
| `dcount_person` | `DISTINCT` | — (safe) |

Two specific consequences worth acting on:

**On `missing allocations by manager` (217188567), the two FTE measures disagree with each
other.** "assigned fte" is `SUM(fte) / NULLIF(COUNT(DISTINCT cost_center_name), 0)`, which
recovers the person's real FTE. "missing fte allocations" is
`SUM(allocation_amount) - SUM(fte)`, which does **not** de-duplicate. For anyone split across
two cost centres, the card shows assigned = 1.0 while the gap column subtracts 2.0. That card
also has all four total/subtotal switches on, compounding it.

**`allocation_monthly` divides by weeks-with-data, not weeks-in-month.** *Reported by users and
confirmed; fix designed, not yet built.*

`COUNT(DISTINCT Day)` counts only the Mondays that still have rows after the card's filters. A
blank weekly cell is not a zero — it is the absence of a row — so it never enters the denominator.
Worked from August 2026 (4 reporting weeks) on card 1659132694:

| Person / cost centre | 08-07 | 08-14 | 08-21 | 08-28 | Shown | Correct |
|---|---|---|---|---|---|---|
| Edina Baja / Philips EMEA | 1.00 | — | 1.00 | 1.00 | **1.00** | 0.75 |
| Edina Baja / UCB DE | — | 1.00 | — | — | **1.00** | 0.25 |
| Csilla Ottenberger / BioGen UK | — | 0.50 | — | — | **0.50** | 0.125 |

The clearest symptom is that Edina Baja's two rows imply **2.0 FTE** for a 1.0 FTE person.
Corrected they sum to 1.00. Anyone split across cost centres over-reports by exactly the factor by
which their weeks are sparse.

Root cause is upstream: the ETL skeleton is person-week grain, not person-cost-centre-week, so no
zero row is ever created for a cost centre the person holds elsewhere in the month — see
[§6.1 of the ETL doc](fte_full_calendar_allocation.md). The `'Unassigned'` / `placeholder` rows that
do exist only appear when a person has nothing at all that week, and they sit on a *different pivot
row*, so they cannot rescue the denominator.

**Fix applied in the app, not in reporting.** Users can now type an explicit `0` in the Weekly
Allocation grid and it persists, so the zero arrives attached to its cost centre. Clearing a cell to
blank still deletes, so blank and zero now mean different things. Caveat that matters for reading
this card: it only fixes weeks somebody actually zeroes — untouched weeks and existing history are
unchanged, so a person's rows may still sum to more than their FTE until the gaps are filled in.

There is no Beast Mode-only fix. `SUM(amount) / MAX(weeks_in_month)` is right at the month subtotal
and wrong (÷4) in every weekly column; `COUNT(DISTINCT Day)` is right weekly and wrong monthly. One
expression cannot switch on pivot grain. The fix is to densify the data to cost-centre grain, after
which the existing formula is correct at both levels unchanged.

`client roll up` (84279959) shares the Beast Mode and has the same defect, less dramatically — at
cost-centre grain the denominator already unions across people. On `fte level allocations` the
denominator shifts again the moment a user clears the `placeholder` slicer, because skeleton rows
then join the count.

Grand totals on both cards are averages over the entire visible window, so **the total column
is not the sum of the columns beside it**.

### 5.4 `department` means two different things on the same card

The ETL's bulk branch maps `allocation_group → department` ([§2.4](fte_full_calendar_allocation.md)),
so on `bulk` rows the `department` column holds the bulk profile's group label, not the HR
department. `fte level cost center name` exists to work around exactly this:

```sql
case when `allocation_type` = 'bulk' then `department` else `cost_center_name` end
```

But `fte level allocations` (1659132694) displays **both** `department` and
`fte level cost center name` as adjacent row dimensions. On a weekly row they read as
(HR department, cost centre); on a bulk row they read as (bulk group, bulk group). Same
column header, two meanings, one table.

### 5.5 `last_updated` is a string in `dd/mm/yyyy` form

`MAX()` over it is lexicographic. It is benign only because the dataflow publishes with
`REPLACE`, giving every row an identical value. If the flow ever moves to an append or upsert
strategy, the freshness badge will start reporting whichever date sorts highest as text
(`31/01` beats `01/12`) rather than the newest.

The badge is also labelled "(UTC)" while the ETL writes `CURRENT_TIMESTAMP()`, whose timezone
follows the instance setting. Worth confirming the label is truthful.

### 5.6 The two "change" measures have opposite sign conventions

| Card | Measure | Formula | Positive means |
|---|---|---|---|
| previous month corrections | `change in allocation ` | `previous_fte_value - allocation_amount` | allocation went **down** |
| month over month change | `Net Change MoM` | `current - LAG(current)` | allocation went **up** |

Both appear on the same dashboard, one section apart, and neither column header states its
direction. `Net Change MoM` follows the usual convention; `change in allocation ` does not.
(That Beast Mode's name also ends in a trailing space, which is what renders as the column
header.)

### 5.7 `manager activity` mixes `__created__` and `__modified__`

The card displays `MAX(__created__)` as "last allocation date" but computes staleness as
`DATEDIFF(CURRENT_DATE(), MAX(__modified__))`. A manager who edited a March allocation
yesterday shows "last allocation date: March" next to "days since last allocation: 1".

Since the card exists to surface inactive managers and is sorted on the `__modified__`-based
column, an edit to old data currently resets a manager's staleness. Decide which event the
card is meant to track and use that column for both.

### 5.8 Stale sort overrides reference a column the cards do not show

`fte level allocations` and `pto table` both carry
`column_sort: [{"column": "Reporting Week Date", "sort": "asc"}]` while displaying
`week_end_greg`. `Reporting Week Date` is the fiscal **Sunday**; `week_end_greg` is the
Gregorian **Friday**. Leftover configuration — harmless today, misleading to read.

### 5.9 Four Beast Modes have expired certification

`allocation_check`, `fte2`, `missing fte allocations` and `Net Change MoM` all carry
`certificationStatus: EXPIRED`. Given §5.2 and §5.3, at least two of the four have substantive
issues to resolve before re-certifying.

### 5.10 A parallel copy of these Beast Modes exists on another dataset

Seven of these Beast Modes have same-named twins with different GUIDs built against
`ea7fcf13-be5c-40ae-9a28-1aea9c2dc44b`, used by cards not on this page (`183975686`,
`1661997696`, `2046658839`, `1264204997`, `174451776`):

| Name | This dashboard | The `ea7fcf13` copy |
|---|---|---|
| `Net Change MoM` | `…7aeb4e42` | `…718dd96d` |
| `allocation_monthly` | `…679ac87e` | `…6b95e1d9` |
| `current_month_flag` | `…1668107e` | `…992aa524` |
| `fte level cost center name` | `…41b78001` | `…c993660d` |
| `fte2` | `…4fee568b` | `…77415173` |
| `missing fte allocations` | `…6947f1de` | `…a708c1c4` |
| `prev_month` | `…dfdf5cfc` | `…11f3719c` |

They are independent definitions. Any fix applied here leaves the other set unchanged, and
nothing in either surface flags the divergence. Establish whether that second dataset is a
live parallel report or an abandoned fork.

Three orphan Beast Modes with no card links also sit on these datasets: `allocation_test`,
`prev_month` (`…dfdf5cfc`) and `charge calc`, plus `check` / `check2` on `811453b8`.

---

## 6. What breaks this dashboard

Changes elsewhere that would silently corrupt cards here:

| Change | Breaks |
|---|---|
| Reordering `Add Formula 5` #6 and #7 in the ETL | `department` attribution → 4.6, 4.10, 4.14, and `fte level cost center name` |
| Changing `OWNING_MONTH_OFFSET_DAYS` in [`fiscal-calendar.ts`](../src/lib/fiscal-calendar.ts) without changing `week_end_greg` in the ETL | every card grouped on `Reporting Month Gregorian` or `week_end_greg` — i.e. all ten allocation cards |
| Changing the `Rank & Window` partition or its `__created__ DESC` order | `rank = 1` on twelve cards, and `previous_fte_value` on 4.10 |
| Renaming or dropping `missing_flag` | 4.8 silently returns everything |
| Switching `PublishToVault` off `REPLACE` | 4.1 (see §5.5), and `current_month_flag` if `__modified__` semantics change |
| Adding a cost centre split to a person already reported | `missing fte allocations` on 4.8 (see §5.3) |
| Changing the grain of the ETL skeleton — e.g. adding `cost_center_name` to the `Join Data 7` key, or adding a densifying branch | intentionally changes `allocation_monthly` on 4.5 and 4.6 (that is the §5.3 fix), but also adds rows visible to 4.8 and 4.7, which need a compensating filter |
| Editing a Beast Mode here | leaves the `ea7fcf13` twin diverged (see §5.10) |

---

## 7. Open gaps

Not yet captured, and needed to make this doc complete:

1. **Dataset view definitions** for all three views. The cards reference columns that do not
   appear in the ETL doc — `Reporting Month Gregorian`, `Account Region`, `P&L country`,
   `Opco Tagetik`, `Invoiced entity`, `service type` — so either the views add them or the ETL
   has grown since that doc was written. Until this is resolved, the mapping from
   `Reporting Month Gregorian` to the ETL's `month_greg` is an inference, not a fact.
2. **Drill-target cards `222399651` and `316986536`**, reached from the two targets cards.
   Neither is on this page, so neither definition is in the captured payload.
3. **The `ea7fcf13-be5c-40ae-9a28-1aea9c2dc44b` dataset and its cards** — parallel or dead
   (§5.10).
4. **PDP policies** on any of the three views, which would change what each card means per
   viewer.
5. **The page JSON itself**, which should be checked in alongside
   [`_domo_export/beast_modes.md`](_domo_export/beast_modes.md).
6. **Which column card 1659132694's date range is bound to.** If it filters `Day` rather than
   `Reporting Month Gregorian`, "August" clips to five Mondays while `month_greg` groups four — which
   would leave the §5.3 denominator wrong even after the data is densified.

---

## 8. Open work

**§5.3 `allocation_monthly` denominator — addressed in the app; the SQL route below is shelved.**

The chosen fix lets users enter an explicit `0` in the Weekly Allocation grid so the zero persists
and reaches this dataset attached to its cost centre. It fixes only weeks somebody zeroes; untouched
weeks and existing history are unaffected. See §6.1 of the
[ETL doc](fte_full_calendar_allocation.md).

Everything below describes the **shelved** downstream densification, kept because it remains a
working option if the gap-week limitation proves unacceptable. It was never deployed — its first
build attempt returned no rows from transform 1, diagnostics in
[`domo_sql/README.md`](domo_sql/README.md).

<details>
<summary>Shelved: SQL densification</summary>

Reported, root-caused, written; not yet deployed.

The fix densifies the allocation data to person-cost-centre-week grain, so a blank week becomes a
real zero row and `COUNT(DISTINCT Day)` returns the weeks *in the month* rather than the weeks *with
data*. The Beast Mode formula does not change — it becomes correct at both pivot levels as written.

Implementation: [`domo_sql/densify_full_calendar_allocation.sql`](domo_sql/densify_full_calendar_allocation.sql),
a **separate MySQL dataflow** reading the Magic ETL's published output and writing a new dataset,
**scheduled to trigger on input dataset update** rather than on a clock. The dataset views are then
re-pointed at it; no card is re-pointed. This placement also keeps zero-fill rows out of the Magic
ETL's self-referencing history branch, which removes the irreversibility trap in
[§6.3 of the ETL doc](fte_full_calendar_allocation.md).

Two alternatives were considered and rejected: densifying inside the Magic ETL (one dataflow, but 16
tiles of unversioned UI state and it re-introduces the history-branch risks), and rebuilding the whole
flow in SQL from the raw inputs (the active triples this needs don't exist before the bulk explosion
and rank window have run, and MySQL 5.x has no `RANK()`/`LEAD()`).

Required alongside it: expose `zero_fill_flag` in both views, and add `zero_fill_flag = 0` to card
217188567's filters.

Step-by-step build and cutover instructions: [`domo_sql/README.md`](domo_sql/README.md).

**Two questions were left open and are now settled:**

*Bulk rows are included.* The unresolved axis contradiction in
[§6.4 of the ETL doc](fte_full_calendar_allocation.md) does not gate this change. These cards report
Gregorian months, so densifying on the Gregorian axis is self-consistent whichever axis the bulk
explosion uses. If bulk does land on fiscal Mondays, a profile straddles two Gregorian months and its
per-month averages will drop — that is the mismatch becoming visible, and the current full-strength
figures are wrong in the other direction. Diagnostic §7.4 is still worth running, to anticipate the
drop and to schedule a fix for the mismatch itself.

*The column list can no longer drop a column.* Real rows are copied with `SELECT *`; only the
manufactured zero rows use an explicit list, so an unnamed column lands as NULL on those rows alone.
That is harmless except on a column a card uses as a pivot **row** dimension — the guidance columns
on card 84279959 — which are named explicitly. Verification V9 detects any that were missed.

Diagnostics to size the change are in [§7 of the ETL doc](fte_full_calendar_allocation.md);
verification steps are in the SQL file.

</details>
