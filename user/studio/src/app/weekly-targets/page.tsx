
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { MultiWeekTargetGrid } from '@/components/targets/multi-week-target-grid';
import { WeeklyTargetTable } from '@/components/targets/weekly-target-table';
import { initializeFiscalCalendar, type FiscalCalendarEntry } from '@/lib/fiscal-calendar';

export default function WeeklyTargetPage() {
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
        } else {
          console.error("Failed to load 4-4-5 calendar data, using fallback.");
        }
      } catch (error) {
        console.error("Error initializing calendar:", error);
      } finally {
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
        title="Weekly Targets"
        description="Set weekly hiring targets for future fiscal periods."
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
