
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Users, Briefcase, AlertTriangle, UserMinus } from 'lucide-react';
import SummaryCard from '@/components/dashboard/summary-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TeamMember, WeeklyAllocation, WeeklyTarget, BulkFteDoc, BulkSummaryDoc } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import FteAllocationChart from '@/components/dashboard/fte-allocation-chart';
import { startOfWeek, subWeeks, format } from 'date-fns';
import { PageHeader } from '../page-header';
import { writeLog } from '@/lib/logger';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ActiveView = 'total' | 'allocated' | 'unallocated' | 'missing' | null;

type ChartData = {
  name: string; // Week start date, month, or quarter
  [key: string]: any; // Client allocations
};

export function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('total');
  
  const [totalFtes, setTotalFtes] = useState(0);
  const [allocatedFtes, setAllocatedFtes] = useState(0);
  const [unallocatedFtes, setUnallocatedFtes] = useState(0);
  const [missingAllocations, setMissingAllocations] = useState(0);

  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [allocatedEmployees, setAllocatedEmployees] = useState<TeamMember[]>([]);
  const [unallocatedEmployees, setUnallocatedEmployees] = useState<TeamMember[]>([]);
  
  // Chart states
  const [chartView, setChartView] = useState<'weekly' | 'bulk' | 'freshservice' | 'targets'>('weekly');
  const [weeklyChartData, setWeeklyChartData] = useState<ChartData[]>([]);
  const [bulkChartData, setBulkChartData] = useState<ChartData[]>([]);
  const [freshserviceChartData, setFreshserviceChartData] = useState<ChartData[]>([]);
  const [targetsChartData, setTargetsChartData] = useState<ChartData[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [
          empResponse,
          weeklyAllocResponse,
          bulkFteResponse,
          bulkSummaryResponse,
          targetsResponse,
        ] = await Promise.all([
          fetch(`/data/v1/consolidated_hr_fte_report_view`),
          fetch(`/domo/datastores/v1/collections/weekly_allocation/documents/`),
          fetch(`/domo/datastores/v1/collections/bulk_allocation_fte/documents/`),
          fetch(`/domo/datastores/v1/collections/bulk_allocation_summary/documents/`),
          fetch(`/domo/datastores/v1/collections/weekly_targets/documents/`),
        ]);

        const employees: TeamMember[] = empResponse.ok ? await empResponse.json() : [];
        const weeklyAllocations: WeeklyAllocation[] = weeklyAllocResponse.ok ? await weeklyAllocResponse.json() : [];
        
        // --- Process Summary Cards & Detail Table ---
        try {
            const safeEmployees = employees.filter(e => e && e.person_id && e.full_name);
            setAllEmployees(safeEmployees);
            setTotalFtes(new Set(safeEmployees.map(e => e.person_id)).size);

            const today = startOfWeek(new Date(), { weekStartsOn: 1 });
            const currentWeekAllocations = weeklyAllocations.filter(a => a.content.allocation_date === format(today, 'yyyy-MM-dd'));

            const allocatedEmployeeIds = new Set<string>();
            currentWeekAllocations
              .filter(a => a?.content && parseFloat(a.content.allocation_amount) > 0)
              .forEach(a => {
                if (a.content.employee_id) {
                  allocatedEmployeeIds.add(a.content.employee_id);
                } else if (a.content.allocation_name) {
                  const match = a.content.allocation_name.match(/\[(.*?)\]/);
                  if (match && match[1]) {
                    allocatedEmployeeIds.add(match[1]);
                  }
                }
              });

            const allocatedEmps = safeEmployees.filter(e => allocatedEmployeeIds.has(e.person_id));
            setAllocatedEmployees(allocatedEmps);
            setAllocatedFtes(allocatedEmps.length);

            const unallocatedEmps = safeEmployees.filter(e => !allocatedEmployeeIds.has(e.person_id));
            setUnallocatedEmployees(unallocatedEmps);
            setUnallocatedFtes(unallocatedEmps.length);
            setMissingAllocations(unallocatedEmps.length);
        } catch (processingError) {
             writeLog('DashboardContent', 'error', 'Failed to process summary card data', processingError);
             toast({ variant: 'destructive', title: 'Failed to process summary data'});
        }

        // --- Process Chart Data ---
        try {
          // 1. Weekly Allocation Chart
          const allWeeklyClients = Array.from(new Set(weeklyAllocations.map(a => a.content.cost_center_name)));
          const last6Weeks = Array.from({ length: 6 }, (_, i) => startOfWeek(subWeeks(new Date(), 5 - i), { weekStartsOn: 1 }));
          const weeklyData = last6Weeks.map(weekStart => {
            const weekStartDateString = format(weekStart, 'yyyy-MM-dd');
            const allocationsForWeek = weeklyAllocations.filter(a => a.content.allocation_date === weekStartDateString);
            const weeklyTotals = allocationsForWeek.reduce((acc, curr) => {
              acc[curr.content.cost_center_name] = (acc[curr.content.cost_center_name] || 0) + Number(curr.content.allocation_amount);
              return acc;
            }, {} as Record<string, number>);
            
            const completeWeeklyData: Record<string, any> = { name: weekStartDateString };
            allWeeklyClients.forEach(client => { completeWeeklyData[client] = weeklyTotals[client] || 0; });
            return completeWeeklyData;
          });
          setWeeklyChartData(weeklyData);

          // 2. Bulk Allocation Chart
          const bulkFtes: BulkFteDoc[] = bulkFteResponse.ok ? await bulkFteResponse.json() : [];
          const bulkSummaries: BulkSummaryDoc[] = bulkSummaryResponse.ok ? await bulkSummaryResponse.json() : [];
          const bulkSummariesByProfileId = bulkSummaries.reduce((acc, summary) => {
              if (!acc[summary.content.bulk_allocation_id]) acc[summary.content.bulk_allocation_id] = [];
              acc[summary.content.bulk_allocation_id].push(summary);
              return acc;
          }, {} as Record<string, BulkSummaryDoc[]>);

          const bulkDataByMonth = bulkFtes.reduce((acc, fte) => {
              const { allocation_monthyear, bulk_allocation_id } = fte.content;
              if (!allocation_monthyear) return acc;
              const summariesForFte = bulkSummariesByProfileId[bulk_allocation_id] || [];
              if (!acc[allocation_monthyear]) acc[allocation_monthyear] = {};
              summariesForFte.forEach(summary => {
                  const percentage = parseFloat(summary.content.allocation_percentage) || 0;
                  acc[allocation_monthyear][summary.content.cost_center_name] = (acc[allocation_monthyear][summary.content.cost_center_name] || 0) + percentage;
              });
              return acc;
          }, {} as Record<string, Record<string, number>>);
          setBulkChartData(Object.entries(bulkDataByMonth).map(([month, clientTotals]) => ({ name: month, ...clientTotals })));

          // 3. Freshservice Chart
          const freshserviceAllocations = weeklyAllocations.filter(a => a.content.cost_center_name === a.content.cost_center_number);
          const freshserviceDataByMonth = freshserviceAllocations.reduce((acc, alloc) => {
              const month = format(new Date(alloc.content.allocation_date), 'MMM yyyy');
              acc[month] = acc[month] || {};
              acc[month][alloc.content.cost_center_name] = (acc[month][alloc.content.cost_center_name] || 0) + parseFloat(alloc.content.allocation_amount);
              return acc;
          }, {} as Record<string, Record<string, number>>);
          setFreshserviceChartData(Object.entries(freshserviceDataByMonth).map(([month, totals]) => ({ name: month, ...totals })));

          // 4. Targets Chart
          const targets: WeeklyTarget[] = targetsResponse.ok ? await targetsResponse.json() : [];
          const targetsByQuarter = targets.reduce((acc, target) => {
              const date = new Date(target.content.targets_allocation_date);
              const quarter = `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
              acc[quarter] = acc[quarter] || {};
              acc[quarter][target.content.targets_cost_center_name] = (acc[quarter][target.content.targets_cost_center_name] || 0) + parseInt(target.content.targets_allocation_amount, 10);
              return acc;
          }, {} as Record<string, Record<string, number>>);
          setTargetsChartData(Object.entries(targetsByQuarter).map(([quarter, totals]) => ({ name: quarter, ...totals })));

        } catch (chartProcessingError) {
          writeLog('DashboardContent', 'error', 'Failed to process chart data', chartProcessingError);
          toast({ variant: 'destructive', title: 'Failed to process chart data' });
        }

      } catch (error) {
        writeLog('DashboardContent', 'error', 'Failed to load dashboard data', error);
        toast({ variant: 'destructive', title: 'Failed to load dashboard data'});
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  const handleCardClick = (view: ActiveView) => {
    setActiveView(current => (current === view ? null : view));
  };
  
  const { title: detailTitle, data: detailData, description: detailDescription } = useMemo(() => {
    switch (activeView) {
      case 'total':
        return { title: 'All FTEs', data: allEmployees, description: `Displaying ${allEmployees.length} employee(s).` };
      case 'allocated':
        return { title: 'Allocated FTEs (Current Week)', data: allocatedEmployees, description: `Displaying ${allocatedEmployees.length} employee(s).` };
      case 'unallocated':
        return { title: 'Unallocated FTEs (Current Week)', data: unallocatedEmployees, description: `Displaying ${unallocatedEmployees.length} employee(s).` };
      case 'missing':
        return { title: 'FTEs with Missing Allocations (Current Week)', data: unallocatedEmployees, description: `Displaying ${unallocatedEmployees.length} employee(s).` };
      default:
        return { title: 'All FTEs', data: allEmployees, description: `Displaying ${allEmployees.length} employee(s).` };
    }
  }, [activeView, allEmployees, allocatedEmployees, unallocatedEmployees]);

  const { chartData, chartTitle, chartDescription } = useMemo(() => {
    switch(chartView) {
        case 'bulk':
            return { 
                chartData: bulkChartData, 
                chartTitle: "Monthly Bulk Allocations", 
                chartDescription: "Total FTEs assigned per client via bulk allocation profiles."
            };
        case 'freshservice':
            return { 
                chartData: freshserviceChartData, 
                chartTitle: "Monthly Freshservice Allocations", 
                chartDescription: "Total FTEs assigned per client from Freshservice ticket ratios."
            };
        case 'targets':
             return { 
                chartData: targetsChartData, 
                chartTitle: "Quarterly Hiring Targets", 
                chartDescription: "Total hires targeted per client, grouped by quarter."
            };
        case 'weekly':
        default:
             return { 
                chartData: weeklyChartData, 
                chartTitle: "Weekly Client Allocation", 
                chartDescription: "Total FTEs allocated per client over the last 6 weeks."
            };
    }
}, [chartView, weeklyChartData, bulkChartData, freshserviceChartData, targetsChartData]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Dashboard" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total FTEs"
          value={loading ? <Skeleton className="h-8 w-1/2" /> : totalFtes.toString()}
          icon={Users}
          onClick={() => handleCardClick('total')}
          isActive={activeView === 'total'}
        />
        <SummaryCard
          title="Allocated FTEs"
          value={loading ? <Skeleton className="h-8 w-1/2" /> : allocatedFtes.toString()}
          icon={Briefcase}
          onClick={() => handleCardClick('allocated')}
          isActive={activeView === 'allocated'}
        />
        <SummaryCard
          title="Unallocated FTEs"
          value={loading ? <Skeleton className="h-8 w-1/2" /> : unallocatedFtes.toString()}
          icon={UserMinus}
          variant={unallocatedFtes > 0 ? 'default' : 'default'}
          onClick={() => handleCardClick('unallocated')}
          isActive={activeView === 'unallocated'}
        />
        <SummaryCard
          title="Missing Allocations"
          value={loading ? <Skeleton className="h-8 w-1/2" /> : missingAllocations.toString()}
          icon={AlertTriangle}
          variant={missingAllocations > 0 ? 'destructive' : 'default'}
          onClick={() => handleCardClick('missing')}
          isActive={activeView === 'missing'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="flex-1">
                  <CardTitle>{loading ? <Skeleton className="h-6 w-2/3" /> : chartTitle}</CardTitle>
                  <CardDescription>{loading ? <Skeleton className="h-4 w-full" /> : chartDescription}</CardDescription>
                </div>
                <Tabs value={chartView} onValueChange={(v) => setChartView(v as any)} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-10">
                        <TabsTrigger value="weekly">Weekly</TabsTrigger>
                        <TabsTrigger value="bulk">Bulk</TabsTrigger>
                        <TabsTrigger value="freshservice">Freshservice</TabsTrigger>
                        <TabsTrigger value="targets">Targets</TabsTrigger>
                    </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <FteAllocationChart data={chartData} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{loading ? <Skeleton className="h-6 w-1/3" /> : detailTitle}</CardTitle>
              <CardDescription>{loading ? <Skeleton className="h-4 w-2/3" /> : detailDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Manager</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                       Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : detailData.length > 0 ? detailData.map(employee => (
                      <TableRow key={employee.person_id}>
                        <TableCell>{employee.full_name}</TableCell>
                        <TableCell>{employee.title}</TableCell>
                        <TableCell>{employee.manager}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                          No data to display.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
