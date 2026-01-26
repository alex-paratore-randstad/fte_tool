

'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { MultiWeekTargetGrid } from '@/components/targets/multi-week-target-grid';
import { WeeklyTargetTable } from '@/components/targets/weekly-target-table';
import { initializeFiscalCalendar, type FiscalCalendarEntry } from '@/lib/fiscal-calendar';
import { writeLog } from '@/lib/logger';
import { Skeleton } from '@/components/ui/skeleton';

export default function WeeklyForecastPage() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [calendarInitialized, setCalendarInitialized] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    
    async function initCalendar() {
      try {
        const response = await fetch('/data/v1/global_445_calendar');
        if (response.ok) {
          const calendarData: Omit<FiscalCalendarEntry, 'parsedDate'>[] = await response.json();
          initializeFiscalCalendar(calendarData);
          setCalendarInitialized(true);
          setCurrentDate(new Date());
        } else {
          const errorPayload = { status: response.status, statusText: response.statusText };
          writeLog('WeeklyForecastPage', 'warning', 'Failed to load 4-4-5 calendar data, using fallback.', errorPayload);
          console.error("Failed to load 4-4-5 calendar data, using fallback.");
          setCalendarInitialized(true);
          setCurrentDate(new Date());
        }
      } catch (error) {
        writeLog('WeeklyForecastPage', 'error', 'Error initializing fiscal calendar', error);
        console.error("Error initializing calendar:", error);
        setCalendarInitialized(true);
        setCurrentDate(new Date());
      }
    }
    initCalendar();
  }, [hasMounted]);

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };
  
  if (!hasMounted) {
    return (
       <div className="flex flex-col gap-8">
        <PageHeader
          title="Weekly Forecasts"
          description="Set weekly hiring forecasts for future fiscal periods."
        />
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  const isInitialLoading = !calendarInitialized || !currentDate;

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Weekly Forecasts"
        description="Set weekly hiring forecasts for future fiscal periods."
      />
      <MultiWeekTargetGrid
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        onSaveSuccess={handleRefresh}
        initialLoading={isInitialLoading}
      />
      <WeeklyTargetTable
        currentDate={currentDate}
        refreshKey={refreshKey}
        initialLoading={isInitialLoading}
      />
    </div>
  );
}

