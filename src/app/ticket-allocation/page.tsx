
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { TicketAllocationGrid } from '@/components/ticket-allocation/ticket-allocation-grid';
import { SavedTicketAllocationsTable } from '@/components/ticket-allocation/saved-ticket-allocations-table';
import { MonthlyTicketSummaryTable } from '@/components/ticket-allocation/monthly-ticket-summary-table';

export default function TicketAllocationPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Ticket Monthly Allocation"
        description="Create an allocation profile and assign it to multiple employees at once."
      />
      <TicketAllocationGrid onSaveSuccess={handleRefresh} />
      <SavedTicketAllocationsTable refreshKey={refreshKey} />
      <MonthlyTicketSummaryTable />
    </div>
  );
}
