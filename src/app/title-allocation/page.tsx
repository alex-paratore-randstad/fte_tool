
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { TitleAllocationGrid } from '@/components/title-allocation/title-allocation-grid';
import { SavedTicketAllocationsTable } from '@/components/ticket-allocation/saved-ticket-allocations-table';

export default function TitleAllocationPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Monthly Ticket Ratio Allocation"
        description="Review and adjust monthly FTE allocations based on ticket ratios."
      />
      <TitleAllocationGrid onSaveSuccess={handleRefresh} />
      <SavedTicketAllocationsTable refreshKey={refreshKey} />
    </div>
  );
}
