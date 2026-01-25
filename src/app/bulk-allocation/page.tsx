
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { BulkAllocationGrid } from '@/components/bulk-allocation/bulk-allocation-grid';
import { SavedBulkAllocationsTable } from '@/components/bulk-allocation/saved-bulk-allocations-table';
import type { SummaryEntry } from '@/components/bulk-allocation/saved-bulk-allocations-table';
import { writeLog } from '@/lib/logger';

export default function BulkAllocationPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [templateToCopy, setTemplateToCopy] = useState<SummaryEntry[] | null>(null);

  const handleRefresh = () => {
    writeLog('BulkAllocationPage', 'info', 'Refreshing saved bulk allocations table', {});
    setRefreshKey(prevKey => prevKey + 1);
  };
  
  const handleCopyTemplate = (summaries: SummaryEntry[]) => {
    setTemplateToCopy(summaries);
    writeLog('BulkAllocationPage', 'info', 'Copied allocation template to grid', { summaryCount: summaries.length });
    // Scroll to the top of the page to show the user the grid has been populated
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Bulk Monthly Allocation"
        description="Create an allocation profile and assign it to multiple employees at once."
      />
      <BulkAllocationGrid onSaveSuccess={handleRefresh} templateToCopy={templateToCopy} />
      <SavedBulkAllocationsTable refreshKey={refreshKey} onCopyTemplate={handleCopyTemplate} />
    </div>
  );
