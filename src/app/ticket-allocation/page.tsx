
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { TicketAllocationGrid } from '@/components/ticket-allocation/ticket-allocation-grid';

export default function TicketAllocationPage() {
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
        title="Ticket-Based Allocation"
        description="Automatically calculates FTE allocation based on ticket volume per agent group. Review and adjust as needed."
      />
      <TicketAllocationGrid currentDate={currentDate} setCurrentDate={setCurrentDate} onSaveSuccess={handleRefresh} />
    </div>
  );
}
