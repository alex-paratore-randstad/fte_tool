
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
import { getWeeksForFiscalMonth, type FiscalWeek } from '@/lib/fiscal-calendar';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

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

type AllocationFTE = {
  fte: number;
  docId: string | null;
};

type AllocationRow = {
  clientId: string;
  clientName: string;
  weeklyFtes: { [weekKey: string]: AllocationFTE };
};

type EmployeeAllocation = {
  employeeName: string;
  allocations: AllocationRow[];
};

type WeeklyAllocationTableProps = {
  currentDate: Date | null;
  refreshKey: number;
  initialLoading: boolean;
};

const parseEmployeeName = (compositeName: string): string => {
  if (compositeName.includes('] ')) {
    return compositeName.split('] ')[1];
  }
  return compositeName;
};

export function WeeklyAllocationTable({ currentDate, refreshKey, initialLoading }: WeeklyAllocationTableProps) {
  const [originalAllocations, setOriginalAllocations] = useState<EmployeeAllocation[]>([]);
  const [editableAllocations, setEditableAllocations] = useState<EmployeeAllocation[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [startOfCurrentWeek, setStartOfCurrentWeek] = useState<Date | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [hasMounted, setHasMounted] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useCurrentUser();

  useEffect(() => {
    setHasMounted(true);
    // Set date only on client to avoid hydration mismatch
    setStartOfCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, []);
  
  const filteredAllocations = useMemo(() => {
    if (!nameFilter) return editableAllocations;
    return editableAllocations.filter(alloc => 
      parseEmployeeName(alloc.employeeName).toLowerCase().includes(nameFilter.toLowerCase())
    );
  }, [editableAllocations, nameFilter]);

  const weeks: FiscalWeek[] = useMemo(() => {
    if (!currentDate) return [];
    return getWeeksForFiscalMonth(currentDate);
  }, [currentDate]);

  const fetchData = useCallback(async () => {
    if (weeks.length === 0) {
        setInternalLoading(false);
        return;
    };
    setInternalLoading(true);
    try {
      const weekKeys = weeks.map(w => formatDateKey(w.startDate));
      
      const allocationRequests = weekKeys.map(async weekKey => {
        const response = await fetch(`/domo/datastores/v1/collections/weekly_allocation/documents?q=content.allocation_date='${weekKey}'`);
        if (!response.ok) {
            console.warn(`Failed to fetch allocations for ${weekKey}. This may be expected in local dev.`);
            return [];
        };
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
                clientId: cost_center_number,
                clientName: cost_center_name,
                weeklyFtes: {},
            };
        }
        acc[allocation_name][cost_center_number].weeklyFtes[allocation_date] = {
          fte: parseFloat(allocation_amount) || 0,
          docId: current.id,
        };
        return acc;
      }, {} as Record<string, Record<string, AllocationRow>>);

      const structuredAllocations: EmployeeAllocation[] = Object.entries(groupedByEmployee).map(([employeeName, clientGroup]) => ({
        employeeName,
        allocations: Object.values(clientGroup),
      }));

      setOriginalAllocations(structuredAllocations);
      setEditableAllocations(JSON.parse(JSON.stringify(structuredAllocations))); // Deep copy for editing
    } catch (error) {
      console.error('Error fetching allocation data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to fetch allocation data',
        description: 'Could not retrieve data from the server.'
      });
    } finally {
      setInternalLoading(false);
    }
  }, [weeks, toast]);
  
  useEffect(() => {
    if(currentDate) {
        fetchData();
    }
  }, [currentDate, fetchData, refreshKey]);

  const handleFteChange = (employeeName: string, clientId: string, weekKey: string, newFteValue: string) => {
    const newFte = parseFloat(newFteValue) || 0;
    setEditableAllocations(prev => prev.map(empAlloc => {
      if (empAlloc.employeeName === employeeName) {
        const newAllocations = empAlloc.allocations.map(alloc => {
          if (alloc.clientId === clientId) {
            const updatedFtes = { ...alloc.weeklyFtes };
            if (updatedFtes[weekKey]) {
              updatedFtes[weekKey].fte = newFte;
            }
            return { ...alloc, weeklyFtes: updatedFtes };
          }
          return alloc;
        });
        return { ...empAlloc, allocations: newAllocations };
      }
      return empAlloc;
    }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const updates = [];

    for (let empIdx = 0; empIdx < editableAllocations.length; empIdx++) {
      const empAlloc = editableAllocations[empIdx];
      for (let allocIdx = 0; allocIdx < empAlloc.allocations.length; allocIdx++) {
        const alloc = empAlloc.allocations[allocIdx];
        for (const weekKey in alloc.weeklyFtes) {
          const editable = alloc.weeklyFtes[weekKey];
          const originalEmp = originalAllocations.find(e => e.employeeName === empAlloc.employeeName);
          const originalAlloc = originalEmp?.allocations.find(a => a.clientId === alloc.clientId);
          
          if (editable && editable.docId && originalAlloc) {
            const original = originalAlloc.weeklyFtes[weekKey];
            if (original && editable.fte !== original.fte) {
              updates.push({
                docId: editable.docId,
                content: {
                  allocation_date: weekKey,
                  allocation_name: empAlloc.employeeName, // Save the full composite name
                  cost_center_name: alloc.clientName,
                  cost_center_number: alloc.clientId,
                  allocation_amount: (editable.fte || 0).toString(),
                },
              });
            }
          }
        }
      }
    }

    if (updates.length === 0) {
      toast({ title: 'No changes to save.' });
      setIsSaving(false);
      return;
    }

    try {
      await Promise.all(updates.map(update =>
        fetch(`/domo/datastores/v1/collections/weekly_allocation/documents/${update.docId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: update.content }),
        }).then(res => {
          if (!res.ok) throw new Error(`Failed to update allocation for ${parseEmployeeName(update.content.allocation_name)}`);
          return res.json();
        })
      ));
      toast({ title: 'Success', description: `${updates.length} allocation(s) updated.` });
      fetchData(); // Refresh data
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };


  if (initialLoading || internalLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved Allocations for this Period</CardTitle>
          <CardDescription>Records from the weekly_allocation collection for the displayed weeks.</CardDescription>
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
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle>Saved Allocations for this Period</CardTitle>
              <CardDescription>Records from the weekly_allocation collection. You can edit values and save.</CardDescription>
            </div>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
        </div>
         <div className="pt-4">
          <Input 
            placeholder="Filter by employee name..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="min-w-[250px] sticky left-0 bg-card z-10">Employee / Client</TableHead>
                    {weeks.map(week => {
                        const isPast = hasMounted && startOfCurrentWeek ? isBefore(endOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek) : false;
                        const isCurrent = hasMounted && startOfCurrentWeek ? isSameDay(startOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek) : false;
                        const isLockedForUser = isPast && !isAdmin;
                        return (
                            <TableHead key={week.startDate.toISOString()} className={cn("text-center min-w-[150px] transition-colors", { "bg-muted/40": isPast, "bg-primary/10": isCurrent })}>
                            <div className='flex items-center justify-center gap-2'>
                                <Lock className={cn("h-3.5 w-3.5 text-muted-foreground", !isLockedForUser && "invisible")} />
                                <span>W/E {week.reportingWeekDate}</span>
                            </div>
                            <Badge variant="default" className={cn("w-fit mx-auto mt-1", !isCurrent && "invisible")}>Current</Badge>
                            </TableHead>
                        )
                    })}
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredAllocations.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={weeks.length + 1} className="text-center h-24 text-muted-foreground">
                            {nameFilter ? 'No matching employees found.' : 'No saved allocation data found for this period.'}
                        </TableCell>
                    </TableRow>
                ) : (
                    filteredAllocations.map(({ employeeName, allocations: empAllocations }) => {
                        const weeklyTotals = weeks.map(week => {
                            const weekKey = formatDateKey(week.startDate);
                            return empAllocations.reduce((total, alloc) => total + (alloc.weeklyFtes[weekKey]?.fte || 0), 0);
                        });

                        return (
                            <Fragment key={employeeName}>
                                <TableRow className="bg-muted/50 hover:bg-muted">
                                    <TableCell className="font-semibold sticky left-0 bg-muted/50 z-10">{parseEmployeeName(employeeName)}</TableCell>
                                    {weeklyTotals.map((total, index) => (
                                        <TableCell key={index} className={cn("text-center font-semibold", total > 1.0 ? "text-destructive" : "text-muted-foreground")}>
                                        {total > 0 ? total.toFixed(2) : '-'}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                {empAllocations.map(alloc => (
                                    <TableRow key={`${employeeName}-${alloc.clientId}`}>
                                        <TableCell className="sticky left-0 bg-card z-10 pl-10">{alloc.clientName}</TableCell>
                                        {weeks.map(week => {
                                            const weekKey = formatDateKey(week.startDate);
                                            const isPast = hasMounted && startOfCurrentWeek ? isBefore(endOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek) : false;
                                            const isCurrent = hasMounted && startOfCurrentWeek ? isSameDay(startOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek) : false;
                                            const isLockedForUser = isPast && !isAdmin;
                                            const fteData = alloc.weeklyFtes[weekKey];

                                            return (
                                                <TableCell key={week.startDate.toISOString()} className={cn("text-center", {"bg-muted/40": isPast, "bg-primary/10": isCurrent})}>
                                                    {fteData ? (
                                                        <Input
                                                          type="number" step="0.05" min="0" placeholder="0.00"
                                                          className={cn("w-24 text-center mx-auto", { "bg-muted/50 cursor-not-allowed": isLockedForUser })}
                                                          value={fteData.fte || ''}
                                                          onChange={(e) => handleFteChange(employeeName, alloc.clientId, weekKey, e.target.value)}
                                                          disabled={isLockedForUser || isSaving} readOnly={isLockedForUser}
                                                        />
                                                    ) : (
                                                      <div className="w-24 text-center mx-auto text-muted-foreground">-</div>
                                                    )}
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
