-- densify_full_calendar_allocation.sql
--
-- PURPOSE
--   Adds a zero-amount row for every (person, cost centre, allocation_type, Monday) that is
--   active somewhere in a Gregorian month but has no logged allocation in that particular week.
--
--   This makes the Beast Mode `allocation_monthly` = SUM(allocation_amount) / COUNT(DISTINCT Day)
--   correct at BOTH pivot levels with no formula change: denominator 1 in a weekly cell,
--   4 (or 5) in a month subtotal. See docs/domo_reporting_dashboard.md §5.3 and
--   docs/fte_full_calendar_allocation.md §6.1.
--
-- ============================================================================================
-- DATAFLOW FORM
-- ============================================================================================
--
--   Type            MySQL
--   Name            densify_full_calendar_allocation
--   Description     Adds zero rows at person-cost-centre-week grain so monthly averages
--                   divide by weeks in the month, not weeks with data.
--
--   SCHEDULE        Settings -> run when the input dataset updates. NOT a time schedule.
--                   This is what makes the two dataflows one chain rather than two jobs that
--                   can drift apart: Domo runs this flow whenever the Magic ETL publishes
--                   fte_full_calendar_allocation. If it is ever switched to a fixed time and
--                   the Magic ETL runs late, the views serve a dense dataset built from the
--                   previous run's rows — stale, and silently so.
--
--   INPUT DATASETS  (1)
--     fte_full_calendar_allocation          guid 0ce8e039-d17a-4af9-911d-6d96ff6f7e2e
--         The table alias in the dataflow MUST be exactly `fte_full_calendar_allocation`,
--         which is what every statement below references.
--
--   TRANSFORMS      (5, in this order)
--     1  act              active (person, cost centre, type, month) triples
--     2  cal              every Monday of each Gregorian month
--     3  existing_keys    existing rank-1 keys, for the anti-join probe
--     4  dense            every existing row, via SELECT * — this is the output table
--     5  (insert)         the manufactured zeros, INSERTed into dense
--
--   OUTPUT DATASETS (1)
--     fte_full_calendar_allocation_dense    from table `dense`
--         Point this at a NEW scratch dataset for the first run. Do not overwrite
--         0ce8e039-… — a dataset is owned by the dataflow that creates it, and this flow
--         must stay downstream of the Magic ETL.
--
-- ============================================================================================
-- WHY A SEPARATE DOWNSTREAM DATAFLOW
-- ============================================================================================
--   The Magic ETL's self-referencing history branch reads its own previous output. Keeping this
--   densification downstream means zero-fill rows never reach that branch, so the "first published
--   value wins forever" trap in §6.3 of the ETL doc does not apply.
--
--   The alternative considered and rejected was reading the Magic ETL's own source inputs so this
--   could be a single self-contained dataflow. That would mean reimplementing the entire flow —
--   the active (person, cost centre, type, month) triples this densification needs do not exist in
--   the raw inputs, only after the bulk explosion, the roster ranking and the rank window have run.
--   It also depends on RANK() and LEAD(), which MySQL 5.x has no window functions for. Rewriting
--   the whole flow puts all thirteen cards at risk to fix one denominator. The chaining cost is
--   paid instead, and paid down by the update trigger above.
--
--   Failure mode of the chain, for the record: if this flow fails, the views serve the last good
--   dense dataset. Cards show stale numbers, not wrong ones.
--
--   After a green run against the scratch output:
--     1. Set the schedule to trigger on input dataset update (see SCHEDULE above).
--     2. Re-point `fte_full_calendar_allocation_view` (eeba8836-…) at the new dataset.
--     3. Re-point `fte_full_calendar_allocation_pto` (9f43ac77-…) at the new dataset.
--     4. Expose `zero_fill_flag` in both views if their column lists are explicit.
--     5. Add filter `zero_fill_flag = 0` to card 217188567.
--   No card is re-pointed. `fte_targets_view` (0c0ae204-…) is fed by a different output and
--   needs no change.
--
-- ============================================================================================
-- BEFORE THE FIRST RUN — two things to settle
-- ============================================================================================
--
-- (1) COLUMN LIST. Existing rows are copied with SELECT * (transform 4), so no column can be
--     dropped from them — that failure mode is designed out. The zero rows are INSERTed with an
--     explicit column list (transform 5) naming only the columns they set; anything not named
--     lands as NULL on zero-fill rows only.
--
--     That is safe for most columns and NOT safe for any column a card uses as a pivot ROW
--     dimension — a NULL there puts the zero row on a different pivot row from the real rows it
--     is padding, so the denominator stays unfixed and a blank row appears beside it. The
--     GUIDANCE COLUMNS block covers the ones card 84279959 groups by. Their existence is certain
--     (they arrive at `Join Data 4`, upstream of the main path); only the exact names are
--     inherited from the card definitions, which read the view. If a name is wrong, transform 1
--     fails loudly with the offending column named — correct it there and in transform 5.
--
--     After the first run, V9 below detects any column that came out NULL on every zero-fill row.
--
-- (2) BULK AXIS. docs/fte_full_calendar_allocation.md §6.4 records an unresolved contradiction
--     over whether the bulk explosion lands on fiscal or Gregorian Mondays. Bulk is deliberately
--     INCLUDED here either way: this card reports Gregorian months, so densifying on the Gregorian
--     axis is self-consistent whichever axis bulk explodes onto. If bulk lands on fiscal Mondays,
--     a bulk profile straddles two Gregorian months and its per-month averages will drop — that is
--     the axis mismatch becoming visible, not this change causing it. Today those figures read at
--     full strength for a partial Gregorian month, which is wrong in the other direction.
--
--     Run diagnostic §7.4 anyway, to know whether to expect a visible drop in bulk numbers and to
--     schedule a fix for the underlying mismatch. It is not a gate on this change.
--
-- ============================================================================================
-- EDITOR NOTES
--   Written for MySQL: no CTEs, no window functions, backtick quoting. `rank` and `Day` are
--   reserved or awkward words, hence the quoting throughout.
--
--   Transforms 1-4 are given as CREATE TABLE … AS SELECT. If the transform editor supplies the
--   table name itself and expects a bare SELECT, drop the CREATE line and keep the SELECT.
--
--   INDEXES are declared per transform on the editor's INDEXING tab, not in SQL. Each transform
--   below lists what to add. Note the index TYPE: `month_greg` has many rows per value in both
--   `act` and `cal`, so it must be a plain (non-unique) index — a Unique index on it fails with a
--   duplicate-entry error. The places where Unique IS correct are called out, and there it doubles
--   as a free assertion that the grain is what the query claims.
--
--   Transform 5 is an INSERT and has no bare-SELECT form. If the editor will not accept it, fall
--   back to merging transforms 4 and 5 into one CREATE TABLE … AS SELECT … UNION ALL SELECT …,
--   with an explicit column list on BOTH sides in the same order. That reintroduces the risk the
--   SELECT * structure was chosen to remove — a column present in the schema but absent from the
--   list is dropped silently from every row — so if you take that path, run V9 against the real
--   rows too, not just the zero-fill ones.
-- ============================================================================================


