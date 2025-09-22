
'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { addWeeks, startOfWeek, endOfWeek, format, isBefore, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Lock } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getWeeksForFiscalMonth } from '@/lib/fiscal-calendar';

type WeeklyAllocationDoc = {
  id: string;
  content: {
    allocation_date: string;
    allocation_name: string;
    cost_center_name: string;
    cost_center_number: string;
    allocation_amount: string;
  }
}

const formatDateKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

type AllocationRow = {
  costCenterId: string;
  costCenterName: string;
  weeklyFtes: { [weekKey: string]: number };
};

type EmployeeAllocation = {
  employeeName: string;
  allocations: AllocationRow[];
};

type WeeklyAllocationTableProps = {
  currentDate: Date;
};

export function WeeklyAllocationTable({ currentDate }: WeeklyAllocationTableProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [allocations, setAllocations] = useState<EmployeeAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin } = useCurrentUser();

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const weeks = useMemo(() => {
    if (!isMounted) return [];
    return getWeeksForFiscalMonth(currentDate);
  }, [currentDate, isMounted]);

  const fetchData = useCallback(async () => {
    if (weeks.length === 0) return;
    setLoading(true);
    try {
      const weekKeys = weeks.map(formatDateKey);
      
      const allocationRequests = weekKeys.map(async weekKey => {
        const response = await fetch(`/domo/datastores/v1/collections/weekly_allocation/documents?filter=content.allocation_date='${weekKey}'`);
        if (!response.ok) throw new Error(`Failed to fetch allocations for ${weekKey}`);
        return response.json();
      });

      const results = await Promise.all(allocationRequests);
      const allFetchedAllocations: WeeklyAllocationDoc[] = results.flat();
      
      const groupedByEmployee = allFetchedAllocations.reduce((acc, current) => {
        const { allocation_name, cost_center_number, cost_center_name, allocation_date, allocation_amount } = current.content;
        
        if (!acc[allocation_name]) {
            acc[allocation_name] = {};
        }
        if (!acc[allocation_name][cost_center_number]) {
            acc[allocation_name][cost_center_number] = {
                costCenterId: cost_center_number,
                costCenterName: cost_center_name,
                weeklyFtes: {},
            };
        }
        acc[allocation_name][cost_center_number].weeklyFtes[allocation_date] = parseFloat(allocation_amount);
        return acc;
      }, {} as Record<string, Record<string, AllocationRow>>);

      const structuredAllocations: EmployeeAllocation[] = Object.entries(groupedByEmployee).map(([employeeName, costCenterGroup]) => ({
        employeeName,
        allocations: Object.values(costCenterGroup),
      }));

      setAllocations(structuredAllocations);
    } catch (error) {
      console.error('Error fetching allocation data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to fetch allocation data',
        description: 'Could not retrieve data from the server.'
      });
    } finally {
      setLoading(false);
    }
  }, [weeks, toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!isMounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved Allocations for this Period</CardTitle>
          <CardDescription>Records from the weekly_allocation collection for the displayed weeks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved Allocations for this Period</CardTitle>
          <CardDescription>Records from the weekly_allocation collection for the displayed weeks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Allocations for this Period</CardTitle>
        <CardDescription>Records from the weekly_allocation collection for the displayed weeks.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="min-w-[250px] sticky left-0 bg-card z-10">Employee / Cost Center</TableHead>
                    {weeks.map(week => {
                        const isPast = isBefore(endOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                        const isCurrent = isSameDay(startOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                        const isLockedForUser = isPast && !isAdmin;
                        return (
                            <TableHead key={week.toISOString()} className={cn("text-center min-w-[150px] transition-colors", { "bg-muted/40": isPast, "bg-primary/10": isCurrent })}>
                            <div className='flex items-center justify-center gap-2'>
                                {isLockedForUser && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                                <span>W/E {format(endOfWeek(week, { weekStartsOn: 1 }), 'MMM d')}</span>
                            </div>
                            {isCurrent && <Badge variant="default" className="w-fit mx-auto mt-1">Current</Badge>}
                            </TableHead>
                        )
                    })}
                </TableRow>
            </TableHeader>
            <TableBody>
                {allocations.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={weeks.length + 1} className="text-center h-24 text-muted-foreground">
                            No saved allocation data found for this period.
                        </TableCell>
                    </TableRow>
                ) : (
                    allocations.map(({ employeeName, allocations: empAllocations }) => {
                        const weeklyTotals = weeks.map(week => {
                            const weekKey = formatDateKey(week);
                            return empAllocations.reduce((total, alloc) => total + (alloc.weeklyFtes[weekKey] || 0), 0);
                        });

                        return (
                            <Fragment key={employeeName}>
                                <TableRow className="bg-muted/50 hover:bg-muted">
                                    <TableCell className="font-semibold sticky left-0 bg-muted/50 z-10">{employeeName}</TableCell>
                                    {weeklyTotals.map((total, index) => (
                                        <TableCell key={index} className={cn("text-center font-semibold", total > 1.0 ? "text-destructive" : "text-muted-foreground")}>
                                        {total > 0 ? total.toFixed(2) : '-'}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                {empAllocations.map(alloc => (
                                    <TableRow key={`${employeeName}-${alloc.costCenterId}`}>
                                        <TableCell className="sticky left-0 bg-card z-10 pl-10">{alloc.costCenterName}</TableCell>
                                        {weeks.map(week => {
                                            const weekKey = formatDateKey(week);
                                            const isPast = isBefore(endOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                                            const fte = alloc.weeklyFtes[weekKey] || 0;
                                            return (
                                                <TableCell key={week.toISOString()} className={cn("text-center", {"bg-muted/40": isPast})}>
                                                    {fte > 0 ? fte.toFixed(2) : '-'}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ))}
                            </Fragment>
                        )
                    })
                )}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
