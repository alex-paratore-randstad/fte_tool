
'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { startOfWeek, endOfWeek, format, isBefore, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Lock } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getWeeksForFiscalMonth } from '@/lib/fiscal-calendar';

type SavedTitleAllocationDoc = {
  id: string;
  content: {
    allocation_date: string;
    employee_name: string;
    updated_title: string;
  }
}

const formatDateKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

type EmployeeTitleAllocation = {
  employeeName: string;
  weeklyTitles: { [weekKey: string]: string };
};

type SavedTitleAllocationsTableProps = {
  currentDate: Date | null;
  refreshKey: number;
};

export function SavedTitleAllocationsTable({ currentDate, refreshKey }: SavedTitleAllocationsTableProps) {
  const [allocations, setAllocations] = useState<EmployeeTitleAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [startOfCurrentWeek, setStartOfCurrentWeek] = useState<Date | null>(null);
  const { toast } = useToast();
  const { isAdmin } = useCurrentUser();

  useEffect(() => {
    setStartOfCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, []);

  const weeks = useMemo(() => {
    if (!currentDate) return [];
    return getWeeksForFiscalMonth(currentDate);
  }, [currentDate]);

  const fetchData = useCallback(async () => {
    if (weeks.length === 0) {
        setLoading(false);
        return;
    };
    setLoading(true);
    try {
      const weekKeys = weeks.map(formatDateKey);
      
      const allocationRequests = weekKeys.map(async weekKey => {
        const response = await fetch(`/domo/datastores/v1/collections/title_allocations/documents?filter=content.allocation_date='${weekKey}'`);
        if (!response.ok) {
            console.warn(`Failed to fetch title allocations for ${weekKey}.`);
            return [];
        };
        return response.json();
      });

      const results = await Promise.all(allocationRequests);
      const allFetchedAllocations: SavedTitleAllocationDoc[] = results.flat();
      
      const groupedByEmployee = allFetchedAllocations.reduce((acc, current) => {
        const { employee_name, allocation_date, updated_title } = current.content;
        
        if (!acc[employee_name]) {
            acc[employee_name] = {
                employeeName: employee_name,
                weeklyTitles: {},
            };
        }
        acc[employee_name].weeklyTitles[allocation_date] = updated_title;
        return acc;
      }, {} as Record<string, EmployeeTitleAllocation>);

      setAllocations(Object.values(groupedByEmployee));
    } catch (error) {
      console.error('Error fetching title allocation data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to fetch title allocation data',
        description: 'Could not retrieve data from the server.'
      });
    } finally {
      setLoading(false);
    }
  }, [weeks, toast]);
  
  useEffect(() => {
    if (currentDate) {
        fetchData();
    }
  }, [currentDate, fetchData, refreshKey]);

  if (loading || !startOfCurrentWeek || !currentDate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved Title Allocations for this Period</CardTitle>
          <CardDescription>Records from the title_allocations collection.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Title Allocations for this Period</CardTitle>
        <CardDescription>Records from the title_allocations collection.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="min-w-[200px] sticky left-0 bg-card z-10">Employee</TableHead>
                    {weeks.map(week => {
                        const isPast = isBefore(endOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                        const isCurrent = isSameDay(startOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                        const isLockedForUser = isPast && !isAdmin;
                        return (
                            <TableHead key={week.toISOString()} className={cn("text-center min-w-[250px] transition-colors", { "bg-muted/40": isPast, "bg-primary/10": isCurrent })}>
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
                            No saved title allocation data found for this period.
                        </TableCell>
                    </TableRow>
                ) : (
                    allocations.map(({ employeeName, weeklyTitles }) => (
                        <TableRow key={employeeName}>
                            <TableCell className="font-semibold sticky left-0 bg-card z-10">{employeeName}</TableCell>
                            {weeks.map(week => {
                                const weekKey = formatDateKey(week);
                                const isPast = isBefore(endOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                                const isCurrent = isSameDay(startOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                                const title = weeklyTitles[weekKey];
                                return (
                                    <TableCell key={week.toISOString()} className={cn("text-center", {"bg-muted/40": isPast, "bg-primary/10": isCurrent})}>
                                        {title || '-'}
                                    </TableCell>
                                )
                            })}
                        </TableRow>
                    ))
                )}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
