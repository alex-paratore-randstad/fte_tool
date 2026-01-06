
'use client';

import { useState, useMemo, Fragment, useEffect, useCallback } from 'react';
import { startOfWeek, endOfWeek, format, isBefore, isSameDay } from 'date-fns';
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
import { ChevronLeft, ChevronRight, PlusCircle, Trash2, Lock, History, Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { TeamMember, WeeklyAllocation } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { getWeeksForFiscalMonth, getFiscalDataForDate, getPreviousFiscalMonth, getNextFiscalMonth, type FiscalWeek } from '@/lib/fiscal-calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

type AiReportData = {
    Code: string;
    Name: string;
    DisplayName: string;
    RollsUpTo: string;
};

const formatDateKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

type AllocationRow = {
  id: string;
  clientId: string;
  clientName: string;
  weeklyFtes: { [weekKey: string]: number };
};

type EmployeeAllocation = {
  employee: TeamMember;
  allocations: AllocationRow[];
};

type MultiWeekGridProps = {
  currentDate: Date | null;
  setCurrentDate: (date: Date) => void;
  onSaveSuccess: () => void;
  initialLoading: boolean;
};

// New self-contained component for the Client dropdown
const ClientSelect = ({ 
  clients, 
  value, 
  onValueChange,
  disabled
}: { 
  clients: AiReportData[], 
  value: string, 
  onValueChange: (value: string) => void,
  disabled?: boolean 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredClients = useMemo(() => {
    // Create a stable sort: special clients first, then alphabetical.
    const sorted = [...clients].sort((a, b) => {
      const specialClients = ['PTO', 'Unallocated'];
      const aIsSpecial = specialClients.includes(a.DisplayName);
      const bIsSpecial = specialClients.includes(b.DisplayName);

      if (aIsSpecial && !bIsSpecial) return -1;
      if (!aIsSpecial && bIsSpecial) return 1;
      
      // If both are special or both are not, sort by name.
      // Give 'Unallocated' a slight edge over 'PTO' if both present
      if (aIsSpecial && bIsSpecial) {
          return a.DisplayName === 'Unallocated' ? -1 : 1;
      }
      
      return a.DisplayName.localeCompare(b.DisplayName);
    });

    if (!searchTerm) {
      return sorted;
    }
    return sorted.filter(cc =>
      cc.DisplayName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger><SelectValue placeholder="Select Client..." /></SelectTrigger>
      <SelectContent>
        <SelectSearch placeholder="Search client..." onChange={setSearchTerm} />
        {filteredClients.map(cc => <SelectItem key={cc.Code} value={cc.DisplayName}>{cc.DisplayName}</SelectItem>)}
         {filteredClients.length === 0 && (
          <div className="p-4 text-sm text-center text-muted-foreground">
              No clients found.
          </div>
        )}
      </SelectContent>
    </Select>
  );
};

// New self-contained component for the Employee dropdown
const EmployeeSelect = ({ 
  employees, 
  onValueChange,
  value
}: { 
  employees: TeamMember[], 
  onValueChange: (value: string) => void,
  value: string,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredEmployees = useMemo(() => {
    const sortedEmployees = employees.sort((a,b) => a.Full_Name.localeCompare(b.Full_Name));
    if (!searchTerm) {
      return sortedEmployees;
    }
    return sortedEmployees.filter(e => e.Full_Name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [employees, searchTerm]);

  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Load Employee..." />
      </SelectTrigger>
      <SelectContent>
          <SelectSearch placeholder="Search employee..." onChange={setSearchTerm} />
          {filteredEmployees.map(e => (
              <SelectItem key={e.Person_Number} value={e.Person_Number}>
                  {e.Full_Name}
              </SelectItem>
          ))}
          {filteredEmployees.length === 0 && (
              <div className="p-4 text-sm text-center text-muted-foreground">
                  No employees found.
              </div>
          )}
      </SelectContent>
    </Select>
  );
};

// New self-contained component for the Manager dropdown
const ManagerSelect = ({ 
  managers, 
  onValueChange 
}: { 
  managers: {id: string, name: string}[], 
  onValueChange: (value: string) => void 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredManagers = useMemo(() => {
    const sortedManagers = managers.sort((a,b) => a.name.localeCompare(b.name));
    if (!searchTerm) {
      return sortedManagers;
    }
    return sortedManagers.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [managers, searchTerm]);

  return (
    <Select onValueChange={onValueChange}>
        <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Load Team..." />
        </SelectTrigger>
        <SelectContent>
            <SelectSearch placeholder="Search manager..." onChange={setSearchTerm} />
            {filteredManagers.map(m => (
                <SelectItem key={m.id} value={m.id}>
                    {m.name}
                </SelectItem>
            ))}
             {filteredManagers.length === 0 && (
              <div className="p-4 text-sm text-center text-muted-foreground">
                  No managers found.
              </div>
            )}
        </SelectContent>
    </Select>
  );
};


export function MultiWeekGrid({ currentDate, setCurrentDate, onSaveSuccess, initialLoading }: MultiWeekGridProps) {
  const [activeAllocations, setActiveAllocations] = useState<EmployeeAllocation[]>([]);
  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [managers, setManagers] = useState<{id: string, name: string}[]>([]);
  const [clients, setClients] = useState<AiReportData[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [startOfCurrentWeek, setStartOfCurrentWeek] = useState<Date | null>(null);
  const [selectedEmployeeToAdd, setSelectedEmployeeToAdd] = useState('');
  const [isCopyingPrior, setIsCopyingPrior] = useState<Record<string, boolean>>({});

  const { currentUser, isAdmin, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();

  useEffect(() => {
    // Set the date only on the client side to avoid hydration errors
    setStartOfCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, []);

  const { weeks, fiscalMonthLabel } = useMemo(() => {
    if (!currentDate) return { weeks: [], fiscalMonthLabel: 'Loading...' };
    const fiscalData = getFiscalDataForDate(currentDate);
    const monthWeeks: FiscalWeek[] = getWeeksForFiscalMonth(currentDate);
    const label = fiscalData ? `${fiscalData.Reporting_Month} ${fiscalData.Reporting_Year}` : 'Loading...';
    return { weeks: monthWeeks, fiscalMonthLabel: label };
  }, [currentDate]);

  const fetchData = useCallback(async () => {
    setInternalLoading(true);
    try {
      const [empResponse, clientResponse] = await Promise.all([
        fetch(`/data/v1/gbs_ind_hr_fte_report`),
        fetch(`/data/v1/ai_report`),
      ]);

      if (!empResponse.ok || !clientResponse.ok) {
        console.warn("Could not fetch initial data. This may be expected in local dev.");
      }
      
      const empData: TeamMember[] = empResponse.ok ? (await empResponse.json()).filter((e: TeamMember) => e.Full_Name).sort((a, b) => a.Full_Name.localeCompare(b.Full_Name)) : [];
      const clientData: AiReportData[] = clientResponse.ok ? (await clientResponse.json()).filter((c: AiReportData) => c.Code && c.DisplayName) : [];
      
      setAllEmployees(empData);
      
      const staticClients: AiReportData[] = [
        { Code: 'UNALLOCATED', Name: 'Unallocated', DisplayName: 'Unallocated', RollsUpTo: '' },
        { Code: 'PTO', Name: 'PTO', DisplayName: 'PTO', RollsUpTo: '' },
      ];
      setClients([...staticClients, ...clientData]);
      
      const managerMap = new Map<string, string>();
      empData.forEach(emp => {
          if(emp.First_Reviewer_Code && emp.First_Reviewer_Name) {
              managerMap.set(emp.First_Reviewer_Code, emp.First_Reviewer_Name);
          }
      });
      const uniqueManagers = Array.from(managerMap, ([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setManagers(uniqueManagers);

      setActiveAllocations([]);

    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      toast({ variant: 'destructive', title: 'Failed to fetch data' });
    } finally {
      setInternalLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!userLoading) {
        fetchData();
    }
  }, [fetchData, userLoading, currentUser.id]);


  const availableEmployees = useMemo(() => {
    const activeEmployeeIds = new Set(activeAllocations.map(a => a.employee.Person_Number));
    return allEmployees.filter(e => !activeEmployeeIds.has(e.Person_Number));
  }, [allEmployees, activeAllocations]);

  const handlePrevMonth = () => {
    if (currentDate) setCurrentDate(getPreviousFiscalMonth(currentDate));
  };
  const handleNextMonth = () => {
    if (currentDate) setCurrentDate(getNextFiscalMonth(currentDate));
  };

  const fetchAndApplyPreviousMonthAllocations = useCallback(async (employee: TeamMember) => {
    if (!currentDate) return;
    
    setIsCopyingPrior(prev => ({ ...prev, [employee.Person_Number]: true }));

    const prevMonthDate = getPreviousFiscalMonth(currentDate);
    const prevMonthWeeks = getWeeksForFiscalMonth(prevMonthDate);
    if (prevMonthWeeks.length === 0) {
      setIsCopyingPrior(prev => ({ ...prev, [employee.Person_Number]: false }));
      return;
    }
  
    try {
      const allPrevMonthAllocations: WeeklyAllocation[] = [];
      for (const weekKey of prevMonthWeeks.map(w => formatDateKey(w.startDate))) {
        const response = await fetch(`/domo/datastores/v1/collections/weekly_allocation/documents?q=content.allocation_date='${weekKey}'`);
        if (response.ok) {
            allPrevMonthAllocations.push(...(await response.json()));
        } else {
            console.warn(`No allocations found for ${weekKey}`);
        }
      }
      
      const employeeAllocations = allPrevMonthAllocations.filter(alloc => 
        alloc.content.allocation_name.includes(`[${employee.Person_Number}]`)
      );
      
      if (employeeAllocations.length === 0) {
        toast({ title: "No prior allocations found", description: `No data available for ${employee.Full_Name} in the previous month.` });
        return;
      }
  
      const clientAllocationsMap = new Map<string, { clientName: string, weeklyFtes: Map<string, number> }>();
  
      employeeAllocations.forEach(alloc => {
          const clientKey = alloc.content.cost_center_number;
          if (!clientAllocationsMap.has(clientKey)) {
              clientAllocationsMap.set(clientKey, { 
                  clientName: alloc.content.cost_center_name,
                  weeklyFtes: new Map<string, number>()
              });
          }
          const fte = parseFloat(alloc.content.allocation_amount);
          clientAllocationsMap.get(clientKey)!.weeklyFtes.set(alloc.content.allocation_date, fte);
      });
      
      const newAllocationRows: AllocationRow[] = [];
      clientAllocationsMap.forEach((data, clientId) => {
        const newRow: AllocationRow = {
          id: `${employee.Person_Number}-${clientId}-${Date.now()}`,
          clientId: clientId,
          clientName: data.clientName,
          weeklyFtes: {},
        };
        
        weeks.forEach((currentWeek, index) => {
            if (index < prevMonthWeeks.length) {
                const sourceWeekKey = formatDateKey(prevMonthWeeks[index].startDate);
                if (data.weeklyFtes.has(sourceWeekKey)) {
                    const fte = data.weeklyFtes.get(sourceWeekKey)!;
                    newRow.weeklyFtes[formatDateKey(currentWeek.startDate)] = fte;
                }
            }
        });
        newAllocationRows.push(newRow);
      });
  
      if (newAllocationRows.length > 0) {
        setActiveAllocations(prev =>
          prev.map(empAlloc =>
            empAlloc.employee.Person_Number === employee.Person_Number
              ? { ...empAlloc, allocations: newAllocationRows }
              : empAlloc
          )
        );
         toast({ title: `Prior Allocations Loaded`, description: `Loaded previous month's data for ${employee.Full_Name}.`});
      } else {
        toast({ title: "No applicable prior allocations found", description: `No data from the previous month could be applied for ${employee.Full_Name}.` });
      }
  
    } catch (error) {
        console.error('Failed to fetch previous month allocations:', error);
        toast({ variant: 'destructive', title: 'Error Loading Prior Data', description: `Could not load allocations for ${employee.Full_Name}.`});
    } finally {
      setIsCopyingPrior(prev => ({ ...prev, [employee.Person_Number]: false }));
    }
  
  }, [currentDate, weeks, toast]);
  
  const handleAddEmployee = (employeeId: string) => {
    if (!employeeId) return;

    setSelectedEmployeeToAdd(employeeId); // Keep the select controlled

    const employeeToAdd = allEmployees.find(e => e.Person_Number === employeeId);
    
    if (employeeToAdd) {
      const isAlreadyActive = activeAllocations.some(a => a.employee.Person_Number === employeeId);
      if (isAlreadyActive) {
          toast({ variant: 'destructive', title: 'Employee already in grid' });
          return;
      }
      const newAllocationRow: AllocationRow = {
        id: `${employeeId}-new-${Date.now()}`,
        clientId: '',
        clientName: '',
        weeklyFtes: {},
      };
      
      setActiveAllocations(prev => [{
        employee: employeeToAdd,
        allocations: [newAllocationRow]
      }, ...prev]);
    }
    // Reset the select after adding
    setTimeout(() => setSelectedEmployeeToAdd(''), 0);
  };

  const handleAddManagerTeam = (managerId: string) => {
    if (!managerId) return;
    const directReports = allEmployees.filter(e => e.First_Reviewer_Code === managerId);
    
    const newAllocations = directReports
      .filter(employee => !activeAllocations.some(a => a.employee.Person_Number === employee.Person_Number))
      .map(employee => {
        const newAllocationRow: AllocationRow = {
          id: `${employee.Person_Number}-new-${Date.now()}`,
          clientId: '',
          clientName: '',
          weeklyFtes: {},
        };
        return {
          employee,
          allocations: [newAllocationRow],
        };
      });

    if (newAllocations.length > 0) {
      setActiveAllocations(prev => [...newAllocations, ...prev]);
      toast({ title: 'Team Loaded', description: `${newAllocations.length} employees have been added.` });
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
    if (!startOfCurrentWeek) return;
    const monthlyFte = parseFloat(monthlyFteValue) || 0;
    
    setActiveAllocations(prev => {
      return prev.map(empAlloc => {
        if (empAlloc.employee.Person_Number === employeeId) {
          const newAllocations = empAlloc.allocations.map(alloc => {
            if (alloc.id === allocId) {
              const updatedWeeklyFtes = { ...alloc.weeklyFtes };
              weeks.forEach(week => {
                const weekKey = formatDateKey(week.startDate);
                const isPast = isBefore(endOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek);
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
  
  const handleClientChange = (employeeId: string, allocId: string, newClientName: string) => {
     setActiveAllocations(prev => prev.map(empAlloc => {
        if (empAlloc.employee.Person_Number === employeeId) {
            const newAllocations = empAlloc.allocations.map(alloc => {
                if (alloc.id === allocId) {
                    const selectedCc = clients.find(cc => cc.DisplayName === newClientName);
                    return { ...alloc, clientName: newClientName, clientId: selectedCc?.Code || '' };
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
                clientId: '',
                clientName: '',
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
             if (!alloc.clientId || !alloc.clientName) {
                hasInvalidAllocation = true;
                toast({ variant: 'destructive', title: 'Missing Client', description: `Please select a client for ${empAlloc.employee.Full_Name}.` });
                return;
            }
            submissions.push({
              content: {
                allocation_date: weekKey,
                allocation_name: `[${empAlloc.employee.Person_Number}] ${empAlloc.employee.Full_Name}`,
                employee_id: empAlloc.employee.Person_Number,
                cost_center_name: alloc.clientName,
                cost_center_number: alloc.clientId,
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

  const isLoading = initialLoading || internalLoading || userLoading;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Monthly Allocation Grid</CardTitle>
              <CardDescription>Add employees to build your allocation plan. Past weeks are locked for non-admins.</CardDescription>
            </div>
            {isLoading ? (
              <div className="flex items-center gap-2 flex-wrap">
                <Skeleton className="h-10 w-[200px]" />
                <Skeleton className="h-10 w-[200px]" />
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-24" />
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <EmployeeSelect 
                    employees={availableEmployees} 
                    onValueChange={handleAddEmployee}
                    value={selectedEmployeeToAdd}
                />
                <ManagerSelect managers={managers} onValueChange={handleAddManagerTeam} />
                <Button variant="outline" size="icon" onClick={handlePrevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm font-medium w-32 text-center">
                  {fiscalMonthLabel}
                </span>
                <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
                <Button onClick={handleSave} disabled={activeAllocations.length === 0}>Save All</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px] sticky left-0 bg-card z-10">Employee</TableHead>
                    <TableHead className="min-w-[200px]">Client Name</TableHead>
                    <TableHead className="p-2 w-28">Client Code</TableHead>
                    <TableHead className="text-center min-w-[120px]">Bulk Entry</TableHead>
                    {weeks.map(week => {
                      const isPast = startOfCurrentWeek ? isBefore(endOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek) : false;
                      const isCurrent = startOfCurrentWeek ? isSameDay(startOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek) : false;
                      const isLockedForUser = isPast && !isAdmin;
                      return (
                        <TableHead key={week.startDate.toISOString()} className={cn("text-center min-w-[120px] transition-colors", { "bg-muted/40": isPast, "bg-primary/10": isCurrent })}>
                          <div className='flex items-center justify-center gap-2'>
                            {isLockedForUser && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span>W/E {week.reportingWeekDate}</span>
                          </div>
                          {isCurrent && <Badge variant="default" className="w-fit mx-auto mt-1">Current</Badge>}
                        </TableHead>
                      )
                    })}
                    <TableHead className="w-[80px]"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeAllocations.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={weeks.length + 5} className="text-center h-24 text-muted-foreground">
                            Select an employee from the dropdown above to begin building your allocation plan.
                        </TableCell>
                    </TableRow>
                  ) : activeAllocations.map(({ employee, allocations }) => {
                    const weeklyTotals = weeks.map(week => {
                      const weekKey = formatDateKey(week.startDate);
                      return allocations.reduce((total, alloc) => total + (alloc.weeklyFtes[weekKey] || 0), 0);
                    });

                    return (
                      <Fragment key={employee.Person_Number}>
                        <TableRow className="bg-muted/50 hover:bg-muted">
                          <TableCell className="font-semibold sticky left-0 bg-muted/50 z-10">
                            {employee.Full_Name}
                            <div className="text-xs text-muted-foreground font-normal">{employee.Market_Facing_Title}</div>
                          </TableCell>
                          <TableCell colSpan={3}></TableCell>
                          {weeklyTotals.map((total, index) => {
                              const isPartTime = employee.Employment_Mode?.includes('PT');
                              const isOverallocated = total > 1.0;
                              const isPartTimeWarning = isPartTime && total >= 0.8 && total <= 1.0;
                              
                              let tooltipMessage = '';
                              if (isOverallocated) {
                                tooltipMessage = 'Employee allocated over 1.0 FTE.';
                              } else if (isPartTimeWarning) {
                                tooltipMessage = 'Part-time employee allocated at or above 0.8 FTE.';
                              }

                              return (
                                <TableCell key={index} className="text-center font-semibold">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className={cn(
                                                "text-muted-foreground",
                                                isPartTimeWarning && "text-warning",
                                                isOverallocated && "text-destructive"
                                            )}>
                                                {total > 0 ? total.toFixed(2) : '-'}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                           <p>{tooltipMessage || ''}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TableCell>
                              )
                          })}
                          <TableCell className='text-right'>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveEmployee(employee.Person_Number)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>

                        {allocations.map((alloc) => {
                          const isRowLocked = startOfCurrentWeek ? weeks.some(week => {
                                const isPast = isBefore(endOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek);
                                return isPast && !isAdmin;
                          }) : false;
                          return (
                          <TableRow key={alloc.id}>
                            <TableCell className="sticky left-0 bg-card z-10"></TableCell>
                            <TableCell>
                              <ClientSelect
                                  clients={clients}
                                  value={alloc.clientName}
                                  onValueChange={(newCcName) => handleClientChange(employee.Person_Number, alloc.id, newCcName)}
                                  disabled={isRowLocked}
                              />
                            </TableCell>
                            <TableCell className="p-2">
                                <Input
                                    value={alloc.clientId}
                                    readOnly
                                    className="bg-muted w-24"
                                    placeholder="Code"
                                />
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                    type="number" step="0.05" min="0" placeholder="0.00"
                                    className="w-20 text-center mx-auto"
                                    value={alloc.weeklyFtes[formatDateKey(weeks[0]?.startDate)] || ''}
                                    onChange={(e) => handleMonthlyFteChange(employee.Person_Number, alloc.id, e.target.value)}
                                    disabled={isRowLocked}
                                  />
                            </TableCell>
                            {weeks.map(week => {
                              const weekKey = formatDateKey(week.startDate);
                              const isPast = startOfCurrentWeek ? isBefore(endOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek) : false;
                              const isCurrent = startOfCurrentWeek ? isSameDay(startOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek) : false;
                              const isLockedForUser = isPast && !isAdmin;
                              const fteValue = alloc.weeklyFtes[weekKey];
                              return (
                                <TableCell key={week.startDate.toISOString()} className={cn("text-center", {"bg-muted/40": isPast, "bg-primary/10": isCurrent})}>
                                  <Input
                                    type="number" step="0.05" min="0" placeholder="0.00"
                                    className={cn("w-20 text-center mx-auto", { "bg-muted/50 cursor-not-allowed": isLockedForUser })}
                                    value={fteValue || ''}
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
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleAddAllocationRow(employee.Person_Number)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Allocation
                              </Button>
                               <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => fetchAndApplyPreviousMonthAllocations(employee)} disabled={isCopyingPrior[employee.Person_Number]}>
                                <History className={cn("mr-2 h-4 w-4", isCopyingPrior[employee.Person_Number] && "hidden")} />
                                <Loader2 className={cn("mr-2 h-4 w-4 animate-spin", !isCopyingPrior[employee.Person_Number] && "hidden")} />
                                <span className={cn(isCopyingPrior[employee.Person_Number] && "hidden")}>Load Prior Allocations</span>
                                <span className={cn(!isCopyingPrior[employee.Person_Number] && "hidden")}>Loading...</span>
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
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
