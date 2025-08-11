
'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ReportingContent } from '@/components/reporting/reporting-content';

export default function ReportingPage() {
  return (
      <div className="flex flex-col gap-8">
        <PageHeader
          title="FTE Reports"
          description="Analyze FTE utilization across different dimensions."
          actions={
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export All
            </Button>
          }
        />
        <ReportingContent />
      </div>
  );
}
