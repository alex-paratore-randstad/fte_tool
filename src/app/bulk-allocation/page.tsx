
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { BulkAllocationGrid } from '@/components/bulk-allocation/bulk-allocation-grid';
import { SavedBulkAllocationsTable } from '@/components/bulk-allocation/saved-bulk-allocations-table';

export default function BulkAllocationPage() {
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
        title="Bulk Monthly Allocation"
        description="Allocate FTEs in bulk for the current month."
      />
      <BulkAllocationGrid currentDate={currentDate} setCurrentDate={setCurrentDate} onSaveSuccess={handleRefresh} />
      <SavedBulkAllocationsTable currentDate={currentDate} refreshKey={refreshKey} />
    </div>
  );
}
