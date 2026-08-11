# Beast Modes used by the `fte reporting` dashboard (page `1551650036`)

Names, GUIDs, data types and card links below are confirmed from the Beast Mode Manager
list response — **do not edit them**. Only the formula blocks need filling in.

All ten are `global: false` and read `fte_full_calendar_allocation_view`
(`eeba8836-7e01-4bb7-bc3f-73915fce5523`).

`BM id` is the numeric Beast Mode Manager id — useful if you can fetch each one directly.

---

## 1. `dcount_person` — BM id `11409`

`calculation_2c6f2a91-f9c6-4e25-a5b2-8d7a0c5138cd` · **LONG**

The only measure on both single-value badges: `consolidated_hr_fte_report_view`
(card 909787458, header **"Total FTEs"**) and `fte_weekly_allocation`
(card 1947398748, header **"Allocated FTEs"**).

Name + LONG type says distinct count of people. Same formula on both cards — the only
difference between the two badges is that 1947398748 filters `rank = 1` and 909787458
does not.

```
formula: COUNT(DISTINCT `person_id`)

```

---

## 2. `allocation_monthly` — BM id `11493`

`calculation_679ac87e-5467-4bcf-9bec-8eff996b2e63` · **DOUBLE**

Aliased **"fte allocation"** on `client roll up -` (card 84279959) and
`fte level allocations` (card 1659132694). Both cards filter `allocation_type IN (…)`
and `rank = 1`.

```
formula:SUM(`allocation_amount`) / COUNT(DISTINCT `Day`)

```

---

## 3. `allocation_check` — BM id `11410` · ⚠️ certification EXPIRED

`calculation_8e3e5e5c-44db-441b-9ceb-2b8ac3a472c6` · **DOUBLE**

First measure on `over / under allocation` (card 728770033), **and** a filter on the same
card (`≠ 0`). Displayed beside `AVG(fte)` and `SUM(allocation_amount)`.

```
formula:(SUM(`allocation_amount`) - AVG(`fte`))

```

---

## 4. `change in allocation ` — BM id `11774`

`calculation_7129887d-3a52-4003-83da-f3d35dc1b6b5` · **DOUBLE**
(note the trailing space in the name)

Third measure on `previous month corrections` (card 843706280), **and** a filter on the
same card (`NOT IN ('', 0)`). This is the one the card wraps in `SUM(…)`, so it should be
row-level rather than self-aggregating.

```
formula:`previous_fte_value` - `allocation_amount`

```

---

## 5. `current_month_flag` — BM id `11771`

`calculation_1668107e-2d25-41eb-936a-b897a861a32d` · **LONG**

`previous month corrections` (card 843706280) — **filter only**, `= 1`. Never displayed.
It is a saved beast mode, not card-scoped.

```
formula:CASE     WHEN LAST_DAY(`__modified__`) = LAST_DAY(CURRENT_DATE())     THEN 1    ELSE 0 END

```

---

## 6. `fte2` — BM id `11772` · ⚠️ certification EXPIRED

`calculation_4fee568b-e262-4213-959d-879643668108` · **DOUBLE**

Aliased **"assigned fte"** on `missing allocations by manager` (card 217188567), which
filters `missing_flag = 0` and `rank = 1`.

```
formula:SUM(`fte`) / NULLIF(COUNT(DISTINCT `cost_center_name`), 0)

```

---

## 7. `missing fte allocations` — BM id `11408` · ⚠️ certification EXPIRED

`calculation_6947f1de-1a1b-4c89-91e0-cd42f9049582` · **DOUBLE**

Third measure on `missing allocations by manager` (card 217188567), no alias — so
"missing fte allocations" is the visible column header. Follows "assigned fte" (#6) and
"allocated fte" (`SUM(allocation_amount)`).

```
formula:(SUM(`allocation_amount`) - sum(`fte`))

```

---

## 8. `Net Change MoM` — BM id `11793` · ⚠️ certification EXPIRED

`calculation_7aeb4e42-249a-4218-bd02-e431c9b9d9c3` · **DOUBLE**

Second measure on `month over month change in allocation by client` (card 207264998),
no alias — "Net Change MoM" is the visible column header. Paired with
`SUM(allocation_amount)` aliased "total fte", pivoted `cost_center_name` × month.

```
formula:SUM(`allocation_amount`) - LAG(SUM(`allocation_amount`), 1) OVER (PARTITION BY `cost_center_name` ORDER BY `Calendar Reporting Month Date`)

```

---

## 9. `days since last allocation` — BM id `11773`

`calculation_56721310-a119-4518-8ab2-6a1e3b143f7b` · **LONG**

`manager activity` (card 1392644214) — displayed, used as the descending **sort key**,
used as a filter (`NOT IN ('')`), and the column the heatmap colours. Shown next to
`manager` and `MAX(__created__)` aliased "last allocation date".

```
formula:DATEDIFF(CURRENT_DATE(),MAX(`__modified__`))

```

---

## 10. `fte level cost center name` — BM id `11411`

`calculation_41b78001-4bb5-4136-8b41-3dae617835af` · **STRING**

`fte level allocations` (card 1659132694) — a **ROW dimension**, between `department`
and `cost_center_number`, and in the card's `groupBy`. The only non-numeric one.

```
formula:case when `allocation_type` = 'bulk' then `department` else `cost_center_name` end

```
