
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Users, Briefcase, AlertTriangle, UserMinus } from 'lucide-react';
import SummaryCard from '@/components/dashboard/summary-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TeamMember, WeeklyAllocation } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import FteAllocationChart from '@/components/dashboard/fte-allocation-chart';
import { startOfWeek, subWeeks, format } from 'date-fns';
import { PageHeader } from '../page-header';
import { writeLog } from '@/lib/logger';

type ActiveView = 'total' | 'allocated' | 'unallocated' | 'missing' | null;

type ChartData = {
  name: string; // Week start date
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
  
  const [allocationChartData, setAllocationChartData] = useState<ChartData[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [empResponse, allocResponse] = await Promise.all([
          fetch(`/data/v1/consolidated_hr_fte_report_view`),
          fetch(`/domo/datastores/v1/collections/weekly_allocation/documents/`),
        ]);

        if (!empResponse.ok) {
          writeLog('DashboardContent', 'warning', 'Could not fetch employee data', { status: empResponse.status });
        }
         if (!allocResponse.ok) {
          writeLog('DashboardContent', 'warning', 'Could not fetch allocation data', { status: allocResponse.status });
        }

        const employees: TeamMember[] = empResponse.ok ? await empResponse.json() : [];
        const rawAllocations: WeeklyAllocation[] = allocResponse.ok ? await allocResponse.json() : [];
        const allocations = (Array.isArray(rawAllocations) ? rawAllocations : []).filter(a => a?.content);

        try {
            const safeEmployees = (Array.isArray(employees) ? employees : []).filter(e => e && (e.person_id || e.Person_Number) && (e.full_name || e.Full_Name));
            setAllEmployees(safeEmployees);
            const totalEmployeeCount = new Set(safeEmployees.map(e => e.person_id || e.Person_Number)).size;
            setTotalFtes(totalEmployeeCount);

            const todayStart = startOfWeek(new Date(), { weekStartsOn: 1 });
            const currentWeekKey = format(todayStart, 'yyyy-MM-dd');
            const currentWeekAllocations = allocations.filter(a => a?.content && a.content.allocation_date === currentWeekKey);

            const allocatedEmployeeIds = new Set<string>();

            currentWeekAllocations
              .filter(a => a?.content && parseFloat(a.content.allocation_amount || '0') > 0)
              .forEach(a => {
                if (a?.content?.employee_id) {
                  allocatedEmployeeIds.add(a.content.employee_id);
                } else if (a?.content?.allocation_name) {
                  const match = String(a.content.allocation_name).match(/\[(.*?)\]/);
                  if (match && match[1]) {
                    allocatedEmployeeIds.add(match[1]);
                  }
                }
              });


            const allocatedEmps = safeEmployees.filter(e => e && allocatedEmployeeIds.has(e.person_id || e.Person_Number));
            setAllocatedEmployees(allocatedEmps);
            setAllocatedFtes(allocatedEmps.length);

            const unallocatedEmps = safeEmployees.filter(e => e && !allocatedEmployeeIds.has(e.person_id || e.Person_Number));
            setUnallocatedEmployees(unallocatedEmps);
            setUnallocatedFtes(unallocatedEmps.length);
            setMissingAllocations(unallocatedEmps.length);

            const allClients = Array.from(new Set(allocations.filter(a => a?.content?.cost_center_name).map(a => a.content.cost_center_name)));
            const last6Weeks = Array.from({ length: 6 }).map((_, i) => {
              return startOfWeek(subWeeks(new Date(), 5 - i), { weekStartsOn: 1 });
            });

            const weeklyData = last6Weeks.map(weekStart => {
              const weekStartDateString = format(weekStart, 'yyyy-MM-dd');
              const allocationsForWeek = allocations.filter(a => a?.content && a.content.allocation_date === weekStartDateString);

              const weeklyTotals = allocationsForWeek.reduce((acc, curr) => {
                const client = curr?.content?.cost_center_name || 'Unknown';
                const fte = Number(curr?.content?.allocation_amount || '0') || 0;
                if (!acc[client]) {
                  acc[client] = 0;
                }
                acc[client] += fte;
                return acc;
              }, {} as Record<string, number>);

              const completeWeeklyData: Record<string, any> = { name: weekStartDateString };
              allClients.forEach(client => {
                if (client) completeWeeklyData[client as string] = weeklyTotals[client as string] || 0;
              });

              return completeWeeklyData;
            });
            setAllocationChartData(weeklyData);

        } catch (processingError) {
             writeLog('DashboardContent', 'error', 'Failed to process dashboard data', processingError);
             toast({ variant: 'destructive', title: 'Calculations failed' });
        }

      } catch (error) {
        writeLog('DashboardContent', 'error', 'Failed to load dashboard data', error);
        toast({ variant: 'destructive', title: 'Failed to load dashboard' });
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
    const baseData = activeView === 'allocated' ? allocatedEmployees : (activeView === 'unallocated' || activeView === 'missing') ? unallocatedEmployees : allEmployees;
    const baseTitle = activeView === 'allocated' ? 'Allocated FTEs (Current Week)' : activeView === 'unallocated' ? 'Unallocated FTEs (Current Week)' : activeView === 'missing' ? 'FTEs with Missing Allocations (Current Week)' : 'All FTEs';
    return { title: baseTitle, data: baseData || [], description: `Displaying ${(baseData || []).length} employee(s).` };
  }, [activeView, allocatedEmployees, unallocatedEmployees, allEmployees]);

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
              <CardTitle>Weekly Client Allocation</CardTitle>
              <CardDescription>Total FTEs allocated per client over the last 6 weeks.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <FteAllocationChart data={allocationChartData} />
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
                    ) : (detailData || []).length > 0 ? detailData.map((employee, idx) => (
                      <TableRow key={employee.person_id || employee.Person_Number || idx}>
                        <TableCell>{employee.full_name || employee.Full_Name}</TableCell>
                        <TableCell>{employee.title || employee.Market_Facing_Title}</TableCell>
                        <TableCell>{employee.manager || employee.First_Reviewer_Name}</TableCell>
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
