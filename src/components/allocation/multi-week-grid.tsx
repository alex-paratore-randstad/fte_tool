
'use client';

import { useState, useMemo, Fragment, useEffect, useCallback } from 'react';
import { startOfWeek, endOfWeek, format, isBefore, isSameDay, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronLeft, ChevronRight, PlusCircle, Trash2, Lock, Copy, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
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

const ClientSelect = ({ 
  clients, 
  value, 
  onValueChange,
  disabled 
}: { 
  clients: AiReportData[], 
  value: string, 
  onValueChange: (displayName: string) => void,
  disabled?: boolean 
}) => {
  const [open, setOpen] = useState(false);

  const selectedClient = useMemo(() => {
    if (!value) return null;
    const trimmed = String(value).trim();
    return (clients || []).find(c => c && String(c.DisplayName || '').trim() === trimmed);
  }, [clients, value]);

  const sortedClients = useMemo(() => {
    const validClients = (clients || []).filter(c => c && c.DisplayName);
    return [...validClients].sort((a, b) => {
      const specialClients = ['PTO', 'Unallocated'];
      const aIsSpecial = specialClients.includes(a.DisplayName);
      const bIsSpecial = specialClients.includes(b.DisplayName);
      if (aIsSpecial && !bIsSpecial) return -1;
      if (!aIsSpecial && bIsSpecial) return 1;
      if (aIsSpecial && bIsSpecial) return a.DisplayName === 'Unallocated' ? -1 : 1;
      return (a.DisplayName || '').localeCompare(b.DisplayName || '');
    });
  }, [clients]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedClient ? selectedClient.DisplayName : (value || "Select Client...")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command filter={(val, search) => {
            if ((val || '').toLowerCase().includes((search || '').toLowerCase())) return 1;
            return 0;
        }}>
          <CommandInput placeholder="Search name or code..." />
          <CommandList>
            <CommandEmpty>No clients found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-64">
                {sortedClients.map((cc, idx) => (
                  <CommandItem
                    key={`${cc.DisplayName}-${cc.Code || idx}`}
                    value={`${cc.DisplayName} ${cc.Code || ''}`}
                    onSelect={() => {
                      onValueChange(cc.DisplayName);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        String(value || '').trim() === String(cc.DisplayName || '').trim() ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                        <span>{cc.DisplayName}</span>
                        <span className="text-xs text-muted-foreground">{cc.Code || 'No Code'}</span>
                    </div>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

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
  const [open, setOpen] = useState(false);

  const selectedEmployee = useMemo(() => {
    return (employees || []).find(e => e && e.person_id === value);
  }, [employees, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between font-normal"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedEmployee ? selectedEmployee.full_name : "Load Employee..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command filter={(val, search) => {
            if ((val || '').toLowerCase().includes((search || '').toLowerCase())) return 1;
            return 0;
        }}>
          <CommandInput placeholder="Search employee..." />
          <CommandList>
            <CommandEmpty>No employees found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-64">
                {(employees || []).map((e) => (
                  <CommandItem
                    key={e.person_id}
                    value={e.full_name}
                    onSelect={() => {
                      onValueChange(e.person_id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === e.person_id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>{e.full_name}</span>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const ManagerSelect = ({ 
  managers, 
  onValueChange,
  value,
  disabled
}: { 
  managers: {id: string, name: string}[]|null, 
  onValueChange: (value: string) => void,
  value?: string,
  disabled?: boolean
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between font-normal"
          disabled={disabled}
        >
          <span className="truncate">
            {value || "Load Team..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command filter={(val, search) => {
            if ((val || '').toLowerCase().includes((search || '').toLowerCase())) return 1;
            return 0;
        }}>
          <CommandInput placeholder="Search manager..." />
          <CommandList>
            <CommandEmpty>No managers found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-64">
                {(managers || []).map((m) => (
                  <CommandItem
                    key={m.id}
                    value={m.name}
                    onSelect={() => {
                      const newValue = m.name === value ? "" : m.name;
                      onValueChange(newValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === m.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>{m.name}</span>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};


export function MultiWeekGrid({ currentDate, setCurrentDate, onSaveSuccess, initialLoading }: MultiWeekGridProps) {
  const [activeAllocations, setActiveAllocations] = useState<EmployeeAllocation[]>([]);
  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [managers, setManagers] = useState<{id: string, name: string}[]>([]);
  const [clients, setClients] = useState<AiReportData[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [monthDataCache, setMonthDataCache] = useState<WeeklyAllocation[]>([]);
  const [startOfCurrentWeek, setStartOfCurrentWeek] = useState<Date | null>(null);
  const [selectedEmployeeToAdd, setSelectedEmployeeToAdd] = useState('');
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  
  const { isAdmin, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  
  const isLoading = initialLoading || internalLoading || userLoading;

  useEffect(() => {
    setHasMounted(true);
    setStartOfCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, []);

  const { weeks, fiscalMonthLabel } = useMemo(() => {
    if (!currentDate || !isValid(currentDate)) return { weeks: [], fiscalMonthLabel: 'Loading...' };
    const fiscalData = getFiscalDataForDate(currentDate);
    const monthWeeks: FiscalWeek[] = getWeeksForFiscalMonth(currentDate);
    const label = fiscalData ? `${fiscalData.Reporting_Month} ${fiscalData.Reporting_Year}` : 'Loading...';
    return { weeks: monthWeeks, fiscalMonthLabel: label };
  }, [currentDate]);

  const isWeekEditable = useCallback((weekStartDate: Date) => {
    if (isAdmin) return true;
    if (!currentDate || !startOfCurrentWeek) return false;
    const weekFiscal = getFiscalDataForDate(weekStartDate);
    const currentFiscal = getFiscalDataForDate(startOfCurrentWeek);
    if (!weekFiscal || !currentFiscal) return false;
    
    const isCurrentMonth = weekFiscal.Reporting_Month === currentFiscal.Reporting_Month && weekFiscal.Reporting_Year === currentFiscal.Reporting_Year;
    const prevMonthDate = getPreviousFiscalMonth(startOfCurrentWeek);
    const prevFiscal = getFiscalDataForDate(prevMonthDate);
    const isPrevMonth = prevFiscal && weekFiscal.Reporting_Month === prevFiscal.Reporting_Month && weekFiscal.Reporting_Year === prevFiscal.Reporting_Year;
    
    return isCurrentMonth || isPrevMonth;
  }, [isAdmin, startOfCurrentWeek]);

  // CORE PRELOADING LOGIC: Fetch data for viewing month (M) and previous month (M-1)
  const fetchMonthData = useCallback(async () => {
    if (!currentDate || !isValid(currentDate) || (weeks?.length || 0) === 0) return;
    setInternalLoading(true);
    try {
        const currentMonthWeekKeys = weeks.map(w => formatDateKey(w.startDate));
        const prevMonthDate = getPreviousFiscalMonth(currentDate);
        const prevMonthWeeks = getWeeksForFiscalMonth(prevMonthDate);
        const prevMonthWeekKeys = (prevMonthWeeks || []).map(w => formatDateKey(w.startDate));
        
        // We only care about data in the current month or previous month for preloading (Rollover)
        const allRelevantWeeks = Array.from(new Set([...currentMonthWeekKeys, ...prevMonthWeekKeys]));
        
        const weeklyDataPromises = allRelevantWeeks.map(weekKey => 
            fetch(`/domo/datastores/v1/collections/weekly_allocation/documents?q=content.allocation_date='${weekKey}'`).then(res => res.ok ? res.json() : [])
        );
        const nestedAllocations = await Promise.all(weeklyDataPromises);
        const allRelevantAllocations: WeeklyAllocation[] = nestedAllocations.flat().filter(a => a && a.content);
        setMonthDataCache(allRelevantAllocations);
        
        // Update employees already in grid: re-calculate their rows based on the rollover data
        setActiveAllocations(prev => (prev || []).map(empAlloc => {
            if (!empAlloc?.employee) return empAlloc;
            const employeeIdString = `[${empAlloc.employee.person_id}]`;
            
            // Find all allocations for this employee in M and M-1
            const empAllAllocs = allRelevantAllocations.filter(alloc => 
                alloc?.content?.allocation_name && 
                String(alloc.content.allocation_name).startsWith(employeeIdString) &&
                parseFloat(alloc.content?.allocation_amount || '0') > 0
            );
            
            const clientNames = new Set<string>();
            empAllAllocs.forEach(a => { if (a?.content?.cost_center_name) clientNames.add(String(a.content.cost_center_name).trim()); });
            
            // If no clients were active in M or M-1, clear the list and show one empty row
            if (clientNames.size === 0) {
                return { ...empAlloc, allocations: [{ id: uuidv4(), clientId: '', clientName: '', weeklyFtes: {} }] };
            }
            
            const newAllocationRows: AllocationRow[] = Array.from(clientNames).map(clientName => {
                const clientSpecificAllocs = empAllAllocs.filter(a => String(a?.content?.cost_center_name || '').trim() === clientName);
                const masterClient = (clients || []).find(c => c && String(c.DisplayName || '').trim() === clientName);
                const weeklyFtes: { [weekKey: string]: number } = {};
                
                // Populate weekly FTEs for the current month only
                clientSpecificAllocs.filter(a => a?.content && currentMonthWeekKeys.includes(a.content.allocation_date)).forEach(a => {
                    if (a?.content) weeklyFtes[a.content.allocation_date] = parseFloat(a.content.allocation_amount || '0');
                });
                
                return {
                    id: uuidv4(),
                    clientId: (masterClient?.Code || clientSpecificAllocs[0]?.content?.cost_center_number || '').trim(),
                    clientName,
                    weeklyFtes,
                };
            });
            return { ...empAlloc, allocations: newAllocationRows };
        }));
    } catch (error) {
        writeLog('MultiWeekGrid', 'error', 'Error pre-fetching relevant month data', error);
    } finally {
        setInternalLoading(false);
    }
  }, [currentDate, weeks, clients]);

  useEffect(() => {
    if (hasMounted && currentDate && (clients?.length || 0) > 0) {
        fetchMonthData();
    }
  }, [currentDate, fetchMonthData, hasMounted, clients.length]);

  const fetchData = useCallback(async () => {
    setInternalLoading(true);
    try {
      const [empResponse, clientResponse] = await Promise.all([
        fetch(`/data/v1/consolidated_hr_fte_report_view`),
        fetch(`/data/v1/ai_report`),
      ]);
      const rawEmpData = empResponse.ok ? await empResponse.json() : [];
      const rawClientData = clientResponse.ok ? await clientResponse.json() : [];
      const empData: TeamMember[] = (Array.isArray(rawEmpData) ? rawEmpData : []).filter(e => e && e.full_name && e.person_id);
      const clientData: AiReportData[] = (Array.isArray(rawClientData) ? rawClientData : []).filter(c => c && c.Code && c.DisplayName);
      const tempWorker: TeamMember = { person_id: 'TEMP_WORKER', full_name: 'Temp Worker', title: 'Temporary Staff', employment_type: 'Temporary', status: 'Active', department: 'Temporary', manager_id: 'N/A', manager: 'N/A', manager_email: 'N/A', person_email: 'N/A', start_date: '', end_date: '', country: '', fte: '1.0' };
      setAllEmployees([tempWorker, ...empData]);
      const staticClients: AiReportData[] = [
        { Code: 'UNALLOCATED', Name: 'Unallocated', DisplayName: 'Unallocated', RollsUpTo: '' },
        { Code: 'PTO', Name: 'PTO', DisplayName: 'PTO', RollsUpTo: '' },
      ];
      setClients([...staticClients, ...clientData]);
      
      const uniqueManagerNames = Array.from(
        new Set(
          empData
            .map(e => e?.manager)
            .filter(m => typeof m === 'string' && m)
        )
      ).sort().map(name => ({ id: name as string, name: name as string }));
      setManagers(uniqueManagerNames);

      setActiveAllocations([]);
    } catch (error) {
      writeLog('MultiWeekGrid', 'error', 'Failed to fetch metadata', error);
      toast({ variant: 'destructive', title: 'Failed to fetch metadata' });
    } finally {
      setInternalLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!userLoading) fetchData();
  }, [userLoading, fetchData]);

  const availableEmployees = useMemo(() => {
    const activeIds = new Set((activeAllocations || []).map(a => a?.employee?.person_id).filter(Boolean));
    return (allEmployees || []).filter(e => e?.person_id && !activeIds.has(e.person_id));
  }, [allEmployees, activeAllocations]);

  const handlePrevMonth = () => { if (currentDate && isValid(currentDate)) setCurrentDate(getPreviousFiscalMonth(currentDate)); };
  const handleNextMonth = () => { if (currentDate && isValid(currentDate)) setCurrentDate(getNextFiscalMonth(currentDate)); };

  const fetchAndApplyPreviousMonthAllocations = useCallback(async (employee: TeamMember) => {
    if (!currentDate || !isValid(currentDate) || !employee) return;
    const prevDate = getPreviousFiscalMonth(currentDate);
    const prevWeeks = getWeeksForFiscalMonth(prevDate);
    if ((prevWeeks?.length || 0) === 0) { toast({ title: 'No Prior Data', description: `No data found for the previous month.`}); return; }
    try {
        const sourceKeys = prevWeeks.map(w => formatDateKey(w.startDate));
        const weeklyDataPromises = sourceKeys.map(key => fetch(`/domo/datastores/v1/collections/weekly_allocation/documents?q=content.allocation_date='${key}'`).then(res => res.ok ? res.json() : []));
        const nested = await Promise.all(weeklyDataPromises);
        const allPrev = nested.flat().filter(a => a && a.content);
        const empIdString = `[${employee.person_id}]`;
        const empAllocs = allPrev.filter(a => a?.content?.allocation_name && String(a.content.allocation_name).startsWith(empIdString) && parseFloat(a.content?.allocation_amount || '0') > 0);
        if (empAllocs.length === 0) { toast({ title: 'No Prior Data', description: `No allocations found for ${employee.full_name} in the prior month.`}); return; }
        const clientMap = new Map<string, { clientId: string, weeklyFtes: Map<string, number> }>();
        empAllocs.forEach(a => {
            if (!a?.content || !a.content.cost_center_name) return;
            const nameKey = String(a.content.cost_center_name).trim();
            if (!clientMap.has(nameKey)) {
                const master = (clients || []).find(c => c && String(c.DisplayName || '').trim() === nameKey);
                clientMap.set(nameKey, { clientId: (master?.Code || a.content.cost_center_number || '').trim(), weeklyFtes: new Map() });
            }
            clientMap.get(nameKey)!.weeklyFtes.set(a.content.allocation_date, parseFloat(a.content.allocation_amount || '0'));
        });
        const newRows: AllocationRow[] = [];
        clientMap.forEach((data, clientName) => {
            const row: AllocationRow = { id: uuidv4(), clientId: data.clientId, clientName, weeklyFtes: {} };
            weeks.forEach((curr, idx) => { if (idx < prevWeeks.length) { const sKey = formatDateKey(prevWeeks[idx].startDate); if (data.weeklyFtes.has(sKey)) row.weeklyFtes[formatDateKey(curr.startDate)] = data.weeklyFtes.get(sKey)!; } });
            if (Object.keys(row.weeklyFtes).length > 0) newRows.push(row);
        });
        if (newRows.length > 0) {
            setActiveAllocations(prev => (prev || []).map(ea => ea.employee?.person_id === employee.person_id ? { ...ea, allocations: newRows } : ea));
            toast({ title: 'Prior Allocations Loaded', description: `Copied allocations for ${employee.full_name} from the previous month.`});
        }
    } catch (error) { writeLog('MultiWeekGrid', 'error', `Could not load prior allocations for ${employee.full_name}`, error); }
  }, [currentDate, weeks, toast, clients]);
  
  const handleAddEmployee = (employeeId: string) => {
    if (!employeeId || !currentDate) return;
    setSelectedEmployeeToAdd(employeeId); 
    setSelectedManager(''); 
    const employeeToAdd = (allEmployees || []).find(e => e && e.person_id === employeeId);
    if (employeeToAdd) {
      if ((activeAllocations || []).some(a => a?.employee?.person_id === employeeId)) { toast({ variant: 'destructive', title: 'Employee already in grid' }); return; }
      const empIdStr = `[${employeeToAdd.person_id}]`;
      const currentKeys = (weeks || []).map(w => formatDateKey(w.startDate));
      const prevDate = getPreviousFiscalMonth(currentDate);
      const prevWeeks = getWeeksForFiscalMonth(prevDate);
      const prevKeys = (prevWeeks || []).map(w => formatDateKey(w.startDate));
      
      // Use rollover logic for individual addition
      const allKeys = new Set([...currentKeys, ...prevKeys]);
      const empAllocs = (monthDataCache || []).filter(a => a?.content?.allocation_name && String(a.content.allocation_name).startsWith(empIdStr) && allKeys.has(a.content.allocation_date) && parseFloat(a.content?.allocation_amount || '0') > 0);
      let initialRows: AllocationRow[] = [];
      if (empAllocs.length === 0) {
          initialRows = [{ id: uuidv4(), clientId: '', clientName: '', weeklyFtes: {} }];
      } else {
          const names = Array.from(new Set(empAllocs.map(a => String(a?.content?.cost_center_name || '').trim()).filter(Boolean)));
          initialRows = names.map(name => {
              const cAllocs = empAllocs.filter(a => String(a?.content?.cost_center_name || '').trim() === name);
              const master = (clients || []).find(c => c && String(c.DisplayName || '').trim() === name);
              const weeklyFtes: { [weekKey: string]: number } = {};
              cAllocs.filter(a => a?.content && currentKeys.includes(a.content.allocation_date)).forEach(a => { if (a?.content) weeklyFtes[a.content.allocation_date] = parseFloat(a.content.allocation_amount || '0'); });
              return { id: uuidv4(), clientId: (master?.Code || cAllocs[0]?.content?.cost_center_number || '').trim(), clientName: name, weeklyFtes };
          });
      }
      setActiveAllocations(prev => [{ employee: employeeToAdd, allocations: initialRows }, ...prev]);
    }
    setTimeout(() => setSelectedEmployeeToAdd(''), 0);
  };

  const handleAddManagerTeam = (managerName: string) => {
    if (!currentDate) return;
    if (!managerName) {
        setSelectedManager('');
        setActiveAllocations([]);
        return;
    }
    setSelectedManager(managerName);
    setSelectedEmployeeToAdd(''); 
    const team = (allEmployees || []).filter(e => e && e.manager === managerName);
    if (team.length === 0) { 
        toast({ title: 'No employees found for this manager.' }); 
        setActiveAllocations([]);
        return; 
    }
    const currentKeys = (weeks || []).map(w => formatDateKey(w.startDate));
    const prevDate = getPreviousFiscalMonth(currentDate);
    const prevWeeks = getWeeksForFiscalMonth(prevDate);
    const prevKeys = (prevWeeks || []).map(w => formatDateKey(w.startDate));
    const allKeys = new Set([...currentKeys, ...prevKeys]);
    
    // Replace grid with filtered team using rollover logic
    const newAllocations = team.map(employee => {
        const empIdStr = `[${employee.person_id}]`;
        const empAllocs = (monthDataCache || []).filter(a => a?.content?.allocation_name && String(a.content.allocation_name).startsWith(empIdStr) && allKeys.has(a.content.allocation_date) && parseFloat(a.content?.allocation_amount || '0') > 0);
        let rows: AllocationRow[] = [];
        if (empAllocs.length === 0) {
            rows = [{ id: uuidv4(), clientId: '', clientName: '', weeklyFtes: {} }];
        } else {
            const names = Array.from(new Set(empAllocs.map(a => String(a?.content?.cost_center_name || '').trim()).filter(Boolean)));
            rows = names.map(name => {
                const cAllocs = empAllocs.filter(a => String(a?.content?.cost_center_name || '').trim() === name);
                const master = (clients || []).find(c => c && String(c.DisplayName || '').trim() === name);
                const weeklyFtes: { [key: string]: number } = {};
                cAllocs.filter(a => a?.content && currentKeys.includes(a.content.allocation_date)).forEach(a => { if (a?.content) weeklyFtes[a.content.allocation_date] = parseFloat(a.content.allocation_amount || '0'); });
                return { id: uuidv4(), clientId: (master?.Code || cAllocs[0]?.content?.cost_center_number || '').trim(), clientName: name, weeklyFtes };
            });
        }
        return { employee, allocations: rows };
    });
    setActiveAllocations(newAllocations); 
    toast({ title: 'Team Loaded', description: `Loaded ${newAllocations.length} members for ${managerName}.` });
  };

  const handleRemoveEmployee = (employeeId: string) => {
      setActiveAllocations(prev => (prev || []).filter(a => a?.employee?.person_id !== employeeId));
      setSelectedManager(''); 
  };
  
  const handleFteChange = (employeeId: string, allocId: string, weekKey: string, val: string) => {
    const fte = parseFloat(val) || 0;
    setActiveAllocations(prev => (prev || []).map(ea => ea.employee?.person_id === employeeId ? { ...ea, allocations: ea.allocations.map(a => a.id === allocId ? { ...a, weeklyFtes: { ...a.weeklyFtes, [weekKey]: fte } } : a) } : ea));
  };
  
  const handleMonthlyFteChange = (employeeId: string, allocId: string, val: string) => {
    if (!startOfCurrentWeek) return;
    const monthlyFte = parseFloat(val) || 0;
    setActiveAllocations(prev => (prev || []).map(ea => {
        if (ea.employee?.person_id === employeeId) {
          return { ...ea, allocations: ea.allocations.map(a => {
            if (a.id === allocId) {
              const updated = { ...a.weeklyFtes };
              weeks.forEach(week => {
                const key = formatDateKey(week.startDate);
                if (isWeekEditable(week.startDate)) updated[key] = monthlyFte;
              });
              return { ...a, weeklyFtes: updated };
            }
            return a;
          })};
        }
        return ea;
    }));
  };
  
  const handleClientChange = (employeeId: string, allocId: string, name: string) => {
     setActiveAllocations(prev => (prev || []).map(ea => {
        if (ea.employee?.person_id === employeeId) {
            return { ...ea, allocations: ea.allocations.map(a => {
                if (a.id === allocId) {
                    const trimmed = String(name || '').trim();
                    const master = (clients || []).find(cc => cc && String(cc.DisplayName || '').trim() === trimmed);
                    return { ...a, clientId: (master?.Code || '').trim(), clientName: trimmed };
                }
                return a;
            })};
        }
        return ea;
    }));
  };

  const handleAddAllocationRow = (employeeId: string) => {
    setActiveAllocations(prev => (prev || []).map(ea => ea.employee?.person_id === employeeId ? { ...ea, allocations: [...ea.allocations, { id: uuidv4(), clientId: '', clientName: '', weeklyFtes: {} }] } : ea));
  };

  const handleRemoveAllocationRow = (employeeId: string, allocId: string) => {
    setActiveAllocations(prev => (prev || []).map(ea => ea.employee?.person_id === employeeId ? { ...ea, allocations: ea.allocations.filter(a => a.id !== allocId) } : ea));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const submissions: any[] = [];
    let invalid = false;
    const currentKeys = new Set(weeks.map(w => formatDateKey(w.startDate)));
    activeAllocations.forEach(ea => {
      if (!ea?.employee) return;
      ea.allocations.forEach(alloc => {
        Object.entries(alloc.weeklyFtes).forEach(([key, fte]) => {
          if (currentKeys.has(key) && fte > 0) {
            if (!alloc.clientName) { invalid = true; toast({ variant: 'destructive', title: 'Missing Client', description: `Please select a client for ${ea.employee.full_name}.` }); return; }
            submissions.push({ content: { allocation_date: key, allocation_name: `[${ea.employee.person_id}] ${ea.employee.full_name}`, employee_id: ea.employee.person_id, cost_center_name: alloc.clientName, cost_center_number: alloc.clientId || alloc.clientName, allocation_amount: fte.toString() } });
          }
        });
      });
    });
    if (invalid) { setIsSaving(false); return; }
    if (submissions.length === 0) { toast({ title: 'No changes to save.' }); setIsSaving(false); return; }
    try {
        await Promise.all(submissions.map(entry => fetch('/domo/datastores/v1/collections/weekly_allocation/documents/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) }).then(res => { if (!res.ok) throw new Error('Saves failed.'); return res.json(); })));
        toast({ title: 'Allocations Saved', description: `${submissions.length} entries saved successfully.` });
        onSaveSuccess();
    } catch (error: any) { writeLog('MultiWeekGrid', 'error', 'Save failed', error); toast({ variant: 'destructive', title: 'Save Failed', description: error.message }); }
    finally { setIsSaving(false); }
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Monthly Allocation Grid</CardTitle>
              <CardDescription>Rows are preloaded if data exists in the current month or previous month (Rollover).</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <EmployeeSelect employees={availableEmployees} onValueChange={handleAddEmployee} value={selectedEmployeeToAdd} disabled={isLoading || isSaving} />
              <ManagerSelect managers={managers} onValueChange={handleAddManagerTeam} value={selectedManager} disabled={isLoading || isSaving} />
              <Button variant="outline" size="icon" onClick={handlePrevMonth} disabled={isLoading || isSaving}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium w-32 text-center">{isLoading ? <Skeleton className="h-5 w-24 mx-auto" /> : fiscalMonthLabel}</span>
              <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isLoading || isSaving}><ChevronRight className="h-4 w-4" /></Button>
              <Button onClick={handleSave} disabled={isLoading || isSaving || (activeAllocations?.length || 0) === 0}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isSaving ? 'Saving...' : 'Save All'}
              </Button>
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
                  {(weeks || []).map(week => {
                    const isCurrent = startOfCurrentWeek && isSameDay(startOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek);
                    const locked = !isWeekEditable(week.startDate);
                    return (
                      <TableHead key={week.startDate.toISOString()} className={cn("text-center min-w-[120px] transition-colors", { "bg-muted/40": locked, "bg-primary/10": isCurrent })}>
                        <div className='flex items-center justify-center gap-2'>
                          {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
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
                {!hasMounted || isLoading ? (
                  <TableRow><TableCell colSpan={(weeks?.length || 0) + 5}><div className="space-y-4 py-8"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></TableCell></TableRow>
                ) : (activeAllocations?.length || 0) === 0 ? (
                  <TableRow><TableCell colSpan={(weeks?.length || 0) + 5} className="text-center h-24 text-muted-foreground">Select an employee or manager to begin.</TableCell></TableRow>
                ) : activeAllocations.map(({ employee, allocations }) => {
                  if (!employee) return null;
                  const weeklyTotals = (weeks || []).map(week => {
                    const weekKey = formatDateKey(week.startDate);
                    return (allocations || []).reduce((t, a) => t + (a.weeklyFtes[weekKey] || 0), 0);
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
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fetchAndApplyPreviousMonthAllocations(employee)}><Copy className="h-3.5 w-3.5" /></Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Copy Prior Month's Allocations</p></TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell colSpan={3}></TableCell>
                        {weeklyTotals.map((total, index) => {
                            const isPartTime = employee.employment_type?.toLowerCase().includes('part');
                            const isOver = total > 1.0;
                            const isPTW = isPartTime && total >= 0.6 && total <= 1.0;
                            let msg = '';
                            if (isOver) msg = 'Allocated over 1.0 FTE.'; else if (isPTW) msg = 'Part-time employee allocated at/above 0.6 FTE.';
                            return (
                              <TableCell key={index} className="text-center font-semibold" colSpan={1}>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <span className={cn("text-muted-foreground", isPTW && "text-warning", isOver && "text-destructive")}>{total > 0 ? total.toFixed(2) : '-'}</span>
                                      </TooltipTrigger>
                                      {msg && <TooltipContent><p>{msg}</p></TooltipContent>}
                                  </Tooltip>
                              </TableCell>
                            )
                        })}
                        <TableCell className='text-right'><Button variant="ghost" size="icon" onClick={() => handleRemoveEmployee(employee.person_id)} disabled={isSaving}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                      {(allocations || []).map((alloc) => {
                        const weekKey0 = (weeks?.length || 0) > 0 ? formatDateKey(weeks[0].startDate) : '';
                        const bulkFte = (weekKey0 && alloc.weeklyFtes[weekKey0]) || '';
                        const allLocked = (weeks || []).every(w => !isWeekEditable(w.startDate));
                        return (
                        <TableRow key={alloc.id}>
                          <TableCell className="sticky left-0 bg-card z-10"></TableCell>
                          <TableCell><ClientSelect clients={clients} value={alloc.clientName} onValueChange={(name) => handleClientChange(employee.person_id, alloc.id, name)} disabled={allLocked || isSaving} /></TableCell>
                          <TableCell className="p-2"><Input value={alloc.clientId} readOnly className="bg-muted w-24" placeholder="Code" /></TableCell>
                          <TableCell className="text-center"><Input type="number" step="0.05" min="0" placeholder="0.00" className="w-20 text-center mx-auto" value={bulkFte} onChange={(e) => handleMonthlyFteChange(employee.person_id, alloc.id, e.target.value)} disabled={allLocked || isSaving} /></TableCell>
                          {(weeks || []).map(week => {
                            const weekKey = formatDateKey(week.startDate);
                            const locked = !isWeekEditable(week.startDate);
                            const isCurrent = startOfCurrentWeek && isSameDay(startOfWeek(week.startDate, { weekStartsOn: 1 }), startOfCurrentWeek);
                            return (
                              <TableCell key={week.startDate.toISOString()} className={cn("text-center", {"bg-muted/40": locked, "bg-primary/10": isCurrent})}>
                                  <Input type="number" step="0.05" min="0" placeholder="0.00" className={cn("w-20 text-center mx-auto", { "bg-muted/50 cursor-not-allowed": locked })} value={alloc.weeklyFtes[weekKey] || ''} onChange={(e) => handleFteChange(employee.person_id, alloc.id, weekKey, e.target.value)} disabled={locked || isSaving} readOnly={locked} />
                              </TableCell>
                            )
                          })}
                          <TableCell className='text-right'><Button variant="ghost" size="icon" onClick={() => handleRemoveAllocationRow(employee.person_id, alloc.id)} disabled={allocations.length === 1 || allLocked || isSaving}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                        </TableRow>
                      )})}
                      <TableRow>
                        <TableCell className="sticky left-0 bg-card z-10 py-2" colSpan={3}><Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleAddAllocationRow(employee.person_id)} disabled={isSaving}><PlusCircle className="mr-2 h-4 w-4" /> Add Allocation</Button></TableCell>
                        <TableCell colSpan={(weeks?.length || 0) + 2}></TableCell>
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
