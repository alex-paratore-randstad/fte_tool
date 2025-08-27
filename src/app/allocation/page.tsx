
'use client';

import { PageHeader } from '@/components/page-header';
import { MultiWeekGrid } from '@/components/allocation/multi-week-grid';
import { WeeklyAllocationTable } from '@/components/allocation/weekly-allocation-table';

export default function AllocationPage() {
  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Monthly Allocation"
        description="Allocate FTEs for the current month."
      />
      <MultiWeekGrid />
      <WeeklyAllocationTable />
    </div>
  );
}
