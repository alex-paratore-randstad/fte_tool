
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
import { ChevronLeft, ChevronRight, PlusCircle, Trash2, Lock } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { TeamMember } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { getWeeksForFiscalMonth, getFiscalDataForDate, getPreviousFiscalMonth, getNextFiscalMonth, type FiscalWeek } from '@/lib/fiscal-calendar';

type AiReportData = {
    Code: string;
    Name: string;
    DisplayName: string;
    RollsUpTo: string;
};

const formatDateKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

type TargetRow = {
  id: string;
  clientId: string;
  clientName: string;
  weeklyTargets: { [weekKey: string]: number };
};

type EmployeeTarget = {
  employee: TeamMember;
  targets: TargetRow[];
};

type MultiWeekTargetGridProps = {
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
  value,
  disabled
}: { 
  employees: TeamMember[], 
  onValueChange: (value: string) => void,
  value: string,
  disabled?: boolean
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
    <Select onValueChange={onValueChange} value={value} disabled={disabled}>
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
  onValueChange,
  disabled
}: { 
  managers: {id: string, name: string}[], 
  onValueChange: (value: string) => void,
  disabled?: boolean
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
    <Select onValueChange={onValueChange} disabled={disabled}>
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


export function MultiWeekTargetGrid({ currentDate, setCurrentDate, onSaveSuccess, initialLoading }: MultiWeekTargetGridProps) {
  const [activeTargets, setActiveTargets] = useState<EmployeeTarget[]>([]);
  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [managers, setManagers] = useState<{id: string, name: string}[]>([]);
  const [clients, setClients] = useState<AiReportData[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [startOfCurrentWeek, setStartOfCurrentWeek] = useState<Date | null>(null);
  const [selectedEmployeeToAdd, setSelectedEmployeeToAdd] = useState('');

  const { currentUser, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  
  const isLoading = initialLoading || internalLoading || userLoading;

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

      setActiveTargets([]);

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
    const activeEmployeeIds = new Set(activeTargets.map(a => a.employee.Person_Number));
    return allEmployees.filter(e => !activeEmployeeIds.has(e.Person_Number));
  }, [allEmployees, activeTargets]);

  const handlePrevMonth = () => {
    if (currentDate) setCurrentDate(getPreviousFiscalMonth(currentDate));
  };
  const handleNextMonth = () => {
    if (currentDate) setCurrentDate(getNextFiscalMonth(currentDate));
  };
  
  const handleAddEmployee = (employeeId: string) => {
    if (!employeeId) return;

    setSelectedEmployeeToAdd(employeeId); // Keep the select controlled

    const employeeToAdd = allEmployees.find(e => e.Person_Number === employeeId);
    
    if (employeeToAdd) {
      const isAlreadyActive = activeTargets.some(a => a.employee.Person_Number === employeeId);
      if (isAlreadyActive) {
          toast({ variant: 'destructive', title: 'Employee already in grid' });
          return;
      }
      const newTargetRow: TargetRow = {
        id: `${employeeId}-new-${Date.now()}`,
        clientId: '',
        clientName: '',
        weeklyTargets: {},
      };
      
      setActiveTargets(prev => [{
        employee: employeeToAdd,
        targets: [newTargetRow]
      }, ...prev]);
    }
    // Reset the select after adding
    setTimeout(() => setSelectedEmployeeToAdd(''), 0);
  };

  const handleAddManagerTeam = (managerId: string) => {
    if (!managerId) return;
    const directReports = allEmployees.filter(e => e.First_Reviewer_Code === managerId);
    
    const newTargets = directReports
      .filter(employee => !activeTargets.some(a => a.employee.Person_Number === employee.Person_Number))
      .map(employee => {
        const newTargetRow: TargetRow = {
          id: `${employee.Person_Number}-new-${Date.now()}`,
          clientId: '',
          clientName: '',
          weeklyTargets: {},
        };
        return {
          employee,
          targets: [newTargetRow],
        };
      });

    if (newTargets.length > 0) {
      setActiveTargets(prev => [...newTargets, ...prev]);
      toast({ title: 'Team Loaded', description: `${newTargets.length} employees have been added to the grid.` });
    } else {
      toast({ title: 'No new employees to add', description: 'All direct reports for this manager are already in the grid.' });
    }
  };


  const handleRemoveEmployee = (employeeId: string) => {
    setActiveTargets(prev => prev.filter(a => a.employee.Person_Number !== employeeId));
  };
  
  const handleTargetChange = (employeeId: string, allocId: string, weekKey: string, newTargetValue: string) => {
    const newTarget = parseInt(newTargetValue, 10) || 0;
    setActiveTargets(prev => prev.map(empAlloc => {
        if (empAlloc.employee.Person_Number === employeeId) {
            const newTargets = empAlloc.targets.map(alloc => {
                if (alloc.id === allocId) {
                    return { ...alloc, weeklyTargets: { ...alloc.weeklyTargets, [weekKey]: newTarget } };
                }
                return alloc;
            });
            return { ...empAlloc, targets: newTargets };
        }
        return empAlloc;
    }));
  };

  const handleMonthlyTargetChange = (employeeId: string, allocId: string, monthlyTargetValue: string) => {
    if (!startOfCurrentWeek) return;
    const monthlyTarget = parseInt(monthlyTargetValue, 10) || 0;
    
    setActiveTargets(prev => {
      return prev.map(empAlloc => {
        if (empAlloc.employee.Person_Number === employeeId) {
          const newTargets = empAlloc.targets.map(alloc => {
            if (alloc.id === allocId) {
              const updatedWeeklyTargets = { ...alloc.weeklyTargets };
              weeks.forEach(week => {
                const weekKey = formatDateKey(week.startDate);
                 updatedWeeklyTargets[weekKey] = monthlyTarget;
              });
              return { ...alloc, weeklyTargets: updatedWeeklyTargets };
            }
            return alloc;
          });
          return { ...empAlloc, targets: newTargets };
        }
        return empAlloc;
      });
    });
  };
  
  const handleClientChange = (employeeId: string, allocId: string, newClientName: string) => {
     setActiveTargets(prev => prev.map(empAlloc => {
        if (empAlloc.employee.Person_Number === employeeId) {
            const newTargets = empAlloc.targets.map(alloc => {
                if (alloc.id === allocId) {
                    const selectedCc = clients.find(cc => cc.DisplayName === newClientName);
                    return { ...alloc, clientName: newClientName, clientId: selectedCc?.Code || '' };
                }
                return alloc;
            });
            return { ...empAlloc, targets: newTargets };
        }
        return empAlloc;
    }));
  };

  const handleAddTargetRow = (employeeId: string) => {
    setActiveTargets(prev => prev.map(empAlloc => {
        if (empAlloc.employee.Person_Number === employeeId) {
            const newAlloc: TargetRow = {
                id: `${employeeId}-new-${Date.now()}`,
                clientId: '',
                clientName: '',
                weeklyTargets: {},
            };
            return { ...empAlloc, targets: [...empAlloc.targets, newAlloc] };
        }
        return empAlloc;
    }));
  };

  const handleRemoveTargetRow = (employeeId: string, allocId: string) => {
    setActiveTargets(prev => prev.map(empAlloc => {
        if (empAlloc.employee.Person_Number === employeeId) {
            const newTargets = empAlloc.targets.filter(a => a.id !== allocId);
            return { ...empAlloc, targets: newTargets };
        }
        return empAlloc;
    }));
  };

  const handleSave = async () => {
    const submissions: any[] = [];
    let hasInvalidTarget = false;
    
    activeTargets.forEach(empAlloc => {
      empAlloc.targets.forEach(alloc => {
        Object.entries(alloc.weeklyTargets).forEach(([weekKey, target]) => {
          if (target > 0) {
             if (!alloc.clientId || !alloc.clientName) {
                hasInvalidTarget = true;
                toast({ variant: 'destructive', title: 'Missing Client', description: `Please select a client for ${empAlloc.employee.Full_Name}.` });
                return;
            }
            submissions.push({
              content: {
                target_date: weekKey,
                target_name: `[${empAlloc.employee.Person_Number}] ${empAlloc.employee.Full_Name}`,
                target_cost_center_name: alloc.clientName,
                target_cost_center_number: alloc.clientId,
                target_amount: target.toString(),
              }
            });
          }
        });
      });
    });

    if (hasInvalidTarget) return;

    if (submissions.length === 0) {
      toast({ title: 'No changes to save.' });
      return;
    }

    try {
        await Promise.all(submissions.map(entry => 
            fetch('/domo/datastores/v1/collections/weekly_targets/documents/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
            }).then(res => {
                if (!res.ok) throw new Error('One or more saves failed.');
                return res.json();
            })
        ));
        toast({
            title: 'Targets Saved',
            description: `${submissions.length} target entries have been saved successfully.`,
        });
        onSaveSuccess();
    } catch (error: any) {
        console.error("Save error:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Monthly Target Grid</CardTitle>
            <CardDescription>Add employees to build your hiring target plan.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <EmployeeSelect 
                employees={availableEmployees} 
                onValueChange={handleAddEmployee}
                value={selectedEmployeeToAdd}
                disabled={isLoading}
            />
            <ManagerSelect 
                managers={managers} 
                onValueChange={handleAddManagerTeam} 
                disabled={isLoading}
            />
            <Button variant="outline" size="icon" onClick={handlePrevMonth} disabled={isLoading}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium w-32 text-center">
              {isLoading ? <Skeleton className="h-5 w-24 mx-auto" /> : fiscalMonthLabel}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isLoading}><ChevronRight className="h-4 w-4" /></Button>
            <Button onClick={handleSave} disabled={isLoading || activeTargets.length === 0}>Save All</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px] sticky left-0 bg-card z-10">Employee</TableHead>
                  <TableHead className="min-w-[200px]">Client Name</TableHead>
                  <TableHead className="text-center min-w-[120px]">Bulk Entry</TableHead>
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
                  <TableHead className="w-[80px]"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={weeks.length + 4}>
                    <div className="space-y-4 py-8">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : activeTargets.length === 0 ? (
                  <TableRow>
                      <TableCell colSpan={weeks.length + 4} className="text-center h-24 text-muted-foreground">
                          Select an employee from the dropdown above to begin building your target plan.
                      </TableCell>
                  </TableRow>
              ) : activeTargets.map(({ employee, targets }) => {
                  const weeklyTotals = weeks.map(week => {
                    const weekKey = formatDateKey(week.startDate);
                    return targets.reduce((total, alloc) => total + (alloc.weeklyTargets[weekKey] || 0), 0);
                  });

                  return (
                    <Fragment key={employee.Person_Number}>
                      <TableRow className="bg-muted/50 hover:bg-muted">
                        <TableCell className="font-semibold sticky left-0 bg-muted/50 z-10">
                          {employee.Full_Name}
                          <div className="text-xs text-muted-foreground font-normal">{employee.Market_Facing_Title}</div>
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                        {weeklyTotals.map((total, index) => (
                          <TableCell key={index} className="text-center font-semibold text-muted-foreground">
                            {total > 0 ? total : '-'}
                          </TableCell>
                        ))}
                        <TableCell className='text-right'>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveEmployee(employee.Person_Number)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>

                      {targets.map((alloc) => (
                        <TableRow key={alloc.id}>
                          <TableCell className="sticky left-0 bg-card z-10"></TableCell>
                          <TableCell>
                            <ClientSelect
                                clients={clients}
                                value={alloc.clientName}
                                onValueChange={(newCcName) => handleClientChange(employee.Person_Number, alloc.id, newCcName)}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                                  type="number" step="1" min="0" placeholder="0"
                                  className="w-20 text-center mx-auto"
                                  value={alloc.weeklyTargets[formatDateKey(weeks[0]?.startDate)] || ''}
                                  onChange={(e) => handleMonthlyTargetChange(employee.Person_Number, alloc.id, e.target.value)}
                                />
                          </TableCell>
                          {weeks.map(week => {
                            const weekKey = formatDateKey(week.startDate);
                            const isCurrent = startOfCurrentWeek ? isSameDay(startOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek) : false;
                            const targetValue = alloc.weeklyTargets[weekKey];
                            return (
                              <TableCell key={week.startDate.toISOString()} className={cn("text-center", {"bg-primary/10": isCurrent})}>
                                <Input
                                  type="number" step="1" min="0" placeholder="0"
                                  className="w-20 text-center mx-auto"
                                  value={targetValue || ''}
                                  onChange={(e) => handleTargetChange(employee.Person_Number, alloc.id, weekKey, e.target.value)}
                                />
                              </TableCell>
                            )
                          })}
                          <TableCell className='text-right'>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveTargetRow(employee.Person_Number, alloc.id)} disabled={targets.length === 1}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                      <TableRow>
                        <TableCell className="sticky left-0 bg-card z-10 py-2" colSpan={2}>
                          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleAddTargetRow(employee.Person_Number)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Target
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