-- --------------------------------------------------------------------------------------------
-- TRANSFORM 1 — act : active (person, cost centre, type, month) triples
-- --------------------------------------------------------------------------------------------
-- One row per triple by construction. Everything outside the GROUP BY key is MIN(), which is what
-- makes the grain true: a column that varied within a triple would otherwise split it into two
-- parallel dense series and render as a duplicated pivot row. Diagnostic §7.3 of the ETL doc
-- confirms whether anything meaningful varies.

CREATE TABLE act AS
SELECT
    `person_id`,
    `allocation_name`,
    TRIM(`cost_center_name`)        AS `cost_center_name`,
    `allocation_type`,
    `month_greg`,
    MIN(`cost_center_number`)       AS `cost_center_number`,
    MIN(`full_name`)                AS `full_name`,
    MIN(`person_email`)             AS `person_email`,
    MIN(`fte`)                      AS `fte`,
    MIN(`department`)               AS `department`,
    MIN(`manager`)                  AS `manager`,
    MIN(`manager_email`)            AS `manager_email`,
    MIN(`fte_country`)              AS `fte_country`,
    MIN(`missing_flag`)             AS `missing_flag`,
    MIN(`region`)                   AS `region`,
    MIN(`opco`)                     AS `opco`,
    MIN(`last_updated`)             AS `last_updated`,
    -- >>> GUIDANCE COLUMNS — verify these exist on the base dataset, not just the view
    MIN(`Account Region`)           AS `Account Region`,
    MIN(`P&L country`)              AS `P&L country`,
    MIN(`service type`)             AS `service type`,
    MIN(`Opco Tagetik`)             AS `Opco Tagetik`,
    MIN(`Invoiced entity`)          AS `Invoiced entity`
    -- <<<
