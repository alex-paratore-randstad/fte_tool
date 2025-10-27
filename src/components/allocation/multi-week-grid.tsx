
'use client';

import { useState, useMemo, Fragment, useEffect, useCallback } from 'react';
import { addMonths, subMonths, startOfWeek, endOfWeek, format, isBefore, isSameDay } from 'date-fns';
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
import { SelectSearch } from '@/components/ui/select-search';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight, PlusCircle, Trash2, Lock } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { TeamMember } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { getWeeksForFiscalMonth, getFiscalDataForDate, getPreviousFiscalMonth, getNextFiscalMonth } from '@/lib/fiscal-calendar';

type CostCenterData = { ['cost_center_number']: string; ['cost_center_name']: string };

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
  onSaveSuccess: () => void;
};


export function MultiWeekGrid({ currentDate, setCurrentDate, onSaveSuccess }: MultiWeekGridProps) {
  const [activeAllocations, setActiveAllocations] = useState<EmployeeAllocation[]>([]);
  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [managers, setManagers] = useState<{id: string, name: string}[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [costCenterSearchTerm, setCostCenterSearchTerm] = useState('');
  const [startOfCurrentWeek, setStartOfCurrentWeek] = useState<Date | null>(null);

  const { currentUser, isManager, isAdmin, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();

  useEffect(() => {
    // Set the date only on the client side to avoid hydration errors
    setStartOfCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, []);

  const { weeks, fiscalMonthLabel } = useMemo(() => {
    if (!currentDate) return { weeks: [], fiscalMonthLabel: 'Loading...' };
    const fiscalData = getFiscalDataForDate(currentDate);
    const monthWeeks = getWeeksForFiscalMonth(currentDate);
    const label = fiscalData ? `${fiscalData.reporting_month} ${fiscalData.reporting_year}` : 'Loading...';
    return { weeks: monthWeeks, fiscalMonthLabel: label };
  }, [currentDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empResponse, ccResponse] = await Promise.all([
        fetch(`/data/v1/gbs_ind_hr_fte_report`),
        fetch(`/data/v1/gbs_ind_finance_cc_report`),
      ]);

      if (!empResponse.ok || !ccResponse.ok) {
        console.warn("Could not fetch initial data. This may be expected in local dev.");
      }
      
      const empData: TeamMember[] = empResponse.ok ? (await empResponse.json()).filter((e: TeamMember) => e.Full_Name) : [];
      const ccData: CostCenterData[] = ccResponse.ok ? (await ccResponse.json()).filter((c: CostCenterData) => c.cost_center_number && c.cost_center_name) : [];
      
      setAllEmployees(empData);
      setCostCenters(ccData);
      
      const managerMap = new Map<string, string>();
      empData.forEach(emp => {
          if(emp.First_Reviewer_Code && emp.First_Reviewer_Name) {
              managerMap.set(emp.First_Reviewer_Code, emp.First_Reviewer_Name);
          }
      });
      const uniqueManagers = Array.from(managerMap, ([id, name]) => ({ id, name }));
      setManagers(uniqueManagers);

      setActiveAllocations([]);

    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      toast({ variant: 'destructive', title: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!userLoading) {
        fetchData();
    }
  }, [fetchData, userLoading, currentUser.id]);


  const availableEmployees = useMemo(() => {
    const activeEmployeeIds = new Set(activeAllocations.map(a => a.employee.Person_Number));
    const unallocatedEmployees = allEmployees.filter(e => !activeEmployeeIds.has(e.Person_Number));
    if (!searchTerm) {
        return unallocatedEmployees;
    }
    return unallocatedEmployees.filter(e => e.Full_Name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allEmployees, activeAllocations, searchTerm]);
  
  const filteredCostCenters = useMemo(() => {
    if (!costCenterSearchTerm) {
      return costCenters;
    }
    return costCenters.filter(cc =>
      cc.cost_center_name.toLowerCase().includes(costCenterSearchTerm.toLowerCase())
    );
  }, [costCenters, costCenterSearchTerm]);

  const handlePrevMonth = () => setCurrentDate(getPreviousFiscalMonth(currentDate));
  const handleNextMonth = () => setCurrentDate(getNextFiscalMonth(currentDate));
  
  const handleAddEmployee = (employeeId: string) => {
    if (!employeeId) return;
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

  const handleAddManagerTeam = (managerId: string) => {
    if (!managerId) return;
    const directReports = allEmployees.filter(e => e.First_Reviewer_Code === managerId);
    
    const newAllocations = directReports
      .filter(employee => !activeAllocations.some(a => a.employee.Person_Number === employee.Person_Number))
      .map(employee => {
        const newAllocationRow: AllocationRow = {
          id: `${employee.Person_Number}-new-${Date.now()}`,
          costCenterId: '',
          costCenterName: '',
          weeklyFtes: {},
        };
        return {
          employee,
          allocations: [newAllocationRow],
        };
      });

    if (newAllocations.length > 0) {
      setActiveAllocations(prev => [...newAllocations, ...prev]);
      toast({ title: 'Team Loaded', description: `${newAllocations.length} employees have been added to the grid.` });
    } else {
      toast({ title: 'No new employees to add', description: 'All direct reports for this manager are already in the grid.' });
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
    if (!startOfCurrentWeek) return;
    
    setActiveAllocations(prev => {
      return prev.map(empAlloc => {
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
      });
    });
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
            fetch('/domo/datastores/v1/collections/weekly_allocation/documents/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
            }).then(res => {
                if (!res.ok) throw new Error('One or more saves failed.');
                return res.json();
            })
        ));
        toast({
            title: 'Allocations Saved',
            description: `${submissions.length} allocation entries have been saved successfully.`,
        });
        onSaveSuccess();
    } catch (error: any) {
        console.error("Save error:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  if (loading || userLoading || !startOfCurrentWeek) {
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
    );
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
             <Select onValueChange={handleAddEmployee}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Add Employee..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectSearch placeholder="Search employee..." onChange={setSearchTerm} />
                    {availableEmployees.map(e => (
                        <SelectItem key={e.Person_Number} value={e.Person_Number}>
                            {e.Full_Name}
                        </SelectItem>
                    ))}
                    {availableEmployees.length === 0 && (
                        <div className="p-4 text-sm text-center text-muted-foreground">
                            No employees found.
                        </div>
                    )}
                </SelectContent>
            </Select>
            <Select onValueChange={handleAddManagerTeam}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Load Team..." />
                </SelectTrigger>
                <SelectContent>
                    {managers.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                            {m.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handlePrevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium w-32 text-center">
              {fiscalMonthLabel}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
            <Button onClick={handleSave} disabled={activeAllocations.length === 0}>Save All</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px] sticky left-0 bg-card z-10">Employee</TableHead>
                <TableHead className="min-w-[250px]">Cost Center Name</TableHead>
                <TableHead className="min-w-[150px]">Cost Center Code</TableHead>
                <TableHead className="text-center min-w-[150px]">Bulk Hours Entry</TableHead>
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
                <TableHead className="w-[100px]"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
             {activeAllocations.length === 0 && (
                <TableRow>
                    <TableCell colSpan={weeks.length + 5} className="text-center h-24 text-muted-foreground">
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
                      <TableCell colSpan={2}></TableCell>
                      <TableCell></TableCell>
                      {weeklyTotals.map((total, index) => (
                        <TableCell key={index} className={cn("text-center font-semibold", total > 1.0 ? "text-destructive" : "text-muted-foreground")}>
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
                        <TableCell className="sticky left-0 bg-card z-10"></TableCell>
                        <TableCell>
                          <Select value={alloc.costCenterName} onValueChange={(newCcName) => handleCostCenterChange(employee.Person_Number, alloc.id, newCcName)} disabled={isRowLocked}>
                            <SelectTrigger><SelectValue placeholder="Select Cost Center..." /></SelectTrigger>
                            <SelectContent>
                              <SelectSearch placeholder="Search cost center..." onChange={setCostCenterSearchTerm} />
                              {filteredCostCenters.map(cc => <SelectItem key={cc.cost_center_number} value={cc.cost_center_name}>{cc.cost_center_name}</SelectItem>)}
                               {filteredCostCenters.length === 0 && (
                                <div className="p-4 text-sm text-center text-muted-foreground">
                                    No cost centers found.
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                         <TableCell>
                            <Input
                                value={alloc.costCenterId}
                                readOnly
                                className="bg-muted"
                                placeholder="CC Code"
                            />
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
                           const isCurrent = isSameDay(startOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                          const isLockedForUser = isPast && !isAdmin;
                          return (
                            <TableCell key={week.toISOString()} className={cn("text-center", {"bg-muted/40": isPast, "bg-primary/10": isCurrent})}>
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
                      <TableCell className="sticky left-0 bg-card z-10 py-2" colSpan={3}>
                        <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleAddAllocationRow(employee.Person_Number)}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Allocation
                        </Button>
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

    

    
