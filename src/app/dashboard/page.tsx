
'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Briefcase, AlertTriangle } from 'lucide-react';
import FteAllocationChart from '@/components/dashboard/fte-allocation-chart';
import SummaryCard from '@/components/dashboard/summary-card';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Dashboard" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total FTEs"
          value="1,254"
          icon={Users}
          change="+2.5% this month"
        />
        <SummaryCard
          title="Allocated FTEs"
          value="1,120"
          icon={Briefcase}
          change="+3.1% this month"
        />
        <SummaryCard
          title="Unallocated FTEs"
          value="134"
          icon={Users}
          variant="destructive"
          change="-5.2% this month"
        />
        <SummaryCard
          title="Missing Allocations"
          value="12"
          icon={AlertTriangle}
          variant="destructive"
          change="Due this week"
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>FTE Allocation by Account</CardTitle>
          </CardHeader>
          <CardContent>
            <FteAllocationChart />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
