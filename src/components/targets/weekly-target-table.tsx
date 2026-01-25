
'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { startOfWeek, format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getWeeksForFiscalMonth, type FiscalWeek } from '@/lib/fiscal-calendar';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { WeeklyTarget } from '@/types';

const formatDateKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

type TargetFTE = {
  hires: number;
  docId: string | null;
};

type TargetRow = {
  clientId: string;
  clientName: string;
  weeklyTargets: { [weekKey: string]: TargetFTE };
};

type EmployeeTarget = {
  employeeName: string;
  targets: TargetRow[];
};

type WeeklyTargetTableProps = {
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

export function WeeklyTargetTable({ currentDate, refreshKey, initialLoading }: WeeklyTargetTableProps) {
  const [originalTargets, setOriginalTargets] = useState<EmployeeTarget[]>([]);
  const [editableTargets, setEditableTargets] = useState<EmployeeTarget[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [startOfCurrentWeek, setStartOfCurrentWeek] = useState<Date | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const { toast } = useToast();

  const isLoading = initialLoading || internalLoading;

  useEffect(() => {
    // Set date only on client to avoid hydration mismatch
    setStartOfCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, []);
  
  const filteredTargets = useMemo(() => {
    if (!nameFilter) return editableTargets;
    return editableTargets.filter(alloc => 
      parseEmployeeName(alloc.employeeName).toLowerCase().includes(nameFilter.toLowerCase())
    );
  }, [editableTargets, nameFilter]);

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
      
      const targetRequests = weekKeys.map(async weekKey => {
        const response = await fetch(`/domo/datastores/v1/collections/weekly_targets/documents?q=content.target_date='${weekKey}'`);
        if (!response.ok) {
            console.warn(`Failed to fetch targets for ${weekKey}. This may be expected in local dev.`);
            return [];
        };
        return response.json();
      });

      const results = await Promise.all(targetRequests);
      const allFetchedTargets: WeeklyTarget[] = results.flat();
      
      const groupedByEmployee = allFetchedTargets.reduce((acc, current) => {
        const { target_name, target_cost_center_number, target_cost_center_name, target_date, target_amount } = current.content;
        
        if (!acc[target_name]) {
            acc[target_name] = {};
        }
        if (!acc[target_name][target_cost_center_number]) {
            acc[target_name][target_cost_center_number] = {
                clientId: target_cost_center_number,
                clientName: target_cost_center_name,
                weeklyTargets: {},
            };
        }
        acc[target_name][target_cost_center_number].weeklyTargets[target_date] = {
          hires: parseInt(target_amount, 10) || 0,
          docId: current.id,
        };
        return acc;
      }, {} as Record<string, Record<string, TargetRow>>);

      const structuredTargets: EmployeeTarget[] = Object.entries(groupedByEmployee).map(([employeeName, clientGroup]) => ({
        employeeName,
        targets: Object.values(clientGroup),
      }));

      setOriginalTargets(structuredTargets);
      setEditableTargets(JSON.parse(JSON.stringify(structuredTargets))); // Deep copy for editing
    } catch (error) {
      console.error('Error fetching target data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to fetch target data',
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

  const handleTargetChange = (employeeName: string, clientId: string, weekKey: string, newTargetValue: string) => {
    const newTarget = parseInt(newTargetValue, 10) || 0;
    setEditableTargets(prev => prev.map(empAlloc => {
      if (empAlloc.employeeName === employeeName) {
        const newTargets = empAlloc.targets.map(alloc => {
          if (alloc.clientId === clientId) {
            const updatedTargets = { ...alloc.weeklyTargets };
            if (updatedTargets[weekKey]) {
              updatedTargets[weekKey].hires = newTarget;
            }
            return { ...alloc, weeklyTargets: updatedTargets };
          }
          return alloc;
        });
        return { ...empAlloc, targets: newTargets };
      }
      return empAlloc;
    }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const updates = [];

    for (let empIdx = 0; empIdx < editableTargets.length; empIdx++) {
      const empAlloc = editableTargets[empIdx];
      for (let allocIdx = 0; allocIdx < empAlloc.targets.length; allocIdx++) {
        const alloc = empAlloc.targets[allocIdx];
        for (const weekKey in alloc.weeklyTargets) {
          const editable = alloc.weeklyTargets[weekKey];
          const originalEmp = originalTargets.find(e => e.employeeName === empAlloc.employeeName);
          const originalAlloc = originalEmp?.targets.find(a => a.clientId === alloc.clientId);
          
          if (editable && editable.docId && originalAlloc) {
            const original = originalAlloc.weeklyTargets[weekKey];
            if (original && editable.hires !== original.hires) {
              updates.push({
                docId: editable.docId,
                content: {
                  target_date: weekKey,
                  target_name: empAlloc.employeeName,
                  target_cost_center_name: alloc.clientName,
                  target_cost_center_number: alloc.clientId,
                  target_amount: (editable.hires || 0).toString(),
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
        fetch(`/domo/datastores/v1/collections/weekly_targets/documents/${update.docId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: update.content }),
        }).then(res => {
          if (!res.ok) throw new Error(`Failed to update target for ${parseEmployeeName(update.content.target_name)}`);
          return res.json();
        })
      ));
      toast({ title: 'Success', description: `${updates.length} target(s) updated.` });
      fetchData(); // Refresh data
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle>Saved Targets for this Period</CardTitle>
              <CardDescription>Records from the weekly_targets collection. You can edit values and save.</CardDescription>
            </div>
            <Button onClick={handleSaveChanges} disabled={isSaving || isLoading}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
        </div>
         <div className="pt-4">
          <Input 
            placeholder="Filter by employee name..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="max-w-sm"
            disabled={isLoading}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="min-w-[200px] sticky left-0 bg-card z-10">Employee / Client</TableHead>
                    {weeks.map(week => {
                        const isCurrent = startOfCurrentWeek ? isSameDay(startOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek) : false;
                        return (
                            <TableHead key={week.startDate.toISOString()} className={cn("text-center min-w-[120px] transition-colors", { "bg-primary/10": isCurrent })}>
                            <div className='flex items-center justify-center gap-2'>
                                <span>W/E {week.reportingWeekDate}</span>
                            </div>
                            {isCurrent && <Badge variant="default" className="w-fit mx-auto mt-1">Current</Badge>}
                            </TableHead>
                        )
                    })}
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={weeks.length + 1}>
                      <div className="space-y-4 py-8">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTargets.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={weeks.length + 1} className="text-center h-24 text-muted-foreground">
                            {nameFilter ? 'No matching employees found.' : 'No saved target data found for this period.'}
                        </TableCell>
                    </TableRow>
                ) : (
                    filteredTargets.map(({ employeeName, targets: empTargets }) => {
                        const weeklyTotals = weeks.map(week => {
                            const weekKey = formatDateKey(week.startDate);
                            return empTargets.reduce((total, alloc) => total + (alloc.weeklyTargets[weekKey]?.hires || 0), 0);
                        });

                        return (
                            <Fragment key={employeeName}>
                                <TableRow className="bg-muted/50 hover:bg-muted">
                                    <TableCell className="font-semibold sticky left-0 bg-muted/50 z-10">{parseEmployeeName(employeeName)}</TableCell>
                                    {weeklyTotals.map((total, index) => (
                                        <TableCell key={index} className="text-center font-semibold text-muted-foreground">
                                        {total > 0 ? total : '-'}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                {empTargets.map(alloc => (
                                    <TableRow key={`${employeeName}-${alloc.clientId}`}>
                                        <TableCell className="sticky left-0 bg-card z-10 pl-8">{alloc.clientName}</TableCell>
                                        {weeks.map(week => {
                                            const weekKey = formatDateKey(week.startDate);
                                            const isCurrent = startOfCurrentWeek ? isSameDay(startOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek) : false;
                                            const targetData = alloc.weeklyTargets[weekKey];

                                            return (
                                                <TableCell key={week.startDate.toISOString()} className={cn("text-center", {"bg-primary/10": isCurrent})}>
                                                    {targetData ? (
                                                        <Input
                                                          type="number" step="1" min="0" placeholder="0"
                                                          className="w-20 text-center mx-auto"
                                                          value={targetData.hires || ''}
                                                          onChange={(e) => handleTargetChange(employeeName, alloc.clientId, weekKey, e.target.value)}
                                                          disabled={isSaving}
                                                        />
                                                    ) : (
                                                      <div className="w-20 text-center mx-auto text-muted-foreground">-</div>
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
