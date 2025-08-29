
'use client';

import { useState, useMemo, Fragment, useEffect, useCallback } from 'react';
import { addWeeks, subWeeks, startOfWeek, endOfWeek, format, isBefore, isSameWeek, eachWeekOfInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight, PlusCircle, Trash2, Lock, UserPlus } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { TeamMember } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { Combobox } from '@/components/ui/combobox';

const baseUrl = 'https://c5899a60-de1d-42af-b19b-99f8dff54fad.domoapps.prod10.domo.com';
const domo = {
  get: async (url: string) => {
    const rUrl = `${baseUrl}${url}`;
    const response = await fetch(rUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  post: async (url: string, body: any) => {
    const rUrl = `${baseUrl}${url}`;
    const response = await fetch(rUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
};

type CostCenterData = { ['cost_center_number']: string; ['cost_center_name']: string };
type AllocationDoc = {
    id: string;
    content: {
        allocation_date: string;
        allocation_name: string;
        cost_center_name: string;
        cost_center_number: string;
        allocation_amount: string;
    }
};

const formatDateKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

type AllocationRow = {
  id: string;
  costCenterId: string;
  costCenterName: string;
  weeklyFtes: { [weekKey: string]: number };
};

type EmployeeAllocation = {
  employee: TeamMember;
  allocations: AllocationRow[];
};

type MultiWeekGridProps = {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
};


export function MultiWeekGrid({ currentDate, setCurrentDate }: MultiWeekGridProps) {
  const [activeAllocations, setActiveAllocations] = useState<EmployeeAllocation[]>([]);
  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterData[]>([]);
  const [loading, setLoading] = useState(true);

  const { currentUser, isManager, isAdmin, isVp, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();

  const weeks = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 4 }, (_, i) => addWeeks(start, i));
  }, [currentDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empResult, ccResult] = await Promise.all([
        domo.get(`/data/v1/gbs_ind_hr_fte_report`),
        domo.get(`/data/v1/gbs_ind_finance_cc_report`),
      ]);
      const empData: TeamMember[] = empResult.filter((e: TeamMember) => e.Full_Name);
      const ccData: CostCenterData[] = ccResult.filter((c: CostCenterData) => c.cost_center_number && c.cost_center_name);
      
      setAllEmployees(empData);
      setCostCenters(ccData);

    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      toast({ variant: 'destructive', title: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const availableEmployees = useMemo(() => {
    const activeEmployeeIds = activeAllocations.map(a => a.employee.Person_Number);
    return allEmployees.filter(e => !activeEmployeeIds.includes(e.Person_Number));
  }, [allEmployees, activeAllocations]);

  const handlePrevWeeks = () => setCurrentDate(subWeeks(currentDate, 4));
  const handleNextWeeks = () => setCurrentDate(addWeeks(currentDate, 4));
  
  const handleAddEmployee = (employeeId: string) => {
    const employeeToAdd = allEmployees.find(e => e.Person_Number === employeeId);
    if (employeeToAdd) {
      const isAlreadyActive = activeAllocations.some(a => a.employee.Person_Number === employeeId);
      if (isAlreadyActive) {
          toast({ variant: 'destructive', title: 'Employee already in grid' });
          return;
      }

      const newAllocationRow: AllocationRow = {
        id: `${employeeId}-new-${Date.now()}`,
        costCenterId: '',
        costCenterName: '',
        weeklyFtes: {},
      };
      
      setActiveAllocations(prev => [{
        employee: employeeToAdd,
        allocations: [newAllocationRow]
      }, ...prev]);
    }
  };

  const handleRemoveEmployee = (employeeId: string) => {
    setActiveAllocations(prev => prev.filter(a => a.employee.Person_Number !== employeeId));
  };
  
  const handleFteChange = (employeeId: string, allocId: string, weekKey: string, newFteValue: string) => {
    const newFte = parseFloat(newFteValue) || 0;
    setActiveAllocations(prev => prev.map(empAlloc => {
        if (empAlloc.employee.Person_Number === employeeId) {
            const newAllocations = empAlloc.allocations.map(alloc => {
                if (alloc.id === allocId) {
                    return { ...alloc, weeklyFtes: { ...alloc.weeklyFtes, [weekKey]: newFte } };
                }
                return alloc;
            });
            return { ...empAlloc, allocations: newAllocations };
        }
        return empAlloc;
    }));
  };

  const handleMonthlyFteChange = (employeeId: string, allocId: string, monthlyFteValue: string) => {
    const monthlyFte = parseFloat(monthlyFteValue) || 0;
    const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    setActiveAllocations(prev => prev.map(empAlloc => {
      if (empAlloc.employee.Person_Number === employeeId) {
        const newAllocations = empAlloc.allocations.map(alloc => {
          if (alloc.id === allocId) {
            const updatedWeeklyFtes = { ...alloc.weeklyFtes };
            weeks.forEach(week => {
              const weekKey = formatDateKey(week);
              const isPast = isBefore(endOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
              const isLockedForUser = isPast && !isAdmin;
              if (!isLockedForUser) {
                updatedWeeklyFtes[weekKey] = monthlyFte;
              }
            });
            return { ...alloc, weeklyFtes: updatedWeeklyFtes };
          }
          return alloc;
        });
        return { ...empAlloc, allocations: newAllocations };
      }
      return empAlloc;
    }));
  };
  
  const handleCostCenterChange = (employeeId: string, allocId: string, newCostCenterName: string) => {
     setActiveAllocations(prev => prev.map(empAlloc => {
        if (empAlloc.employee.Person_Number === employeeId) {
            const newAllocations = empAlloc.allocations.map(alloc => {
                if (alloc.id === allocId) {
                    const selectedCc = costCenters.find(cc => cc.cost_center_name === newCostCenterName);
                    return { ...alloc, costCenterName: newCostCenterName, costCenterId: selectedCc?.cost_center_number || '' };
                }
                return alloc;
            });
            return { ...empAlloc, allocations: newAllocations };
        }
        return empAlloc;
    }));
  };

  const handleAddAllocationRow = (employeeId: string) => {
    setActiveAllocations(prev => prev.map(empAlloc => {
        if (empAlloc.employee.Person_Number === employeeId) {
            const newAlloc: AllocationRow = {
                id: `${employeeId}-new-${Date.now()}`,
                costCenterId: '',
                costCenterName: '',
                weeklyFtes: {},
            };
            return { ...empAlloc, allocations: [...empAlloc.allocations, newAlloc] };
        }
        return empAlloc;
    }));
  };

  const handleRemoveAllocationRow = (employeeId: string, allocId: string) => {
    setActiveAllocations(prev => prev.map(empAlloc => {
        if (empAlloc.employee.Person_Number === employeeId) {
            const newAllocations = empAlloc.allocations.filter(a => a.id !== allocId);
            return { ...empAlloc, allocations: newAllocations };
        }
        return empAlloc;
    }));
  };

  const handleSave = async () => {
    const submissions: any[] = [];
    let hasInvalidAllocation = false;
    
    activeAllocations.forEach(empAlloc => {
      empAlloc.allocations.forEach(alloc => {
        Object.entries(alloc.weeklyFtes).forEach(([weekKey, fte]) => {
          if (fte > 0) {
             if (!alloc.costCenterId || !alloc.costCenterName) {
                hasInvalidAllocation = true;
                toast({ variant: 'destructive', title: 'Missing Cost Center', description: `Please select a cost center for ${empAlloc.employee.Full_Name}.` });
                return;
            }
            submissions.push({
              content: {
                allocation_date: weekKey,
                allocation_name: empAlloc.employee.Full_Name,
                cost_center_name: alloc.costCenterName,
                cost_center_number: alloc.costCenterId,
                allocation_amount: fte.toString(),
              }
            });
          }
        });
      });
    });

    if (hasInvalidAllocation) return;

    if (submissions.length === 0) {
      toast({ title: 'No changes to save.' });
      return;
    }

    try {
        await Promise.all(submissions.map(entry => 
            domo.post('/domo/datastores/v1/collections/weekly_allocation/documents/', entry)
        ));
        toast({
            title: 'Allocations Saved',
            description: `${submissions.length} allocation entries have been saved successfully.`,
        });
        // We no longer clear or re-fetch here to persist the view.
        // The locking mechanism will prevent edits.
    } catch (error: any) {
        console.error("Save error:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });

  if (loading || userLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-1/4" /></CardTitle>
          <CardDescription><Skeleton className="h-4 w-1/2" /></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Monthly Allocation Grid</CardTitle>
            <CardDescription>Add employees to build your allocation plan. Past weeks are locked for non-admins.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
             <Combobox
                placeholder="Add Employee..."
                searchPlaceholder='Search employees...'
                options={availableEmployees.map(e => ({ value: e.Person_Number, label: e.Full_Name }))}
                onSelect={handleAddEmployee}
              />
            <Button variant="outline" size="icon" onClick={handlePrevWeeks}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium w-48 text-center">
              {format(weeks[0], 'MMM d')} - {format(endOfWeek(weeks[3], { weekStartsOn: 1 }), 'MMM d, yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextWeeks}><ChevronRight className="h-4 w-4" /></Button>
            <Button onClick={handleSave} disabled={activeAllocations.length === 0}>Save All</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[250px] sticky left-0 bg-card z-10">Employee / Cost Center</TableHead>
                <TableHead className="text-center min-w-[150px]">Monthly FTE</TableHead>
                {weeks.map(week => {
                  const isPast = isBefore(endOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                  const isCurrent = isSameWeek(week, today, { weekStartsOn: 1 });
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
                <TableHead className="w-[100px]"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
             {activeAllocations.length === 0 && (
                <TableRow>
                    <TableCell colSpan={weeks.length + 3} className="text-center h-24 text-muted-foreground">
                        Select an employee from the dropdown above to begin building your allocation plan.
                    </TableCell>
                </TableRow>
             )}
              {activeAllocations.map(({ employee, allocations }) => {
                const weeklyTotals = weeks.map(week => {
                  const weekKey = formatDateKey(week);
                  return allocations.reduce((total, alloc) => total + (alloc.weeklyFtes[weekKey] || 0), 0);
                });

                return (
                  <Fragment key={employee.Person_Number}>
                    <TableRow className="bg-muted/50 hover:bg-muted">
                       <TableCell className="font-semibold sticky left-0 bg-muted/50 z-10">
                        {employee.Full_Name}
                        <div className="text-xs text-muted-foreground font-normal">{employee.Market_Facing_Title}</div>
                      </TableCell>
                      <TableCell></TableCell>
                      {weeklyTotals.map((total, index) => (
                        <TableCell key={index} className={cn("text-right font-semibold", total > 1.0 ? "text-destructive" : "text-muted-foreground")}>
                          {total > 0 ? total.toFixed(2) : '-'}
                        </TableCell>
                      ))}
                      <TableCell className='text-right'>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveEmployee(employee.Person_Number)}>
                           <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {allocations.map((alloc) => {
                       const isRowLocked = weeks.some(week => {
                            const isPast = isBefore(endOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                            return isPast && !isAdmin;
                       });
                      return (
                      <TableRow key={alloc.id}>
                        <TableCell className="sticky left-0 bg-card z-10">
                          <div className="pl-6">
                            <Select value={alloc.costCenterName} onValueChange={(newCcName) => handleCostCenterChange(employee.Person_Number, alloc.id, newCcName)} disabled={isRowLocked}>
                              <SelectTrigger><SelectValue placeholder="Select Cost Center..." /></SelectTrigger>
                              <SelectContent>
                                {costCenters.map(cc => <SelectItem key={cc.cost_center_number} value={cc.cost_center_name}>{cc.cost_center_name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                           <Input
                                type="number" step="0.05" min="0" placeholder="0.00"
                                className="w-24 text-center mx-auto"
                                onChange={(e) => handleMonthlyFteChange(employee.Person_Number, alloc.id, e.target.value)}
                                disabled={isRowLocked}
                              />
                        </TableCell>
                        {weeks.map(week => {
                          const weekKey = formatDateKey(week);
                          const isPast = isBefore(endOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                          const isLockedForUser = isPast && !isAdmin;
                          return (
                            <TableCell key={week.toISOString()} className={cn("text-center", {"bg-muted/40": isPast})}>
                              <Input
                                type="number" step="0.05" min="0" placeholder="0.00"
                                className={cn("w-24 text-center mx-auto", { "bg-muted/50 cursor-not-allowed": isLockedForUser })}
                                value={alloc.weeklyFtes[weekKey] || ''}
                                onChange={(e) => handleFteChange(employee.Person_Number, alloc.id, weekKey, e.target.value)}
                                disabled={isLockedForUser} readOnly={isLockedForUser}
                              />
                            </TableCell>
                          )
                        })}
                         <TableCell className='text-right'>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveAllocationRow(employee.Person_Number, alloc.id)} disabled={allocations.length === 1 || isRowLocked}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )})}

                    <TableRow>
                      <TableCell className="sticky left-0 bg-card z-10 py-2">
                        <div className="pl-6">
                          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleAddAllocationRow(employee.Person_Number)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Allocation
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell colSpan={weeks.length + 2}></TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

    