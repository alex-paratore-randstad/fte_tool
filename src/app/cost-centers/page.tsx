
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useState } from 'react';
import { CostCenterContent } from '@/components/cost-centers/cost-center-content';
import { BulkCostCenterUploadDialog } from '@/components/cost-centers/bulk-cost-center-upload-dialog';

export default function CostCenterPage() {
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Cost Center Management"
          description="View and manage all cost centers."
          actions={
            <Button onClick={() => setIsBulkUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV
            </Button>
          }
        />
        <CostCenterContent />
      </div>
      <BulkCostCenterUploadDialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen} />
    </>
  );
}
