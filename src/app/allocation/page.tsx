
'use client';

import { PageHeader } from '@/components/page-header';
import { MultiWeekGrid } from '@/components/allocation/multi-week-grid';

export default function AllocationPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Weekly Allocation"
        description="Enter FTE allocations for your team across multiple weeks."
      />
      <MultiWeekGrid />
    </div>
  );
}
