
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { QuarterlyTargetGrid } from '@/components/targets/multi-week-target-grid';
import { QuarterlyTargetTable } from '@/components/targets/weekly-target-table';
import { writeLog } from '@/lib/logger';

export default function QuarterlyTargetPage() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    writeLog('QuarterlyTargetPage', 'info', 'Refreshing saved targets table', {});
    setRefreshKey(prevKey => prevKey + 1);
  };
  
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
      <QuarterlyTargetTable
        currentYear={currentYear}
        refreshKey={refreshKey}
      />
    </div>
  );
}
