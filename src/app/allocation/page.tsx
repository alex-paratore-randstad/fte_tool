
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { MultiWeekGrid } from '@/components/allocation/multi-week-grid';
import { WeeklyAllocationTable } from '@/components/allocation/weekly-allocation-table';
import { initializeFiscalCalendar, type FiscalCalendarEntry } from '@/lib/fiscal-calendar';
import { Skeleton } from '@/components/ui/skeleton';

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
          setCurrentDate(new Date());
          setCalendarInitialized(true);
        } else {
          console.error("Failed to load 4-4-5 calendar data, using fallback.");
          setCurrentDate(new Date());
          setCalendarInitialized(true);
        }
      } catch (error) {
        console.error("Error initializing calendar:", error);
        setCurrentDate(new Date()); // Ensure date is set even on error
        setCalendarInitialized(true);
      }
    }
    initCalendar();
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  if (!calendarInitialized) {
      return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Weekly Allocation"
                description="Allocate FTEs for the current fiscal period."
            />
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[300px] w-full" />
        </div>
      )
  }

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Weekly Allocation"
        description="Allocate FTEs for the current fiscal period."
      />
      <MultiWeekGrid currentDate={currentDate} setCurrentDate={setCurrentDate} onSaveSuccess={handleRefresh} />
      <WeeklyAllocationTable currentDate={currentDate} refreshKey={refreshKey} />
    </div>
  );
}
