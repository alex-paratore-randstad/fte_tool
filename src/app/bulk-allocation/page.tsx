
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { BulkAllocationGrid } from '@/components/bulk-allocation/bulk-allocation-grid';
import { SavedBulkAllocationsTable } from '@/components/bulk-allocation/saved-bulk-allocations-table';

export default function BulkAllocationPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Bulk Monthly Allocation"
        description="Create an allocation profile and assign it to multiple employees at once."
      />
      <BulkAllocationGrid onSaveSuccess={handleRefresh} />
      <SavedBulkAllocationsTable refreshKey={refreshKey} />
    </div>
  );
}
