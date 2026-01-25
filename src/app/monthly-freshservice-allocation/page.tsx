
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { MonthlyFreshserviceGrid } from '@/components/monthly-freshservice-allocation/monthly-freshservice-grid';
import { SavedFreshserviceAllocationsTable } from '@/components/monthly-freshservice-allocation/saved-freshservice-allocations-table';
import { writeLog } from '@/lib/logger';

export default function MonthlyFreshserviceAllocationPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    writeLog('MonthlyFreshserviceAllocationPage', 'info', 'Refreshing saved allocations table', {});
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Monthly Freshservice Allocation"
        description="Review and adjust monthly FTE allocations based on pre-calculated ticket ratios."
      />
      <MonthlyFreshserviceGrid onSaveSuccess={handleRefresh} />
      <SavedFreshserviceAllocationsTable refreshKey={refreshKey} />
    </div>
  );
}
