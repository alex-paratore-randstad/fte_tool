
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { TicketAllocationGrid } from '@/components/ticket-allocation/ticket-allocation-grid';
import { MonthlyTicketSummaryTable } from '@/components/ticket-allocation/monthly-ticket-summary-table';

export default function TicketAllocationPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Ticket Allocation"
        description="Create an allocation profile and assign it to multiple agents at once."
      />
      <TicketAllocationGrid onSaveSuccess={handleRefresh} />
      <MonthlyTicketSummaryTable />
    </div>
  );
}
