
import { startOfWeek, parse, addDays, subDays, startOfMonth, isSameMonth, format, isWithinInterval, isValid } from 'date-fns';

/**
 * A week belongs to the calendar month that contains its Friday (Monday + 4 days).
 *
 * This MUST stay in step with `month_greg` in the Domo dataflow that publishes
 * `fte_full_calendar_allocation`, which computes
 *   DATE_TRUNC('month', DATE_ADD(day, INTERVAL 4 DAY))
 * Keeping both on the same rule is what guarantees that a month entered in this
 * tool is the same month reported on downstream.
 */
const OWNING_MONTH_OFFSET_DAYS = 4;

export type FiscalCalendarEntry = {
  Week_Number: string;
  Reporting_Week: string;
  Reporting_Month: string;
  '4-4-5_Month': string;
  Reporting_Quarter: string;
  Reporting_Year: string;
  '4-4-5_Year': string;
  Reporting_Week_Date: string;
  parsedDate: Date; // For internal use - represents the Sunday week-ending date
};

export type AllocationWeek = {
    startDate: Date; // The Monday of that week - this is the key written to allocation_date
    endDate: Date;   // The Friday of that week
    label: string;   // e.g. "Aug 24 - 28", or "Aug 31 - Sep 4" across a month boundary
};

// This data will be fetched from the 'global_445_calendar' dataset
let parsedCalendar: FiscalCalendarEntry[] = [];

/**
 * Initializes the fiscal calendar data. Should be called once on the client-side.
 * @param data The raw data from the 'global_445_calendar' dataset.
 */
export function initializeFiscalCalendar(data: Omit<FiscalCalendarEntry, 'parsedDate' | 'Date' | 'Day'>[]): void {
  if (parsedCalendar.length > 0) return; // Already initialized
  if (!Array.isArray(data)) return;

  parsedCalendar = data
    .map(d => {
      // Validate the date before parsing to prevent crashes
      if (!d || !d.Reporting_Week_Date) {
        return null;
      }
      const parsed = parse(d.Reporting_Week_Date, 'yyyy-MM-dd', new Date());
      if (!isValid(parsed)) {
        return null;
      }
      return {
        ...d,
        parsedDate: parsed,
      };
    })
    .filter((d): d is FiscalCalendarEntry => d !== null) // Filter out any null (invalid) entries
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
}


/**
 * Finds the fiscal calendar information for a given date.
 * @param date The date to find fiscal information for.
 * @returns The fiscal calendar entry for the given date, or undefined if not found.
 */
export function getFiscalDataForDate(date: Date): Omit<FiscalCalendarEntry, 'parsedDate'> | undefined {
    // Add a guard to prevent operations on an invalid date
    if (!date || !isValid(date)) {
        return undefined;
    }
    // Find the week where the given date falls between its start (Monday) and end (Sunday)
    const entry = parsedCalendar.find(d => {
        const weekEnd = d.parsedDate;
        const weekStart = subDays(weekEnd, 6);
        return isWithinInterval(date, { start: weekStart, end: weekEnd });
    });
    
    if (!entry) return undefined;
    
    // Omit parsedDate before returning
    const { parsedDate, ...rest } = entry;
    return rest;
}


/**
 * Returns every week that belongs to the calendar month of the given date.
 *
 * Week membership follows OWNING_MONTH_OFFSET_DAYS: a week belongs to the month
 * containing its Friday. The Mondays themselves come from the 4-4-5 calendar
 * dataset rather than being generated, so this can never offer a week that the
 * reporting dataflow's calendar spine does not contain.
 *
 * @param date Any date within the target calendar month.
 * @returns The weeks of that month, ascending by start date.
 */
export function getWeeksForMonth(date: Date): AllocationWeek[] {
  if (!date || !isValid(date)) return [];

  const seenMondays = new Set<string>();
  const weeks: AllocationWeek[] = [];

  for (const entry of parsedCalendar) {
    if (!entry) continue;

    // parsedDate is the Sunday week-ending date; the week starts on the Monday before it.
    const startDate = startOfWeek(entry.parsedDate, { weekStartsOn: 1 });
    const mondayKey = format(startDate, 'yyyy-MM-dd');

    // Guard against a daily-grain calendar producing one entry per day of the week.
    if (seenMondays.has(mondayKey)) continue;
    seenMondays.add(mondayKey);

    const endDate = addDays(startDate, OWNING_MONTH_OFFSET_DAYS);
    if (!isSameMonth(endDate, date)) continue;

    weeks.push({ startDate, endDate, label: formatWeekLabel(startDate, endDate) });
  }

  return weeks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * The first day of the calendar month a week is reported under.
 * @param weekStartMonday The Monday that starts the week.
 */
export function getOwningMonth(weekStartMonday: Date): Date {
  return startOfMonth(addDays(weekStartMonday, OWNING_MONTH_OFFSET_DAYS));
}

function formatWeekLabel(startDate: Date, endDate: Date): string {
  return isSameMonth(startDate, endDate)
    ? `${format(startDate, 'MMM d')} - ${format(endDate, 'd')}`
    : `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
}