FROM fte_full_calendar_allocation
WHERE `rank` = 1
  -- >>> BULK AXIS — see note (2) in the header before trusting 'bulk' here
  AND `allocation_type` IN ('bulk', 'weekly')
  -- <<<
  AND `person_id` IS NOT NULL
  AND TRIM(`person_id`) <> ''
  AND `cost_center_name` IS NOT NULL
  AND TRIM(`cost_center_name`) <> ''
  AND TRIM(`cost_center_name`) NOT IN ('Unassigned', 'UNALLOCATED')
GROUP BY
    `person_id`,
    `allocation_name`,
    TRIM(`cost_center_name`),
    `allocation_type`,
    `month_greg`;

-- INDEXING tab for transform 1:
--   Index   month_greg
--             Plain index, NOT Unique — there are many triples per month.
--   Unique  person_id, cost_center_name, allocation_type, month_greg   (optional)
--             Valid because this is exactly the GROUP BY key, so it is one row per value by
--             construction. Worth adding as a free assertion of the grain.


-- --------------------------------------------------------------------------------------------
-- TRANSFORM 2 — cal : every Monday of each Gregorian month
-- --------------------------------------------------------------------------------------------
-- Taken from the dataset itself rather than the master calendar. Safe because the Magic ETL
-- skeleton cross-joins every person to every in-window Monday (§2.5), so every Monday is
-- guaranteed present. This also means the month/week rule is inherited rather than restated —
-- no third copy of the INTERVAL 4 DAY offset to drift out of step. See §6.5 of the ETL doc.

CREATE TABLE cal AS
SELECT DISTINCT
    `Day`,
    `month_greg`,
    `week_end_greg`,
    `Reporting Week Date`,
    `Calendar Reporting Month`,
    `Calendar Reporting Year`,
    `Reporting Month Date`,
    `Calendar Reporting Month Date`
FROM fte_full_calendar_allocation;

-- INDEXING tab for transform 2:
--   Index   month_greg
--             Plain index, NOT Unique — a month has 4 or 5 Mondays. This is the important one:
--             it is the join key from `act` in transform 5.
--   Unique  Day   (optional)
--             Valid — every other column here is functionally dependent on Day, so the DISTINCT
--             yields one row per Monday.


-- --------------------------------------------------------------------------------------------
-- TRANSFORM 3 — existing_keys : existing rank-1 keys, for the anti-join probe
-- --------------------------------------------------------------------------------------------
-- The TRIM here must match transform 1 exactly, or the probe misses and a zero row lands beside
-- an identical real row.
--
-- Filtering rank = 1 is equivalent to probing all ranks, because `rank` is partitioned by
-- (allocation_date, allocation_name, cost_center_name, allocation_type) so rank 1 always exists
-- wherever any row does — but stating it makes the intent checkable.

CREATE TABLE existing_keys AS
SELECT DISTINCT
    `person_id`,
    TRIM(`cost_center_name`) AS `cost_center_name`,
    `allocation_type`,
    `Day`
FROM fte_full_calendar_allocation
WHERE `rank` = 1;

-- INDEXING tab for transform 3:
--   Unique  person_id, cost_center_name, allocation_type, Day
--             Unique is correct here — the SELECT DISTINCT is over exactly these four columns.
--             This is the probe index for the anti-join in transform 5 and matters most for
--             runtime; without it that LEFT JOIN degrades to a scan per row.


-- --------------------------------------------------------------------------------------------
-- TRANSFORM 4 — dense : every existing row, unchanged
-- --------------------------------------------------------------------------------------------
-- SELECT * on purpose. This is the whole of the output for real rows, so no column can be lost
-- to a stale hand-maintained list — including columns added upstream after this file was written.

CREATE TABLE dense AS
SELECT
    src.*,
    0 AS `zero_fill_flag`
FROM fte_full_calendar_allocation src;

-- INDEXING tab for transform 4: none. Nothing joins to `dense`; transform 5 only inserts into it,
-- and an index would just slow that insert down.


-- --------------------------------------------------------------------------------------------
-- TRANSFORM 5 — the manufactured zeros, INSERTed into dense
-- --------------------------------------------------------------------------------------------
-- Only the columns being set are named. Anything else in the schema lands as NULL on these rows
-- and only these rows. See header note (1) for which columns that is safe for, and V9 for the
-- check that catches an unsafe one.
--
-- Disjointness against transform 4 is structural: a row survives here only where the probe found
-- no existing row, so the two halves cannot overlap.

