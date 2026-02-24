
'use client';

import { useState, useMemo, Fragment, useEffect, useCallback, useRef } from 'react';
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
import { ChevronLeft, ChevronRight, PlusCircle, Trash2, Lock, Copy } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { TeamMember, WeeklyAllocation } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { getWeeksForFiscalMonth, getFiscalDataForDate, getPreviousFiscalMonth, getNextFiscalMonth, type FiscalWeek } from '@/lib/fiscal-calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { v4 as uuidv4 } from 'uuid';
import { writeLog } from '@/lib/logger';
import { ScrollArea } from '@/components/ui/scroll-area';

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
      
      return (a.DisplayName || '').localeCompare(b.DisplayName || '');
    });

    if (!searchTerm) {
      return sorted;
    }
    return sorted.filter(cc =>
      cc.DisplayName && cc.DisplayName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger><SelectValue placeholder="Select Client..." /></SelectTrigger>
      <SelectContent>
        <SelectSearch placeholder="Search client..." onChange={setSearchTerm} />
        <ScrollArea className="h-64">
          {filteredClients.map(cc => <SelectItem key={cc.Code} value={cc.DisplayName}>{cc.DisplayName}</SelectItem>)}
          {filteredClients.length === 0 && (
            <div className="p-4 text-sm text-center text-muted-foreground">
                No clients found.
            </div>
          )}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
};

