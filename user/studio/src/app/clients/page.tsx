
'use client';

import { PageHeader } from '@/components/page-header';
import { ClientContent } from '@/components/clients/client-content';

export default function ClientPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Client Management"
        description="View all clients."
      />
      <ClientContent />
    </div>
  );
}