INSERT INTO dense (
    `Day`,
    `Reporting Week Date`,
    `Calendar Reporting Month`,
    `Calendar Reporting Year`,
    `Reporting Month Date`,
    `Calendar Reporting Month Date`,
    `week_end_greg`,
    `month_greg`,
    `allocation_date`,
    `allocation_name`,
    `allocation_amount`,
    `allocation_type`,
    `allocation_staus`,
    `cost_center_name`,
    `cost_center_number`,
    `full_name`,
    `person_id`,
    `person_email`,
    `fte`,
    `department`,
    `manager`,
    `manager_email`,
    `fte_country`,
    `missing_flag`,
    `region`,
    `opco`,
    `rank`,
    `last_updated`,
    -- >>> GUIDANCE COLUMNS — pivot ROW dimensions on card 84279959, so these must NOT be left NULL
    `Account Region`,
    `P&L country`,
    `service type`,
    `Opco Tagetik`,
    `Invoiced entity`,
    -- <<<
    `zero_fill_flag`
)
SELECT
    cal.`Day`,
    cal.`Reporting Week Date`,
    cal.`Calendar Reporting Month`,
    cal.`Calendar Reporting Year`,
    cal.`Reporting Month Date`,
    cal.`Calendar Reporting Month Date`,
    cal.`week_end_greg`,
    cal.`month_greg`,
    cal.`Day`,                                       -- allocation_date IS the Monday; see §1
    act.`allocation_name`,
    0.0,
    act.`allocation_type`,                           -- INHERITED, never 'placeholder' — note A
    CASE WHEN act.`fte` > 0 THEN 'No Logs Entered' ELSE 'On Target' END,
    act.`cost_center_name`,
    act.`cost_center_number`,
    act.`full_name`,
    act.`person_id`,
    act.`person_email`,
    act.`fte`,                                       -- KEEP POPULATED — note B
    act.`department`,                                -- from the allocation, not HR — note C
    act.`manager`,
    act.`manager_email`,
    act.`fte_country`,
    act.`missing_flag`,
    act.`region`,
    act.`opco`,
    1,                                               -- rank: twelve cards filter rank = 1
    act.`last_updated`,
    act.`Account Region`,
    act.`P&L country`,
    act.`service type`,
    act.`Opco Tagetik`,
    act.`Invoiced entity`,
    1                                                -- zero_fill_flag
FROM act
JOIN cal
  ON cal.`month_greg` = act.`month_greg`
LEFT JOIN existing_keys
  ON  existing_keys.`person_id`        = act.`person_id`
  AND existing_keys.`cost_center_name` = act.`cost_center_name`
  AND existing_keys.`allocation_type`  = act.`allocation_type`
  AND existing_keys.`Day`              = cal.`Day`
WHERE existing_keys.`person_id` IS NULL;

-- `previous_fte_value`, `__created__` and `__modified__` are deliberately absent from the column
-- list above, so they land as NULL. That is load-bearing, not an oversight — see note D.


-- ============================================================================================
-- NOTES — each of these is a decision that looks arbitrary and is not
-- ============================================================================================
--
-- A. allocation_type is INHERITED from the source triple, never set to 'placeholder' or to a new
--    value like 'zero_fill'.
--      - 'placeholder' is hidden by default: card 1659132694's allocation_type slicer preselects
--        it in a NOT_IN, so the fix would ship and appear to do nothing.
--      - A new value is excluded by that card's own IN ('bulk','placeholder','weekly') filter, and
--        it breaks pivot-row alignment for bulk, because the Beast Mode
--        `fte level cost center name` resolves to `department` when allocation_type = 'bulk' and to
--        `cost_center_name` otherwise. A mistagged zero row lands on a DIFFERENT pivot row from the
--        real rows it is meant to be padding — leaving the denominator unfixed and adding a
--        spurious empty row next to it.
--
-- B. `fte` stays POPULATED on zero-fill rows. Nulling it looks like a cheap way to protect the
--    grain-sensitive Beast Modes. It is strictly worse, three ways:
--      - allocation_staus: NULL > 0 is NULL, so every zero-fill row would fall through the CASE to
--        'On Target' — a silent, dataset-wide inversion on exactly the rows that mean "absent".
--      - fte2 (card 217188567): SUM(fte)/NULLIF(COUNT(DISTINCT cost_center_name),0) — the numerator
--        would count only real rows while the denominator counts all cost centres, halving the
--        result for a two-cost-centre person. Keeping fte populated is what makes fte2 correct.
--      - allocation_check (card 728770033): AVG(fte) over an all-zero-fill week would be NULL, so
--        allocation_check is NULL, and the card's `<> 0` filter drops NULL — the fully-absent weeks
--        the card exists to surface would silently vanish.
--
-- C. `department` comes from the allocation (the triple), NOT from the HR roster. On bulk rows the
--    ETL maps allocation_group -> department (§2.4), and `fte level cost center name` resolves to
--    `department` for bulk rows. Sourcing it from HR would put every bulk zero row on a different
--    pivot row from its real siblings — same failure as note A.
--
-- D. __created__ and __modified__ are explicitly NULL. This is what keeps the new rows invisible to
--    card 1392644214 (filter: days since last allocation NOT IN ('')) and card 843706280
--    (current_month_flag = LAST_DAY(__modified__) = LAST_DAY(CURRENT_DATE())). Populating them
--    "for completeness" would silently change both cards.
--
-- E. MIN() on `manager` and `department` picks arbitrarily if a person changed manager mid-month
--    (the history mechanism freezes these per person-week, so they CAN vary across the weeks of a
--    month). The zero-fill rows then carry one of the month's values on every week. Acceptable —
--    they carry no amount — but it is why diagnostic §7.3 is worth running.
--
-- F. Denominator = ALL weeks in the month, with no employment-date bound. This matches the bulk
--    branch's num_weeks and the app's getWeeksForMonth(). Accepted consequence: a mid-month
--    joiner's first month reads diluted. The dataset already treats joiners as employed for the
--    whole window, so this is not new — but it becomes more visible, because the zeros now land on
--    the person's real cost centre instead of on 'Unassigned'.


