
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { BulkForecastGrid } from '@/components/bulk-forecast/bulk-forecast-grid';
import { SavedBulkForecastsTable } from '@/components/bulk-forecast/saved-bulk-forecasts-table';

export default function BulkForecastPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title="Bulk Monthly Forecast"
        description="Create a forecast profile and assign it to multiple employees at once."
      />
      <BulkForecastGrid onSaveSuccess={handleRefresh} />
      <SavedBulkForecastsTable refreshKey={refreshKey} />
    </div>
  );
}
