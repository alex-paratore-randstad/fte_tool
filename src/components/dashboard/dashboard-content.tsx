
'use client';

import { useEffect, useState } from 'react';
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
      try {
        const [empResponse, allocResponse] = await Promise.all([
          fetch(`/data/v1/gbs_ind_hr_fte_report`),
          fetch(`/domo/datastores/v1/collections/weekly_allocation/documents/`),
        ]);

        if (!empResponse.ok) {
          console.warn("Could not fetch employee data. This may be expected in local dev.");
        }
         if (!allocResponse.ok) {
          console.warn("Could not fetch allocation data. This may be expected in local dev.");
        }

        const employees: TeamMember[] = empResponse.ok ? await empResponse.json() : [];
        const allocations: WeeklyAllocation[] = allocResponse.ok ? await allocResponse.json() : [];

        try {
            const safeEmployees = employees.filter(e => e && e.Person_Number && e.Full_Name);
            setAllEmployees(safeEmployees);
            const totalEmployeeCount = new Set(safeEmployees.map(e => e.Person_Number)).size;
            setTotalFtes(totalEmployeeCount);

            const today = startOfWeek(new Date(), { weekStartsOn: 1 });
            const currentWeekAllocations = allocations.filter(a => a.content.allocation_date === format(today, 'yyyy-MM-dd'));

            const allocatedEmployeeNames = new Set(
                currentWeekAllocations
                    .filter(a => a && a.content && a.content.allocation_name && a.content.allocation_amount > 0)
                    .map(a => a.content.allocation_name)
            );

            const allocatedEmps = safeEmployees.filter(e => allocatedEmployeeNames.has(e.Full_Name));
            setAllocatedEmployees(allocatedEmps);
            setAllocatedFtes(allocatedEmps.length);

            const unallocatedEmps = safeEmployees.filter(e => !allocatedEmployeeNames.has(e.Full_Name));
            setUnallocatedEmployees(unallocatedEmps);
            setUnallocatedFtes(unallocatedEmps.length);
            setMissingAllocations(unallocatedEmps.length);

            const allClients = Array.from(new Set(allocations.map(a => a.content.cost_center_name)));
            const last6Weeks = Array.from({ length: 6 }).map((_, i) => {
              return startOfWeek(subWeeks(new Date(), 5 - i), { weekStartsOn: 1 });
            });

            const weeklyData = last6Weeks.map(weekStart => {
              const weekStartDateString = format(weekStart, 'yyyy-MM-dd');
              const allocationsForWeek = allocations.filter(a => a.content.allocation_date === weekStartDateString);

              const weeklyTotals = allocationsForWeek.reduce((acc, curr) => {
                const client = curr.content.cost_center_name;
                const fte = Number(curr.content.allocation_amount) || 0;
                if (!acc[client]) {
                  acc[client] = 0;
                }
                acc[client] += fte;
                return acc;
              }, {} as Record<string, number>);

              const completeWeeklyData: Record<string, any> = { name: weekStartDateString };
              allClients.forEach(client => {
                completeWeeklyData[client] = weeklyTotals[client] || 0;
              });

              return completeWeeklyData;
            });
            setAllocationChartData(weeklyData);

        } catch (processingError) {
             console.error("Failed to process dashboard data:", processingError);
             toast({
                variant: 'destructive',
                title: 'Failed to process data',
                description: 'Could not calculate dashboard metrics.'
            });
            setTotalFtes(0);
            setAllocatedFtes(0);
            setUnallocatedFtes(0);
            setMissingAllocations(0);
            setAllocationChartData([]);
        }

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

  const handleCardClick = (view: ActiveView) => {
    setActiveView(current => (current === view ? null : view));
  };
  
  const { title: detailTitle, data: detailData, description: detailDescription } = (() => {
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
        // Provide a default empty state for the initial null `activeView` state
        return { title: 'All FTEs', data: allEmployees, description: `Displaying ${allEmployees.length} employee(s).` };
    }
  })();

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
            <CardContent><Skeleton className="h-8 w-1/2" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Allocated FTEs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><Skeleton className="h-8 w-1/2" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unallocated FTEs</CardTitle>
              <UserMinus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><Skeleton className="h-8 w-1/2" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Missing Allocations</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><Skeleton className="h-8 w-1/2" /></CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Client Allocation</CardTitle>
              <CardDescription>Total FTEs allocated per client over the last 6 weeks.</CardDescription>
            </CardHeader>
            <CardContent>
              <FteAllocationChart data={[]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>All FTEs</CardTitle>
              <CardDescription>Displaying employees.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                      <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                      <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
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
          onClick={() => handleCardClick('total')}
          isActive={activeView === 'total'}
        />
        <SummaryCard
          title="Allocated FTEs"
          value={allocatedFtes.toString()}
          icon={Briefcase}
          onClick={() => handleCardClick('allocated')}
          isActive={activeView === 'allocated'}
        />
        <SummaryCard
          title="Unallocated FTEs"
          value={unallocatedFtes.toString()}
          icon={UserMinus}
          variant={unallocatedFtes > 0 ? 'default' : 'default'}
          onClick={() => handleCardClick('unallocated')}
          isActive={activeView === 'unallocated'}
        />
        <SummaryCard
          title="Missing Allocations"
          value={missingAllocations.toString()}
          icon={AlertTriangle}
          variant={missingAllocations > 0 ? 'destructive' : 'default'}
          onClick={() => handleCardClick('missing')}
          isActive={activeView === 'missing'}
        />
      </div>

      <div className="grid grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Client Allocation</CardTitle>
              <CardDescription>Total FTEs allocated per client over the last 6 weeks.</CardDescription>
            </CardHeader>
            <CardContent>
              <FteAllocationChart data={allocationChartData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{detailTitle}</CardTitle>
              <CardDescription>{detailDescription}</CardDescription>
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
                    {detailData.length > 0 ? detailData.map(employee => (
                      <TableRow key={employee.Person_Number}>
                        <TableCell>{employee.Full_Name}</TableCell>
                        <TableCell>{employee.Market_Facing_Title}</TableCell>
                        <TableCell>{employee.First_Reviewer_Name}</TableCell>
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
