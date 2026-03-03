
import { startOfWeek, addMonths, subMonths, parse, addDays, subDays, endOfWeek, format, isWithinInterval, isValid } from 'date-fns';

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

export type FiscalWeek = {
    startDate: Date; // The Monday of that week
    reportingWeekDate: string; // The formatted Sunday date
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
 * Returns an array of objects representing the start of each week
 * and the reporting week end date in the fiscal month that the given date belongs to.
 * @param date The date to find the fiscal month for.
 * @returns An array of week-starting dates.
 */
export function getWeeksForFiscalMonth(date: Date): FiscalWeek[] {
  if (!date || !isValid(date)) return [];
  
  const currentFiscalData = getFiscalDataForDate(date);
  if (!currentFiscalData || parsedCalendar.length === 0) {
    // Return empty array if calendar is not initialized or date is not found.
    return [];
  }

  const { Reporting_Month, Reporting_Year } = currentFiscalData;

  const weeksInMonth = parsedCalendar.filter(
    d => d && d.Reporting_Month === Reporting_Month && d.Reporting_Year === Reporting_Year
  );
  
  // The data is already unique per week, so we just need to sort and map it.
  return weeksInMonth
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
    .map(d => ({
        // The start of the week is Monday. parsedDate is the Sunday week-ending date.
        startDate: startOfWeek(d.parsedDate, { weekStartsOn: 1 }), 
        reportingWeekDate: format(d.parsedDate, 'MMM d')
    }));
}


/**
 * Gets the start date of the previous fiscal month.
 * @param currentDate The current date.
 * @returns A Date object for the first day of the previous fiscal month.
 */
export function getPreviousFiscalMonth(currentDate: Date): Date {
  if (!currentDate || !isValid(currentDate)) return new Date();
  
  const currentFiscalData = getFiscalDataForDate(currentDate);
  if (!currentFiscalData || parsedCalendar.length === 0) {
    return subMonths(currentDate, 1);
  }

  // Find the first week of the current fiscal month
  const firstWeekOfCurrentMonth = parsedCalendar.find(d => 
    d && d.Reporting_Month === currentFiscalData.Reporting_Month && d.Reporting_Year === currentFiscalData.Reporting_Year
  );
  
  if (!firstWeekOfCurrentMonth) return subMonths(currentDate, 1); // Fallback

  // Get the date of the day before the start of that first week
  const dayBefore = subDays(firstWeekOfCurrentMonth.parsedDate, 7);

  // Get the fiscal data for that previous day
  const prevMonthFiscalData = getFiscalDataForDate(dayBefore);
  if (!prevMonthFiscalData) return subMonths(currentDate, 1); // Fallback

  // Find the first week of that previous fiscal month
  const firstWeekOfPrevFiscalMonth = parsedCalendar.find(d => 
    d && d.Reporting_Month === prevMonthFiscalData.Reporting_Month && d.Reporting_Year === prevMonthFiscalData.Reporting_Year
  );

  return firstWeekOfPrevFiscalMonth ? startOfWeek(firstWeekOfPrevFiscalMonth.parsedDate, { weekStartsOn: 1}) : subMonths(currentDate, 1);
}

/**
 * Gets the start date of the next fiscal month.
 * @param currentDate The current date.
 * @returns A Date object for the first day of the next fiscal month.
 */
export function getNextFiscalMonth(currentDate: Date): Date {
    if (!currentDate || !isValid(currentDate)) return new Date();
    
    const currentFiscalData = getFiscalDataForDate(currentDate);
    if (!currentFiscalData || parsedCalendar.length === 0) {
        return addMonths(currentDate, 1);
    }
    
    // Find all weeks in the current fiscal month
    const allWeeksOfCurrentMonth = parsedCalendar.filter(d => 
        d && d.Reporting_Month === currentFiscalData.Reporting_Month && d.Reporting_Year === currentFiscalData.Reporting_Year
    );

    if (allWeeksOfCurrentMonth.length === 0) return addMonths(currentDate, 1); // Fallback

    // Get the last week of the current fiscal month
    const lastWeekOfCurrentMonth = allWeeksOfCurrentMonth[allWeeksOfCurrentMonth.length - 1];

    // Get the date of the day after the end of that week
    const dayAfter = addDays(lastWeekOfCurrentMonth.parsedDate, 1);

    // Get fiscal data for that next day
    const nextMonthFiscalData = getFiscalDataForDate(dayAfter);
    if (!nextMonthFiscalData) return addMonths(currentDate, 1); // Fallback
    
    // Find the first week of that next fiscal month
    const firstWeekOfNextFiscalMonth = parsedCalendar.find(d =>
        d && d.Reporting_Month === nextMonthFiscalData.Reporting_Month && d.Reporting_Year === nextMonthFiscalData.Reporting_Year
    );
    
    return firstWeekOfNextFiscalMonth ? startOfWeek(firstWeekOfNextFiscalMonth.parsedDate, { weekStartsOn: 1 }) : addMonths(currentDate, 1);
}
