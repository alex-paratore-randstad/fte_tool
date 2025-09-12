
'use client';

import { PageHeader } from '@/components/page-header';
import { Users, Briefcase, AlertTriangle, UserMinus } from 'lucide-react';
import FteAllocationChart from '@/components/dashboard/fte-allocation-chart';
import SummaryCard from '@/components/dashboard/summary-card';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamMember, WeeklyAllocation } from '@/types';
import { useToast } from '@/hooks/use-toast';

type AggregatedAllocation = {
  name: string;
  [key: string]: number | string;
}

export default function DashboardPage() {
  const [totalFtes, setTotalFtes] = useState(0);
  const [allocatedFtes, setAllocatedFtes] = useState(0);
  const [unallocatedFtes, setUnallocatedFtes] = useState(0);
  const [missingAllocations, setMissingAllocations] = useState(0);
  const [allocationData, setAllocationData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [empResponse, allocResponse] = await Promise.all([
          fetch(`/data/v1/gbs_ind_hr_fte_report`),
          fetch(`/domo/datastores/v1/collections/weekly_allocation/documents/`),
        ]);

        if (!empResponse.ok || !allocResponse.ok) {
          throw new Error('Failed to fetch dashboard data.');
        }

        const employees: TeamMember[] = await empResponse.json();
        const allocations: WeeklyAllocation[] = await allocResponse.json();

        const totalEmployeeCount = new Set(employees.map(e => e.Person_Number)).size;
        setTotalFtes(totalEmployeeCount);

        const allocatedEmployeeNames = new Set(allocations.map(a => a.content.allocation_name));
        const allocatedEmployeeCount = allocatedEmployeeNames.size;
        setAllocatedFtes(allocatedEmployeeCount);

        const unallocatedCount = totalEmployeeCount - allocatedEmployeeCount;
        setUnallocatedFtes(unallocatedCount);
        
        const employeesInHrReport = new Set(employees.map(e => e.Full_Name));
        let missingCount = 0;
        employeesInHrReport.forEach(empName => {
            if(!allocatedEmployeeNames.has(empName)) {
                missingCount++;
            }
        });
        setMissingAllocations(missingCount);


        // Aggregate data for the chart
        const aggregated: Record<string, Record<string, number>> = {};
        const costCenterNames: Record<string, string> = {};

        allocations.forEach(alloc => {
          const { cost_center_name, allocation_date, allocation_amount } = alloc.content;
          const week = allocation_date;

          if (!aggregated[week]) {
            aggregated[week] = { name: week };
          }
          if (!aggregated[week][cost_center_name]) {
            aggregated[week][cost_center_name] = 0;
          }
          aggregated[week][cost_center_name] += Number(allocation_amount);
          costCenterNames[cost_center_name] = cost_center_name;
        });

        const chartData = Object.values(aggregated).map(weekData => {
            const transformedData: AggregatedAllocation = { name: weekData.name as string };
            Object.keys(costCenterNames).forEach(ccName => {
                transformedData[ccName] = (weekData[ccName] as number) || 0;
            });
            return transformedData;
        });

        setAllocationData(chartData);


      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        toast({
          variant: 'destructive',
          title: 'Failed to load dashboard',
          description: 'Could not fetch the necessary data.'
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Dashboard" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total FTEs</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="h-8 w-1/2 rounded-md bg-muted animate-pulse" /></CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Allocated FTEs</CardTitle>
                     <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="h-8 w-1/2 rounded-md bg-muted animate-pulse" /></CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unallocated FTEs</CardTitle>
                    <UserMinus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="h-8 w-1/2 rounded-md bg-muted animate-pulse" /></CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Missing Allocations</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="h-8 w-1/2 rounded-md bg-muted animate-pulse" /></CardContent>
            </Card>
        </div>
         <Card>
            <CardHeader>
                <CardTitle>FTE Allocation by Account</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full rounded-md bg-muted animate-pulse" />
            </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Dashboard" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total FTEs"
          value={totalFtes.toString()}
          icon={Users}
        />
        <SummaryCard
          title="Allocated FTEs"
          value={allocatedFtes.toString()}
          icon={Briefcase}
        />
        <SummaryCard
          title="Unallocated FTEs"
          value={unallocatedFtes.toString()}
          icon={UserMinus}
          variant={unallocatedFtes > 0 ? 'default' : 'default'}
        />
        <SummaryCard
          title="Missing Allocations"
          value={missingAllocations.toString()}
          icon={AlertTriangle}
          variant={missingAllocations > 0 ? 'destructive' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>FTE Allocation by Account</CardTitle>
          </CardHeader>
          <CardContent>
            <FteAllocationChart data={allocationData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
