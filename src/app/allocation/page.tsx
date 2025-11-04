
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { MultiWeekGrid } from '@/components/allocation/multi-week-grid';
import { WeeklyAllocationTable } from '@/components/allocation/weekly-allocation-table';

export default function AllocationPage() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Set the date only on the client side to avoid hydration errors
    setCurrentDate(new Date());
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Monthly Allocation"
        description="Allocate FTEs for the current month."
      />
      <MultiWeekGrid currentDate={currentDate} setCurrentDate={setCurrentDate} onSaveSuccess={handleRefresh} />
      <WeeklyAllocationTable currentDate={currentDate} refreshKey={refreshKey} />
    </div>
  );
}
