
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { MultiWeekGrid } from '@/components/allocation/multi-week-grid';
import { WeeklyAllocationTable } from '@/components/allocation/weekly-allocation-table';
import { initializeFiscalCalendar, type FiscalCalendarEntry } from '@/lib/fiscal-calendar';
import { writeLog } from '@/lib/logger';

export default function AllocationPage() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [calendarInitialized, setCalendarInitialized] = useState(false);

  useEffect(() => {
    async function initCalendar() {
      try {
        const response = await fetch('/data/v1/global_445_calendar');
        if (response.ok) {
          const calendarData: Omit<FiscalCalendarEntry, 'parsedDate'>[] = await response.json();
          initializeFiscalCalendar(calendarData);
          // Set state only after calendar is successfully initialized
          setCalendarInitialized(true);
          setCurrentDate(new Date());
        } else {
          const errorPayload = { status: response.status, statusText: response.statusText };
          writeLog('AllocationPage', 'warning', 'Failed to load 4-4-5 calendar data, using fallback.', errorPayload);
          console.error("Failed to load 4-4-5 calendar data, using fallback.");
          // Still need to set state in failure case to unblock UI
          setCalendarInitialized(true);
          setCurrentDate(new Date());
        }
      } catch (error) {
        writeLog('AllocationPage', 'error', 'Error initializing fiscal calendar', error);
        console.error("Error initializing calendar:", error);
        // Still need to set state in failure case to unblock UI
        setCalendarInitialized(true);
        setCurrentDate(new Date());
      }
    }
    initCalendar();
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  const isInitialLoading = !calendarInitialized || !currentDate;

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Weekly Allocation"
        description="Allocate FTEs for the current fiscal period."
      />
      <MultiWeekGrid 
        currentDate={currentDate} 
        setCurrentDate={setCurrentDate} 
        onSaveSuccess={handleRefresh}
        initialLoading={isInitialLoading}
      />
      <WeeklyAllocationTable 
        currentDate={currentDate} 
        refreshKey={refreshKey}
        initialLoading={isInitialLoading}
      />
    </div>
  );
}