-- ============================================================================================
-- VERIFICATION — run against the scratch output before re-pointing anything
-- ============================================================================================
--
-- V1. No duplicates at the intended grain. Must return zero rows.
--       SELECT `person_id`, `cost_center_name`, `allocation_type`, `Day`, COUNT(*) n
--       FROM fte_full_calendar_allocation_dense WHERE `rank` = 1
--       GROUP BY 1,2,3,4 HAVING n > 1;
--
-- V2. Totals are invariant — zeros must not move any sum. Run first; it is the cheapest signal
--     that the anti-join is sound. If these differ, real rows are being duplicated.
--       SELECT SUM(`allocation_amount`) FROM fte_full_calendar_allocation;
--       SELECT SUM(`allocation_amount`) FROM fte_full_calendar_allocation_dense;
--
-- V3. Row-count delta matches the prediction from diagnostic §7.2 of the ETL doc.
--
-- V4. Every (person, cost centre, month) now spans the full set of that month's Mondays.
--     Must return zero rows.
--       SELECT d.`person_id`, d.`cost_center_name`, d.`month_greg`
--       FROM (SELECT `person_id`, `cost_center_name`, `month_greg`,
--                    COUNT(DISTINCT `Day`) AS weeks_present
--             FROM fte_full_calendar_allocation_dense
--             WHERE `rank` = 1 AND `allocation_type` IN ('bulk','weekly')
--               AND `cost_center_name` NOT IN ('Unassigned','UNALLOCATED')
--             GROUP BY 1,2,3) d
--       JOIN (SELECT `month_greg`, COUNT(DISTINCT `Day`) AS weeks_in_month
--             FROM fte_full_calendar_allocation_dense GROUP BY 1) m
--         ON m.`month_greg` = d.`month_greg`
--       WHERE d.weeks_present <> m.weeks_in_month;
--
-- V5. On a copy of card 1659132694 pointed at the scratch dataset, pick any person holding two
--     cost centres in one month with at least one gap week. Their month totals across cost centres
--     must now sum to that person's FTE. Before the change they sum to more. This is the strongest
--     single signal the fix is right.
--
-- V6. Weekly cells unchanged — any cell that already showed a value shows the same value.
--
-- V7. No growth in 'On Target'. The allocation_staus distribution should shift only by added
--     'No Logs Entered'. Growth in 'On Target' means `fte` is arriving NULL on zero-fill rows.
--       SELECT `allocation_staus`, COUNT(*) FROM fte_full_calendar_allocation_dense GROUP BY 1;
--
-- V8. Regression sweep against pre-change numbers on cards 217188567 (after adding
--     zero_fill_flag = 0), 728770033, 843706280, 1392644214, 909787458.
--
-- V9. Catches the one failure mode the SELECT * restructure does not design out: a column that
--     exists in the schema, was not named in transform 5, and matters. Inspect a sample of
--     zero-fill rows and look for NULLs that should not be there.
--
--       SELECT * FROM fte_full_calendar_allocation_dense WHERE `zero_fill_flag` = 1 LIMIT 20;
--
--     Only three columns should be NULL: previous_fte_value, __created__, __modified__. Anything
--     else NULL is a column missing from transform 5's list. It matters if a card uses it as a
--     pivot ROW dimension; it is harmless otherwise. Add it to the list and re-run.
