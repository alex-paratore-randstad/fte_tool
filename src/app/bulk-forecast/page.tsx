

'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { BulkTargetGrid } from '@/components/targets/bulk-target-grid';
import { SavedBulkTargetsTable } from '@/components/targets/saved-bulk-targets-table';
import { writeLog } from '@/lib/logger';

export default function BulkTargetPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    writeLog('BulkForecastPage', 'info', 'Refreshing saved bulk targets table', {});
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Bulk Monthly Targets"
        description="Create a hiring target profile and assign it to multiple employees at once."
      />
      <BulkTargetGrid onSaveSuccess={handleRefresh} />
      <SavedBulkTargetsTable refreshKey={refreshKey} />
    </div>
  );
}
