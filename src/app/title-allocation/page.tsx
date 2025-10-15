
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { TitleAllocationGrid } from '@/components/title-allocation/title-allocation-grid';
import { SavedTitleAllocationsTable } from '@/components/title-allocation/saved-title-allocations-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function TitleAllocationPage() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Set the date only on the client side to avoid hydration errors
    setCurrentDate(new Date());
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };
  
  if (!currentDate) {
      return (
         <div className="flex flex-col gap-8">
           <PageHeader
            title="Weekly Title Allocation"
            description="Assign market-facing titles for each week."
          />
          <div className="space-y-4">
             <Skeleton className="h-48 w-full" />
             <Skeleton className="h-48 w-full" />
          </div>
        </div>
      )
  }

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Weekly Title Allocation"
        description="Assign market-facing titles for each week."
      />
      <TitleAllocationGrid currentDate={currentDate} setCurrentDate={setCurrentDate} onSaveSuccess={handleRefresh} />
      <SavedTitleAllocationsTable currentDate={currentDate} refreshKey={refreshKey} />
    </div>
  );
}

