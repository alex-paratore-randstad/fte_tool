
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { MonthlyRatioGrid } from '@/components/monthly-ratio-allocation/monthly-ratio-grid';
import { SavedTicketAllocationsTable } from '@/components/monthly-ratio-allocation/saved-ticket-allocations-table';

export default function MonthlyRatioAllocationPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Monthly Client Ratio Allocation"
        description="Review and adjust monthly FTE allocations based on pre-calculated ticket ratios."
      />
      <MonthlyRatioGrid onSaveSuccess={handleRefresh} />
      <SavedTicketAllocationsTable refreshKey={refreshKey} />
    </div>
  );
}
