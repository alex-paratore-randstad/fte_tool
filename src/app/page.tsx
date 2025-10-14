
'use client';

import { PageHeader } from '@/components/page-header';
import { Users, Briefcase, AlertTriangle, UserMinus } from 'lucide-react';
import SummaryCard from '@/components/dashboard/summary-card';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TeamMember, WeeklyAllocation } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

type ActiveView = 'total' | 'allocated' | 'unallocated' | 'missing' | null;

export default function DashboardPage() {
  const [totalFtes, setTotalFtes] = useState(0);
  const [allocatedFtes, setAllocatedFtes] = useState(0);
  const [unallocatedFtes, setUnallocatedFtes] = useState(0);
  const [missingAllocations, setMissingAllocations] = useState(0);

  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [allocatedEmployees, setAllocatedEmployees] = useState<TeamMember[]>([]);
  const [unallocatedEmployees, setUnallocatedEmployees] = useState<TeamMember[]>([]);
  
  const [activeView, setActiveView] = useState<ActiveView>(null);
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

        if (!empResponse.ok) {
          console.warn("Could not fetch employee data. This may be expected in local dev.");
          toast({
            variant: 'destructive',
            title: 'Failed to load employee data',
            description: 'Dashboard metrics will be incomplete.'
          });
        }
         if (!allocResponse.ok) {
          console.warn("Could not fetch allocation data. This may be expected in local dev.");
        }

        const employees: TeamMember[] = empResponse.ok ? await empResponse.json() : [];
        const allocations: WeeklyAllocation[] = allocResponse.ok ? await allocResponse.json() : [];

        // Safe data processing to prevent runtime errors
        try {
            const safeEmployees = employees.filter(e => e && e.Person_Number && e.Full_Name);
            setAllEmployees(safeEmployees);
            const totalEmployeeCount = new Set(safeEmployees.map(e => e.Person_Number)).size;
            setTotalFtes(totalEmployeeCount);

            const allocatedEmployeeNames = new Set(
                allocations
                    .filter(a => a && a.content && a.content.allocation_name)
                    .map(a => a.content.allocation_name)
            );

            const allocatedEmps = safeEmployees.filter(e => allocatedEmployeeNames.has(e.Full_Name));
            setAllocatedEmployees(allocatedEmps);
            setAllocatedFtes(allocatedEmps.length);

            const unallocatedEmps = safeEmployees.filter(e => !allocatedEmployeeNames.has(e.Full_Name));
            setUnallocatedEmployees(unallocatedEmps);
            setUnallocatedFtes(unallocatedEmps.length);
            setMissingAllocations(unallocatedEmps.length);
        } catch (processingError) {
             console.error("Failed to process dashboard data:", processingError);
             toast({
                variant: 'destructive',
                title: 'Failed to process data',
                description: 'Could not calculate dashboard metrics.'
            });
            // Reset to zero to avoid showing stale/incorrect data
            setTotalFtes(0);
            setAllocatedFtes(0);
            setUnallocatedFtes(0);
            setMissingAllocations(0);
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
  
  const renderDetailView = () => {
    if (!activeView) return null;

    let title = '';
    let data: TeamMember[] = [];

    switch (activeView) {
      case 'total':
        title = 'All FTEs';
        data = allEmployees;
        break;
      case 'allocated':
        title = 'Allocated FTEs';
        data = allocatedEmployees;
        break;
      case 'unallocated':
        title = 'Unallocated FTEs';
        data = unallocatedEmployees;
        break;
      case 'missing':
        title = 'FTEs with Missing Allocations';
        data = unallocatedEmployees;
        break;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Displaying {data.length} employee(s) in this category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Manager</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length > 0 ? data.map(employee => (
                  <TableRow key={employee.Person_Number}>
                    <TableCell>{employee.Full_Name}</TableCell>
                    <TableCell>{employee.Market_Facing_Title}</TableCell>
                    <TableCell>{employee.First_Reviewer_Name}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      No data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };


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
         <Card>
            <CardHeader>
                <CardTitle><Skeleton className="h-6 w-1/4" /></CardTitle>
                 <CardDescription><Skeleton className="h-4 w-1/2" /></CardDescription>
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[300px] w-full" />
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

      <div className="grid grid-cols-1 gap-8">
        {renderDetailView()}
      </div>
    </div>
  );
}
