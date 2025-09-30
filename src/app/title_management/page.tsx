
'use client';

import { PageHeader } from '@/components/page-header';
import { TitleManagementContent } from '@/components/title_management/title-management-content';

export default function TitleManagementPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Title Management"
        description="Assign new market-facing titles to employees."
      />
      <TitleManagementContent />
    </div>
  );
}
