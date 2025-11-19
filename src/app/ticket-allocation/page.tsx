
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { TicketAllocationGrid } from '@/components/ticket-allocation/ticket-allocation-grid';

export default function TicketAllocationPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Monthly Ticket Ratio Allocation"
        description="Review and adjust monthly FTE allocations based on pre-calculated ticket ratios."
      />
      <TicketAllocationGrid onSaveSuccess={handleRefresh} />
    </div>
  );
}
