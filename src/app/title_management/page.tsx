
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { TitleManagementContent } from '@/components/title_management/title-management-content';
import { SavedTitleUpdatesTable } from '@/components/title_management/saved-title-updates-table';

export default function TitleManagementPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Title Management"
        description="Assign new market-facing titles to employees."
      />
      <TitleManagementContent onSaveSuccess={handleRefresh} />
      <SavedTitleUpdatesTable refreshKey={refreshKey} />
    </div>
  );
}
