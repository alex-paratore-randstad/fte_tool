import type { TeamMember } from '@/types';

/**
 * `consolidated_hr_fte_report_view` returns one row per historical HR record, and the
 * column casing varies by view revision. Every consumer needs the same collapse the Domo
 * dataflow applies: RANK() over person_id ORDER BY start_date DESC, keep row_rank = 1.
 */
export type HrRosterRow = TeamMember & Partial<{
  Full_Name: string;
  Person_Number: string;
  Start_Date: string;
}>;

export function getPersonId(e: HrRosterRow | null | undefined): string {
  return e?.person_id || e?.Person_Number || '';
}

export function getFullName(e: HrRosterRow | null | undefined): string {
  return e?.full_name || e?.Full_Name || '';
}

function getStartTime(e: HrRosterRow): number {
  const text = String(e?.start_date || e?.Start_Date || '').trim();
  if (!text) return -Infinity;
  if (/^\d+$/.test(text)) {
    const epoch = Number(text);
    return text.length <= 10 ? epoch * 1000 : epoch;
  }
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? -Infinity : parsed;
}

/**
 * Collapses the roster to one row per person, keeping the record with the latest
 * start_date. Rows with no person_id can't be ranked, so they pass through untouched
 * rather than disappearing.
 */
export function dedupeEmployeesByPersonId(rows: HrRosterRow[]): HrRosterRow[] {
  const latestByPerson = new Map<string, HrRosterRow>();
  const unidentified: HrRosterRow[] = [];

  for (const row of rows) {
    const personId = getPersonId(row);
    if (!personId) {
      unidentified.push(row);
      continue;
    }
    const incumbent = latestByPerson.get(personId);
    // Strict > so ties and undated groups keep the first row seen.
    if (!incumbent || getStartTime(row) > getStartTime(incumbent)) {
      latestByPerson.set(personId, row);
    }
  }

  return [...latestByPerson.values(), ...unidentified];
}

/** Guards, dedupes and sorts a raw HR view response. Fetching and error handling stay with the caller. */
export function normalizeHrRoster(raw: unknown): HrRosterRow[] {
  const named = (Array.isArray(raw) ? raw : []).filter((e: HrRosterRow) => e && getFullName(e));
  return dedupeEmployeesByPersonId(named).sort((a, b) => getFullName(a).localeCompare(getFullName(b)));
}
