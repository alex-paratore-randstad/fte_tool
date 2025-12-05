
'use client';

import { PageHeader } from '@/components/page-header';
import { DashboardContent } from '@/components/dashboard/dashboard-content';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Dashboard" />
      <DashboardContent />
    </div>
  );
}
