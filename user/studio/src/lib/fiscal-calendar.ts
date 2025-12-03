
import { startOfWeek, addMonths, subMonths, parse, addDays, subDays, endOfWeek, format } from 'date-fns';

export type FiscalCalendarEntry = {
  Day: string;
  Date: string;
  Week_Number: string;
  Reporting_Week: string;
  Reporting_Month: string;
  '4-4-5_Month': string;
  Reporting_Quarter: string;
  Reporting_Year: string;
  '4-4-5_Year': string;
  Reporting_Week_Date: string;
  parsedDate: Date; // For internal use
};

export type FiscalWeek = {
    startDate: Date;
    reportingWeekDate: string;
};

// This data will be fetched from the 'global_445_calendar' dataset
let parsedCalendar: FiscalCalendarEntry[] = [];

/**
 * Initializes the fiscal calendar data. Should be called once on the client-side.
 * @param data The raw data from the 'global_445_calendar' dataset.
 */
export function initializeFiscalCalendar(data: Omit<FiscalCalendarEntry, 'parsedDate'>[]): void {
  if (parsedCalendar.length > 0) return; // Already initialized

  parsedCalendar = data.map(d => ({
      ...d,
      // The Date format from the dataset is 'YYYY-MM-DD HH:mm:ss'
      parsedDate: parse(d.Date, 'yyyy-MM-dd HH:mm:ss', new Date()),
    }))
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
}


/**
 * Finds the fiscal calendar information for a given date.
 * @param date The date to find fiscal information for.
 * @returns The fiscal calendar entry for the given date, or undefined if not found.
 */
export function getFiscalDataForDate(date: Date): Omit<FiscalCalendarEntry, 'parsedDate'> | undefined {
    const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    // Find the first entry that starts with the given date string.
    const entry = parsedCalendar.find(d => d.Date.startsWith(dateString));
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
  const currentFiscalData = getFiscalDataForDate(date);
  if (!currentFiscalData || parsedCalendar.length === 0) {
    // Return empty array if calendar is not initialized or date is not found.
    // The UI will show a loading state.
    return [];
  }

  const { Reporting_Month, Reporting_Year } = currentFiscalData;

  const weeksInMonth = parsedCalendar.filter(
    d => d.Reporting_Month === Reporting_Month && d.Reporting_Year === Reporting_Year
  );

  const uniqueWeeks = [...new Map(weeksInMonth.map(item => [item['Reporting_Week'], item])).values()];
  
  // Sort the weeks chronologically by their start date to ensure correct order
  uniqueWeeks.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  
  return uniqueWeeks.map(d => ({
      startDate: startOfWeek(d.parsedDate, { weekStartsOn: 1 }),
      reportingWeekDate: format(parse(d.Reporting_Week_Date, 'yyyy-MM-dd HH:mm:ss', new Date()), 'MMM d')
  }));
}


/**
 * Gets the start date of the previous fiscal month.
 * @param currentDate The current date.
 * @returns A Date object for the first day of the previous fiscal month.
 */
export function getPreviousFiscalMonth(currentDate: Date): Date {
  const currentFiscalData = getFiscalDataForDate(currentDate);
  if (!currentFiscalData || parsedCalendar.length === 0) {
    return subMonths(currentDate, 1);
  }

  // Find the first day of the current fiscal month
  const firstDayOfCurrentMonth = parsedCalendar.find(d => 
    d.Reporting_Month === currentFiscalData.Reporting_Month && d.Reporting_Year === currentFiscalData.Reporting_Year
  );
  
  if (!firstDayOfCurrentMonth) return subMonths(currentDate, 1); // Fallback

  // Get the date of the day before the first day of the current fiscal month
  const dayBefore = subDays(firstDayOfCurrentMonth.parsedDate, 1);

  // Get the fiscal data for that previous day
  const prevMonthFiscalData = getFiscalDataForDate(dayBefore);
  if (!prevMonthFiscalData) return subMonths(currentDate, 1); // Fallback

  // Find the first day of that previous fiscal month
  const firstDayOfPrevFiscalMonth = parsedCalendar.find(d => 
    d.Reporting_Month === prevMonthFiscalData.Reporting_Month && d.Reporting_Year === prevMonthFiscalData.Reporting_Year
  );

  return firstDayOfPrevFiscalMonth ? firstDayOfPrevFiscalMonth.parsedDate : subMonths(currentDate, 1);
}

/**
 * Gets the start date of the next fiscal month.
 * @param currentDate The current date.
 * @returns A Date object for the first day of the next fiscal month.
 */
export function getNextFiscalMonth(currentDate: Date): Date {
    const currentFiscalData = getFiscalDataForDate(currentDate);
    if (!currentFiscalData || parsedCalendar.length === 0) {
        return addMonths(currentDate, 1);
    }
    
    // Find all days in the current fiscal month
    const allDaysOfCurrentMonth = parsedCalendar.filter(d => 
        d.Reporting_Month === currentFiscalData.Reporting_Month && d.Reporting_Year === currentFiscalData.Reporting_Year
    );

    if (allDaysOfCurrentMonth.length === 0) return addMonths(currentDate, 1); // Fallback

    // Get the last day of the current fiscal month
    const lastDayOfCurrentMonth = allDaysOfCurrentMonth[allDaysOfCurrentMonth.length - 1];

    // Get the date of the day after
    const dayAfter = addDays(lastDayOfCurrentMonth.parsedDate, 1);

    // Get fiscal data for that next day
    const nextMonthFiscalData = getFiscalDataForDate(dayAfter);
    if (!nextMonthFiscalData) return addMonths(currentDate, 1); // Fallback
    
    // Find the first day of that next fiscal month
    const firstDayOfNextFiscalMonth = parsedCalendar.find(d =>
        d.Reporting_Month === nextMonthFiscalData.Reporting_Month && d.Reporting_Year === nextMonthFiscalData.Reporting_Year
    );
    
    return firstDayOfNextFiscalMonth ? firstDayOfNextFiscalMonth.parsedDate : addMonths(currentDate, 1);
}
