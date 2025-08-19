
'use client';

import { PageHeader } from '@/components/page-header';
import { WeeklyAllocation } from '@/components/allocation/weekly-allocation';

export default function AllocationPage() {
  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Weekly Allocation"
        description="Allocate FTEs for the current week."
      />
      <WeeklyAllocation />
    </div>
  );
}
