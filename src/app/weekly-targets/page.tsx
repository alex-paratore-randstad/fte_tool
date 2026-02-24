'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { QuarterlyTargetGrid } from '@/components/targets/multi-week-target-grid';
import { writeLog } from '@/lib/logger';
import { Skeleton } from '@/components/ui/skeleton';

export default function QuarterlyTargetPage() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Set year only on the client to avoid hydration mismatch
    setCurrentYear(new Date().getFullYear());
  }, []);

  const handleRefresh = () => {
    writeLog('QuarterlyTargetPage', 'info', 'Refreshing saved targets', {});
    setRefreshKey(prevKey => prevKey + 1);
  };
  
  if (currentYear === null) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Quarterly Targets"
          description="Set quarterly hiring targets for future periods."
        />
        <div className="space-y-8">
            <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Quarterly Targets"
        description="Set quarterly hiring targets for future periods."
      />
      <QuarterlyTargetGrid
        currentYear={currentYear}
        setCurrentYear={setCurrentYear}
        onSaveSuccess={handleRefresh}
      />
    </div>
  );
}