// New self-contained component for the Employee dropdown
const EmployeeSelect = ({ 
  employees, 
  onValueChange,
  value,
  disabled,
}: { 
  employees: TeamMember[], 
  onValueChange: (value: string) => void,
  value: string,
  disabled?: boolean,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredEmployees = useMemo(() => {
    const sortedEmployees = employees.sort((a,b) => (a.full_name || '').localeCompare(b.full_name || ''));
    if (!searchTerm) {
      return sortedEmployees;
    }
    return sortedEmployees.filter(e => e.full_name && e.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [employees, searchTerm]);

  return (
    <Select onValueChange={onValueChange} value={value} disabled={disabled}>
      <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Load Employee..." />
      </SelectTrigger>
      <SelectContent>
          <SelectSearch placeholder="Search employee..." onChange={setSearchTerm} />
          <ScrollArea className="h-64">
            {filteredEmployees.map(e => (
                <SelectItem key={e.person_id} value={e.person_id}>
                    {e.full_name}
                </SelectItem>
            ))}
            {filteredEmployees.length === 0 && (
                <div className="p-4 text-sm text-center text-muted-foreground">
                    No employees found.
                </div>
            )}
          </ScrollArea>
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
    const sortedManagers = managers.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    if (!searchTerm) {
      return sortedManagers;
    }
    return sortedManagers.filter(m => m.name && m.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [managers, searchTerm]);

  return (
    <Select onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Load Team..." />
        </SelectTrigger>
        <SelectContent>
            <SelectSearch placeholder="Search manager..." onChange={setSearchTerm} />
            <ScrollArea className="h-64">
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
            </ScrollArea>
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
  const [hasMounted, setHasMounted] = useState(false);
  const isInitialRender = useRef(true);
  const activeAllocationsRef = useRef(activeAllocations);
  activeAllocationsRef.current = activeAllocations;

  const { currentUser, isAdmin, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  
  const isLoading = initialLoading || internalLoading || userLoading;

  useEffect(() => {
    setHasMounted(true);
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

  const fetchAllocationsForEmployee = useCallback(async (employee: TeamMember): Promise<AllocationRow[]> => {
    const blankRow = { id: uuidv4(), clientId: '', clientName: '', weeklyFtes: {} };
    if (!currentDate || weeks.length === 0) return [blankRow];
  
    try {
        const sourceWeekKeys = weeks.map(w => formatDateKey(w.startDate));
        
        const weeklyDataPromises = sourceWeekKeys.map(weekKey => 
            fetch(`/domo/datastores/v1/collections/weekly_allocation/documents?q=content.allocation_date='${weekKey}'`).then(res => res.ok ? res.json() : [])
        );

        const nestedAllocations = await Promise.all(weeklyDataPromises);
        const allCurrentMonthAllocations: WeeklyAllocation[] = nestedAllocations.flat();
      
        const employeeIdString = `[${employee.person_id}]`;
        const employeeAllocations = allCurrentMonthAllocations.filter(alloc => 
            alloc.content.allocation_name?.startsWith(employeeIdString) &&
            parseFloat(alloc.content.allocation_amount) > 0
        );
      
        if (employeeAllocations.length === 0) {
            return [blankRow];
        }
  
        const clientAllocationsMap = new Map<string, { clientName: string, weeklyFtes: { [weekKey: string]: number } }>();
  
        employeeAllocations.forEach(alloc => {
            const clientKey = alloc.content.cost_center_number;
            if (!clientAllocationsMap.has(clientKey)) {
                clientAllocationsMap.set(clientKey, { 
                    clientName: alloc.content.cost_center_name,
                    weeklyFtes: {},
                });
            }
            const fte = parseFloat(alloc.content.allocation_amount);
            clientAllocationsMap.get(clientKey)!.weeklyFtes[alloc.content.allocation_date] = fte;
        });
      
        const newAllocationRows: AllocationRow[] = Array.from(clientAllocationsMap.entries()).map(([clientId, data]) => ({
            id: uuidv4(),
            clientId: clientId,
            clientName: data.clientName,
            weeklyFtes: data.weeklyFtes,
        }));
  
        return newAllocationRows.length > 0 ? newAllocationRows : [blankRow];
    } catch (error) {
        writeLog('MultiWeekGrid', 'error', `Could not load allocations for ${employee.full_name}`, error);
        toast({ variant: 'destructive', title: 'Error Loading Data', description: `Could not load allocations for ${employee.full_name}.`});
        return [blankRow];
    }
  }, [currentDate, toast, weeks]);

  // Effect to re-fetch employee allocations when the month changes
  useEffect(() => {
    if (isInitialRender.current) {
        isInitialRender.current = false;
        return;
    }

    const refreshAllocations = async () => {
        const currentActiveAllocs = activeAllocationsRef.current;
        if (currentActiveAllocs.length === 0) return;

        setInternalLoading(true);
        const refreshedAllocations = await Promise.all(
            currentActiveAllocs.map(async empAlloc => {
                const newRows = await fetchAllocationsForEmployee(empAlloc.employee);
                return { ...empAlloc, allocations: newRows };
            })
        );
        setActiveAllocations(refreshedAllocations);
        setInternalLoading(false);
    };

    refreshAllocations();
  }, [currentDate, fetchAllocationsForEmployee]);


  const fetchData = useCallback(async () => {
    setInternalLoading(true);
    try {
      const [empResponse, clientResponse] = await Promise.all([
        fetch(`/data/v1/consolidated_hr_fte_report_view`),
        fetch(`/data/v1/ai_report`),
      ]);

      if (!empResponse.ok) {
        const errorPayload = { status: empResponse.status, statusText: empResponse.statusText };
        writeLog('MultiWeekGrid', 'warning', 'Could not fetch employee data', errorPayload);
        console.warn("Could not fetch employee data. This may be expected in local dev.");
      }
      if (!clientResponse.ok) {
        const errorPayload = { status: clientResponse.status, statusText: clientResponse.statusText };
        writeLog('MultiWeekGrid', 'warning', 'Could not fetch client data', errorPayload);
        console.warn("Could not fetch client data. This may be expected in local dev.");
      }
      
      const empData: TeamMember[] = empResponse.ok ? (await empResponse.json()).filter((e: TeamMember) => e.full_name).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')) : [];
      const clientData: AiReportData[] = clientResponse.ok ? (await clientResponse.json()).filter((c: AiReportData) => c.Code && c.DisplayName) : [];
      
      const tempWorker: TeamMember = {
        person_id: 'TEMP_WORKER',
        full_name: 'Temp Worker',
        title: 'Temporary Staff',
        employment_type: 'Temporary',
        status: 'Active',
        department: 'Temporary',
        manager_id: 'N/A',
        manager: 'N/A',
        manager_email: 'N/A',
        person_email: 'N/A',
        start_date: '',
        end_date: '',
        country: '',
        fte: '1.0'
      };
      setAllEmployees([tempWorker, ...empData]);

      const staticClients: AiReportData[] = [
        { Code: 'UNALLOCATED', Name: 'Unallocated', DisplayName: 'Unallocated', RollsUpTo: '' },
        { Code: 'PTO', Name: 'PTO', DisplayName: 'PTO', RollsUpTo: '' },
      ];
      setClients([...staticClients, ...clientData]);
      
      const managerMap = new Map<string, string>();
      empData.forEach(emp => {
          if(emp.manager_id && emp.manager) {
              managerMap.set(emp.manager_id, emp.manager);
          }
      });
      const uniqueManagers = Array.from(managerMap, ([id, name]) => ({ id, name }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setManagers(uniqueManagers);

      setActiveAllocations([]);

    } catch (error) {
      writeLog('MultiWeekGrid', 'error', 'Failed to fetch initial data', error);
      toast({ variant: 'destructive', title: 'Failed to fetch data' });
    } finally {
      setInternalLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!userLoading) {
        fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading]);


  const availableEmployees = useMemo(() => {
    const activeEmployeeIds = new Set(activeAllocations.map(a => a.employee.person_id));
    return allEmployees.filter(e => !activeEmployeeIds.has(e.person_id));
  }, [allEmployees, activeAllocations]);

  const handlePrevMonth = () => {
    if (currentDate) setCurrentDate(getPreviousFiscalMonth(currentDate));
  };
  const handleNextMonth = () => {
    if (currentDate) setCurrentDate(getNextFiscalMonth(currentDate));
  };

  const fetchAndApplyPreviousMonthAllocations = useCallback(async (employee: TeamMember) => {
    if (!currentDate) return;
  
    const prevMonthDate = getPreviousFiscalMonth(currentDate);
    const prevMonthWeeks = getWeeksForFiscalMonth(prevMonthDate);
    if (prevMonthWeeks.length === 0) {
        toast({ title: 'No Prior Data', description: `No allocation data found for the previous month.`});
        return;
    }
  
    try {
        const sourceWeekKeys = prevMonthWeeks.map(w => formatDateKey(w.startDate));
        
        const weeklyDataPromises = sourceWeekKeys.map(weekKey => 
            fetch(`/domo/datastores/v1/collections/weekly_allocation/documents?q=content.allocation_date='${weekKey}'`).then(res => res.ok ? res.json() : [])
        );

        const nestedAllocations = await Promise.all(weeklyDataPromises);
        const allPrevMonthAllocations: WeeklyAllocation[] = nestedAllocations.flat();
      
        const employeeIdString = `[${employee.person_id}]`;
        const employeeAllocations = allPrevMonthAllocations.filter(alloc => 
            alloc.content.allocation_name.startsWith(employeeIdString) &&
            parseFloat(alloc.content.allocation_amount) > 0
        );
      
        if (employeeAllocations.length === 0) {
            toast({ title: 'No Prior Data', description: `No allocations found for ${employee.full_name} in the prior month.`});
            return;
        }
  
        const clientAllocationsMap = new Map<string, { clientName: string, weeklyFtes: Map<string, number> }>();
  
        employeeAllocations.forEach(alloc => {
            const clientKey = alloc.content.cost_center_number;
            if (!clientAllocationsMap.has(clientKey)) {
                clientAllocationsMap.set(clientKey, { 
                    clientName: alloc.content.cost_center_name,
                    weeklyFtes: new Map<string, number>(),
                });
            }
            const fte = parseFloat(alloc.content.allocation_amount);
            clientAllocationsMap.get(clientKey)!.weeklyFtes.set(alloc.content.allocation_date, fte);
        });
      
        const newAllocationRows: AllocationRow[] = [];
        clientAllocationsMap.forEach((data, clientId) => {
            const newRow: AllocationRow = {
                id: uuidv4(),
                clientId: clientId,
                clientName: data.clientName,
                weeklyFtes: {},
            };
        
            // Map prior month's weeks to current month's weeks by index
            weeks.forEach((currentWeek, index) => {
                if (index < prevMonthWeeks.length) {
                    const sourceWeekKey = formatDateKey(prevMonthWeeks[index].startDate);
                    if (data.weeklyFtes.has(sourceWeekKey)) {
                        const fte = data.weeklyFtes.get(sourceWeekKey)!;
                        newRow.weeklyFtes[formatDateKey(currentWeek.startDate)] = fte;
                    }
                }
            });
            if (Object.keys(newRow.weeklyFtes).length > 0) {
                newAllocationRows.push(newRow);
            }
        });
  
        if (newAllocationRows.length > 0) {
            setActiveAllocations(prev =>
                prev.map(empAlloc =>
                    empAlloc.employee.person_id === employee.person_id
                    ? { ...empAlloc, allocations: newAllocationRows }
                    : empAlloc
                )
            );
            toast({ title: 'Prior Allocations Loaded', description: `Copied allocations for ${employee.full_name} from the previous month.`});
        } else {
            toast({ title: 'No Applicable Data', description: `No prior allocations found that could be applied to the current month's weeks.`});
        }
    } catch (error) {
        writeLog('MultiWeekGrid', 'error', `Could not load prior allocations for ${employee.full_name}`, error);
        toast({ variant: 'destructive', title: 'Error Loading Prior Data', description: `Could not load prior allocations for ${employee.full_name}.`});
    }
  }, [currentDate, weeks, toast]);
  
  const handleAddEmployee = async (employeeId: string) => {
    if (!employeeId) return;
    setSelectedEmployeeToAdd(employeeId); 

    const employeeToAdd = allEmployees.find(e => e.person_id === employeeId);
    if (employeeToAdd) {
      const isAlreadyActive = activeAllocations.some(a => a.employee.person_id === employeeId);
      if (isAlreadyActive) {
          toast({ variant: 'destructive', title: 'Employee already in grid' });
          return;
      }
      
      const allocationRows = await fetchAllocationsForEmployee(employeeToAdd);
      const newEmployeeAllocation: EmployeeAllocation = {
        employee: employeeToAdd,
        allocations: allocationRows
      };
      
      setActiveAllocations(prev => [newEmployeeAllocation, ...prev]);
    }
    setTimeout(() => setSelectedEmployeeToAdd(''), 0);
  };

  const handleAddManagerTeam = async (managerId: string) => {
    if (!managerId) return;
    const teamMembers = allEmployees.filter(e => e.manager_id === managerId);
    
    const employeesToAdd = teamMembers.filter(
        employee => !activeAllocations.some(a => a.employee.person_id === employee.person_id)
    );

    if (employeesToAdd.length === 0) {
      toast({ title: 'No new employees to add', description: 'All direct reports for this manager are already in the grid.' });
      return;
    }
    
    toast({ title: 'Team Loaded', description: `Loading existing data for ${employeesToAdd.length} employees...` });
    
    const allocationPromises = employeesToAdd.map(employee => fetchAllocationsForEmployee(employee));

    const resolvedAllocations = await Promise.all(allocationPromises);

    const newEmployeeAllocations = employeesToAdd.map((employee, index) => ({
      employee,
      allocations: resolvedAllocations[index],
    }));

    setActiveAllocations(prev => [...newEmployeeAllocations, ...prev]);
  };


  const handleRemoveEmployee = (employeeId: string) => {
    setActiveAllocations(prev => prev.filter(a => a.employee.person_id !== employeeId));
  };
  
  const handleFteChange = (employeeId: string, allocId: string, weekKey: string, newFteValue: string) => {
    const newFte = parseFloat(newFteValue) || 0;
    setActiveAllocations(prev => prev.map(empAlloc => {
        if (empAlloc.employee.person_id === employeeId) {
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
        if (empAlloc.employee.person_id === employeeId) {
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
        if (empAlloc.employee.person_id === employeeId) {
            const newAllocations = empAlloc.allocations.map(alloc => {
                if (alloc.id === allocId) {
                    const selectedCc = clients.find(cc => cc.DisplayName === newClientName);
                    return { ...alloc, clientName: newClientName, clientId: (selectedCc?.Code || '').trim() };
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
        if (empAlloc.employee.person_id === employeeId) {
            const newAlloc: AllocationRow = {
                id: uuidv4(),
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
        if (empAlloc.employee.person_id === employeeId) {
            const newAllocations = empAlloc.allocations.filter(a => a.id !== allocId);
            return { ...empAlloc, allocations: newAllocations };
        }
        return empAlloc;
    }));
  };

  const handleSave = async () => {
    const submissions: any[] = [];
    let hasInvalidAllocation = false;

    // Create a set of week keys for the currently visible month for efficient lookup.
    const currentMonthWeekKeys = new Set(weeks.map(w => formatDateKey(w.startDate)));
    
    activeAllocations.forEach(empAlloc => {
      empAlloc.allocations.forEach(alloc => {
        Object.entries(alloc.weeklyFtes).forEach(([weekKey, fte]) => {
          // CRITICAL FIX: Only process and save entries for the currently displayed month.
          if (currentMonthWeekKeys.has(weekKey)) {
              if (fte > 0) {
                if (!alloc.clientId || !alloc.clientName) {
                    hasInvalidAllocation = true;
                    toast({ variant: 'destructive', title: 'Missing Client', description: `Please select a client for ${empAlloc.employee.full_name}.` });
                    return; // exit forEach for this entry
                }
                submissions.push({
                  content: {
                    allocation_date: weekKey,
                    allocation_name: `[${empAlloc.employee.person_id}] ${empAlloc.employee.full_name}`,
                    employee_id: empAlloc.employee.person_id,
                    cost_center_name: alloc.clientName,
                    cost_center_number: alloc.clientId,
                    allocation_amount: fte.toString(),
                  }
                });
              }
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
        writeLog('MultiWeekGrid', 'success', 'Allocations saved successfully', { count: submissions.length });
        onSaveSuccess();
    } catch (error: any) {
        writeLog('MultiWeekGrid', 'error', 'Save failed', error);
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Monthly Allocation Grid</CardTitle>
              <CardDescription>Add employees to build your allocation plan. Past weeks are locked for non-admins.</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <EmployeeSelect 
                  employees={availableEmployees} 
                  onValueChange={handleAddEmployee}
                  value={selectedEmployeeToAdd}
                  disabled={isLoading}
              />
              <ManagerSelect managers={managers} onValueChange={handleAddManagerTeam} disabled={isLoading} />
              <Button variant="outline" size="icon" onClick={handlePrevMonth} disabled={isLoading}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium w-32 text-center">
                {isLoading ? <Skeleton className="h-5 w-24 mx-auto" /> : fiscalMonthLabel}
              </span>
              <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isLoading}><ChevronRight className="h-4 w-4" /></Button>
              <Button onClick={handleSave} disabled={isLoading || activeAllocations.length === 0}>Save All</Button>
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
                  <TableHead className="p-2 w-28">Client Code</TableHead>
                  <TableHead className="text-center min-w-[120px]">Bulk Entry</TableHead>
                  {weeks.map(week => {
                    const isPast = hasMounted && startOfCurrentWeek ? isBefore(endOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek) : false;
                    const isCurrent = hasMounted && startOfCurrentWeek ? isSameDay(startOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek) : false;
                    const isLockedForUser = isPast && !isAdmin;
                    return (
                      <TableHead key={week.startDate.toISOString()} className={cn("text-center min-w-[120px] transition-colors", { "bg-muted/40": isPast, "bg-primary/10": isCurrent })}>
                        <div className='flex items-center justify-center gap-2'>
                          <Lock className={cn("h-3.5 w-3.5 text-muted-foreground", !isLockedForUser && "invisible")} />
                          <span>W/E {week.reportingWeekDate}</span>
                        </div>
                        <Badge variant="default" className={cn("w-fit mx-auto mt-1", !isCurrent && "invisible")}>Current</Badge>
                      </TableHead>
                    )
                  })}
                  <TableHead className="w-[80px]"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!hasMounted || isLoading ? (
                  <TableRow>
                    <TableCell colSpan={weeks.length + 5}>
                      <div className="space-y-4 py-8">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : activeAllocations.length === 0 ? (
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
                    <Fragment key={employee.person_id}>
                      <TableRow className="bg-muted/50 hover:bg-muted">
                        <TableCell className="sticky left-0 bg-muted/50 z-10 flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{employee.full_name || ''}</span>
                                {employee.fte && <Badge variant="secondary">FTE: {employee.fte}</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground font-normal">{employee.title || ''}</div>
                          </div>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fetchAndApplyPreviousMonthAllocations(employee)}>
                                      <Copy className="h-3.5 w-3.5" />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                  <p>Copy Prior Month's Allocations</p>
                              </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell colSpan={3}></TableCell>
                        {weeklyTotals.map((total, index) => {
                            const isPartTime = employee.employment_type?.toLowerCase().includes('part');
                            const isOverallocated = total > 1.0;
                            const isPartTimeWarning = isPartTime && total >= 0.6 && total <= 1.0;
                            
                            let tooltipMessage = '';
                            if (isOverallocated) {
                              tooltipMessage = 'Employee allocated over 1.0 FTE.';
                            } else if (isPartTimeWarning) {
                              tooltipMessage = 'Part-time employee allocated at or above 0.6 FTE.';
                            }

                            return (
                              <TableCell key={index} className="text-center font-semibold" colSpan={1}>
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
                                      {tooltipMessage && (
                                          <TooltipContent>
                                              <p>{tooltipMessage}</p>
                                          </TooltipContent>
                                      )}
                                  </Tooltip>
                              </TableCell>
                            )
                        })}
                        <TableCell className='text-right'>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveEmployee(employee.person_id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>

                      {allocations.map((alloc) => {
                        const isRowLocked = hasMounted && startOfCurrentWeek ? weeks.some(week => {
                              const isPast = isBefore(endOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek);
                              return isPast && !isAdmin;
                        }) : false;
                        const bulkFteValue = (weeks.length > 0 && alloc.weeklyFtes[formatDateKey(weeks[0].startDate)]) || '';
                        return (
                        <TableRow key={alloc.id}>
                          <TableCell className="sticky left-0 bg-card z-10"></TableCell>
                          <TableCell>
                            <ClientSelect
                                clients={clients}
                                value={alloc.clientName}
                                onValueChange={(newCcName) => handleClientChange(employee.person_id, alloc.id, newCcName)}
                                disabled={!hasMounted || isRowLocked}
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
                                  value={bulkFteValue}
                                  onChange={(e) => handleMonthlyFteChange(employee.person_id, alloc.id, e.target.value)}
                                  disabled={!hasMounted || isRowLocked}
                                />
                          </TableCell>
                          {weeks.map(week => {
                            const weekKey = formatDateKey(week.startDate);
                            const isPast = hasMounted && startOfCurrentWeek ? isBefore(endOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek) : false;
                            const isCurrent = hasMounted && startOfCurrentWeek ? isSameDay(startOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek) : false;
                            const isLockedForUser = isPast && !isAdmin;
                            const fteValue = alloc.weeklyFtes[weekKey];
                            return (
                              <TableCell key={week.startDate.toISOString()} className={cn("text-center", {"bg-muted/40": isPast, "bg-primary/10": isCurrent})}>
                                  <Input
                                    type="number" step="0.05" min="0" placeholder="0.00"
                                    className={cn("w-20 text-center mx-auto", { "bg-muted/50 cursor-not-allowed": isLockedForUser })}
                                    value={fteValue || ''}
                                    onChange={(e) => handleFteChange(employee.person_id, alloc.id, weekKey, e.target.value)}
                                    disabled={!hasMounted || isLockedForUser} readOnly={!hasMounted || isLockedForUser}
                                  />
                              </TableCell>
                            )
                          })}
                          <TableCell className='text-right'>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveAllocationRow(employee.person_id, alloc.id)} disabled={!hasMounted || allocations.length === 1 || isRowLocked}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )})}

                      <TableRow>
                        <TableCell className="sticky left-0 bg-card z-10 py-2" colSpan={3}>
                          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleAddAllocationRow(employee.person_id)}>
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
    </TooltipProvider>
  );
}
