
'use client';

import { PageHeader } from '@/components/page-header';
import { CostCenterContent } from '@/components/cost-centers/cost-center-content';

export default function CostCenterPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Client Management"
      />
      <CostCenterContent />
    </div>
  );
}
