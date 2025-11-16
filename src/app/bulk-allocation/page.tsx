
'use client';

import { PageHeader } from '@/components/page-header';
import { BulkAllocationGrid } from '@/components/bulk-allocation/bulk-allocation-grid';

export default function BulkAllocationPage() {

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Bulk Monthly Allocation"
        description="Create an allocation profile and assign it to multiple employees at once."
      />
      <BulkAllocationGrid />
    </div>
  );
}
