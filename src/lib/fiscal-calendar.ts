
import { startOfWeek, addMonths, subMonths, parse, getYear, getMonth, addWeeks, endOfWeek, format } from 'date-fns';

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
    const entry = parsedCalendar.find(d => d.Date.startsWith(dateString));
    return entry ? { ...entry } : undefined;
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
    // Fallback to standard 4-week block if date is not in fiscal calendar
    const start = startOfWeek(date, { weekStartsOn: 1 });
    return Array.from({ length: 4 }, (_, i) => {
        const weekStart = addWeeks(start, i);
        return {
            startDate: weekStart,
            reportingWeekDate: format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'MMM d')
        }
    });
  }

  const { Reporting_Month, Reporting_Year } = currentFiscalData;

  const weeksInMonth = parsedCalendar.filter(
    d => d.Reporting_Month === Reporting_Month && d.Reporting_Year === Reporting_Year
  );

  const uniqueWeeks = [...new Map(weeksInMonth.map(item => [item['Week_Number'], item])).values()];
  
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

  const currentMonthIndex = parsedCalendar.findIndex(d => 
    d.Reporting_Month === currentFiscalData.Reporting_Month && d.Reporting_Year === currentFiscalData.Reporting_Year
  );

  if (currentMonthIndex > 0) {
      const prevMonthData = parsedCalendar[currentMonthIndex - 1]; // This is now a day in the previous month
      const firstDayOfPrevFiscalMonth = parsedCalendar.find(d => 
        d.Reporting_Month === prevMonthData.Reporting_Month && d.Reporting_Year === prevMonthData.Reporting_Year
      );
      if (firstDayOfPrevFiscalMonth) {
        return firstDayOfPrevFiscalMonth.parsedDate;
      }
  }
  
  return subMonths(currentDate, 1); // Fallback
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

    const currentMonthData = parsedCalendar.filter(d => 
        d.Reporting_Month === currentFiscalData.Reporting_Month && d.Reporting_Year === currentFiscalData.Reporting_Year
    );

    const lastDayOfCurrentMonth = currentMonthData[currentMonthData.length - 1];
    const lastDayIndex = parsedCalendar.findIndex(d => d.Date === lastDayOfCurrentMonth.Date);

    if (lastDayIndex < parsedCalendar.length - 1) {
        const firstDayOfNextMonth = parsedCalendar[lastDayIndex + 1];
        return firstDayOfNextMonth.parsedDate;
    }
    
    return addMonths(currentDate, 1); // Fallback
}
