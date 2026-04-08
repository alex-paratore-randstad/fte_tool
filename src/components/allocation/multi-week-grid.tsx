
'use client';

import { useState, useMemo, Fragment, useEffect, useCallback } from 'react';
import { startOfWeek, format, isSameDay, isValid } from 'date-fns';
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
  const [search, setSearch] = useState('');

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

  const filteredClients = useMemo(() => {
    const s = (search || '').toLowerCase().trim();
    if (!s) return sortedClients;
    return sortedClients.filter(c => 
      (c.DisplayName || '').toLowerCase().includes(s) || 
      (c.Code && c.Code.toLowerCase().includes(s))
    );
  }, [search, sortedClients]);

  const selectedClient = useMemo(() => {
    if (!value) return null;
    const trimmed = String(value).trim();
    return (clients || []).find(c => c && String(c.DisplayName || '').trim() === trimmed);
  }, [clients, value]);

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
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search name or code..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-64 overflow-y-auto">
            <CommandEmpty>No clients found.</CommandEmpty>
            <CommandGroup>
              {filteredClients.map((cc, idx) => (
                <CommandItem
                  key={`${cc.DisplayName}-${cc.Code || idx}`}
                  value={`${cc.DisplayName} ${cc.Code || ''}`}
                  onSelect={() => {
                    onValueChange(cc.DisplayName);
                    setOpen(false);
                    setSearch('');
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
  const [search, setSearch] = useState('');

  const filteredEmployees = useMemo(() => {
    if (!search) return employees || [];
    const s = search.toLowerCase();
    return (employees || []).filter(e => e.full_name.toLowerCase().includes(s));
  }, [search, employees]);

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
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search employee..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-64 overflow-y-auto">
            <CommandEmpty>No employees found.</CommandEmpty>
            <CommandGroup>
              {filteredEmployees.map((e) => (
                <CommandItem
                  key={e.person_id}
                  value={e.full_name}
                  onSelect={() => {
                    onValueChange(e.person_id);
                    setOpen(false);
                    setSearch('');
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
  const [search, setSearch] = useState('');

  const filteredManagers = useMemo(() => {
    if (!search) return managers || [];
    const s = search.toLowerCase();
    return (managers || []).filter(m => m.name.toLowerCase().includes(s));
  }, [search, managers]);

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
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search manager..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-64 overflow-y-auto">
            <CommandEmpty>No managers found.</CommandEmpty>
            <CommandGroup>
              {filteredManagers.map((m) => (
                <CommandItem
                  key={m.id}
                  value={m.name}
                  onSelect={() => {
                    const newValue = m.name === value ? "" : m.name;
                    onValueChange(newValue);
                    setOpen(false);
                    setSearch('');
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
  const [todayRef, setTodayRef] = useState<Date | null>(null);
  const [selectedEmployeeToAdd, setSelectedEmployeeToAdd] = useState('');
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  
  const { toast } = useToast();
  
  const isLoading = initialLoading || internalLoading;

  useEffect(() => {
    setHasMounted(true);
    const now = new Date();
    setTodayRef(now);
    setStartOfCurrentWeek(startOfWeek(now, { weekStartsOn: 1 }));
  }, []);

  const { weeks, fiscalMonthLabel } = useMemo(() => {
    if (!currentDate || !isValid(currentDate)) return { weeks: [], fiscalMonthLabel: 'Loading...' };
    const fiscalData = getFiscalDataForDate(currentDate);
    const monthWeeks: FiscalWeek[] = getWeeksForFiscalMonth(currentDate);
    const label = fiscalData ? `${fiscalData.Reporting_Month} ${fiscalData.Reporting_Year}` : 'Loading...';
    return { weeks: monthWeeks, fiscalMonthLabel: label };
  }, [currentDate]);

  /**
   * LOCKING LOGIC:
   * Edits are permitted for current and previous fiscal months only.
   * This applies to ALL users, including admins.
   */
  const isWeekEditable = useCallback((weekStartDate: Date) => {
    if (!todayRef) return false;
    
    const weekFiscal = getFiscalDataForDate(weekStartDate);
    const todayFiscal = getFiscalDataForDate(todayRef);
    
    if (!weekFiscal || !todayFiscal) return false;

    const monthMap: Record<string, number> = {
      'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
      'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
    };

    const getMonthVal = (f: { Reporting_Month: string, Reporting_Year: string | number }) => {
        if (!f) return 0;
        const mStr = String(f.Reporting_Month || '').substring(0, 3).toUpperCase();
        let m = monthMap[mStr] || 0;
        if (m === 0) {
            const numericMatch = String(f.Reporting_Month || '').match(/\d+/);
            if (numericMatch) m = parseInt(numericMatch[0], 10);
        }
        const yStr = String(f.Reporting_Year || '').replace(/\D/g, '');
        const y = parseInt(yStr, 10) || 0;
        return y * 12 + m;
    };

    const currentMonthValue = getMonthVal(todayFiscal);
    const targetMonthValue = getMonthVal(weekFiscal);
    
    return targetMonthValue >= (currentMonthValue - 1);
  }, [todayRef]);

  const isMonthLocked = useMemo(() => {
    if (weeks.length === 0) return false;
    return weeks.every(w => !isWeekEditable(w.startDate));
  }, [weeks, isWeekEditable]);

  const fetchMonthData = useCallback(async () => {
    if (!currentDate || !isValid(currentDate) || (weeks?.length || 0) === 0) return;
    setInternalLoading(true);
    try {
        const currentMonthWeekKeys = weeks.map(w => formatDateKey(w.startDate));
        const prevMonthDate = getPreviousFiscalMonth(currentDate);
        const prevMonthWeeks = getWeeksForFiscalMonth(prevMonthDate);
        const prevMonthWeekKeys = (prevMonthWeeks || []).map(w => formatDateKey(w.startDate));
        const allRelevantWeeks = Array.from(new Set([...currentMonthWeekKeys, ...prevMonthWeekKeys]));
        
        const weeklyDataPromises = allRelevantWeeks.map(weekKey => 
            fetch(`/domo/datastores/v1/collections/weekly_allocation/documents?q=content.allocation_date='${weekKey}'`).then(res => res.ok ? res.json() : [])
        );
        const nestedAllocations = await Promise.all(weeklyDataPromises);
        const allRelevantAllocations: WeeklyAllocation[] = nestedAllocations.flat().filter(a => a && a.content);
        setMonthDataCache(allRelevantAllocations);
        
        setActiveAllocations(prev => (prev || []).map(empAlloc => {
            if (!empAlloc?.employee) return empAlloc;
            const employeeIdString = `[${empAlloc.employee.person_id}]`;
            
            const empAllAllocs = allRelevantAllocations.filter(alloc => 
                alloc?.content?.allocation_name && 
                String(alloc.content.allocation_name).startsWith(employeeIdString) &&
                parseFloat(alloc.content?.allocation_amount || '0') > 0
            );
            
            const clientNames = new Set<string>();
            empAllAllocs.forEach(a => { if (a?.content?.cost_center_name) clientNames.add(String(a.content.cost_center_name).trim()); });
            
            if (clientNames.size === 0) {
                return { ...empAlloc, allocations: [{ id: uuidv4(), clientId: '', clientName: '', weeklyFtes: {} }] };
            }
            
            const newAllocationRows: AllocationRow[] = Array.from(clientNames).map(clientName => {
                const clientSpecificAllocs = empAllAllocs.filter(a => String(a?.content?.cost_center_name || '').trim() === clientName);
                const masterClient = (clients || []).find(c => c && String(c.DisplayName || '').trim() === clientName);
                const weeklyFtes: { [weekKey: string]: number } = {};
                
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
    fetchData();
  }, [fetchData]);

  const availableEmployees = useMemo(() => {
    const activeIds = new Set((activeAllocations || []).map(a => a?.employee?.person_id).filter(Boolean));
    return (allEmployees || []).filter(e => e?.person_id && !activeIds.has(e.person_id));
  }, [allEmployees, activeAllocations]);

  const handlePrevMonth = () => { if (currentDate && isValid(currentDate)) setCurrentDate(getPreviousFiscalMonth(currentDate)); };
  const handleNextMonth = () => { if (currentDate && isValid(currentDate)) setCurrentDate(getNextFiscalMonth(currentDate)); };

  const handleFteChange = (employeeId: string, allocId: string, weekKey: string, val: string) => {
    const fte = parseFloat(val) || 0;
    setActiveAllocations(prev => (prev || []).map(ea => ea.employee?.person_id === employeeId ? { ...ea, allocations: ea.allocations.map(a => a.id === allocId ? { ...a, weeklyFtes: { ...a.weeklyFtes, [weekKey]: fte } } : a) } : ea));
  };
  
  const handleMonthlyFteChange = (employeeId: string, allocId: string, val: string) => {
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
    
    const currentKeys = weeks.filter(w => isWeekEditable(w.startDate)).map(w => formatDateKey(w.startDate));
    const validKeysSet = new Set(currentKeys);

    activeAllocations.forEach(ea => {
      if (!ea?.employee) return;
      ea.allocations.forEach(alloc => {
        Object.entries(alloc.weeklyFtes).forEach(([key, fte]) => {
          if (validKeysSet.has(key) && fte > 0) {
            if (!alloc.clientName) { 
                invalid = true; 
                toast({ variant: 'destructive', title: 'Missing Client', description: `Please select a client for ${ea.employee.full_name}.` }); 
                return; 
            }
            submissions.push({ 
                content: { 
                    allocation_date: key, 
                    allocation_name: `[${ea.employee.person_id}] ${ea.employee.full_name}`, 
                    employee_id: ea.employee.person_id, 
                    cost_center_name: alloc.clientName, 
                    cost_center_number: alloc.clientId || alloc.clientName, 
                    allocation_amount: fte.toString() 
                } 
            });
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
              <div className="flex items-center gap-3">
                <CardTitle>Monthly Allocation Grid</CardTitle>
                {isMonthLocked && (
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/30 px-3 py-1">
                        <Lock className="h-3.5 w-3.5 mr-2" /> Read Only
                    </Badge>
                )}
              </div>
              <CardDescription>
                Edits permitted for current and previous fiscal months only. 
                Historical periods are locked for ALL users.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <EmployeeSelect employees={availableEmployees} onValueChange={handleAddEmployee} value={selectedEmployeeToAdd} disabled={isLoading || isSaving} />
              <ManagerSelect managers={managers} onValueChange={handleAddManagerTeam} value={selectedManager} disabled={isLoading || isSaving} />
              <Button variant="outline" size="icon" onClick={handlePrevMonth} disabled={isLoading || isSaving}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium w-32 text-center">{isLoading ? <Skeleton className="h-5 w-24 mx-auto" /> : fiscalMonthLabel}</span>
              <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isLoading || isSaving}><ChevronRight className="h-4 w-4" /></Button>
              <Button onClick={handleSave} disabled={isLoading || isSaving || (activeAllocations?.length || 0) === 0 || isMonthLocked}>
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
                        <TableCell className='text-right'></TableCell>
                      </TableRow>
                      {(allocations || []).map((alloc) => {
                        const weekKey0 = (weeks?.length || 0) > 0 ? formatDateKey(weeks[0].startDate) : '';
                        const bulkFteValue = (weekKey0 && alloc.weeklyFtes[weekKey0]);
                        const displayBulkFte = bulkFteValue ? (Number(bulkFteValue) || 0).toFixed(2) : '';
                        
                        return (
                        <TableRow key={alloc.id}>
                          <TableCell className="sticky left-0 bg-card z-10"></TableCell>
                          <TableCell><ClientSelect clients={clients} value={alloc.clientName} onValueChange={(name) => handleClientChange(employee.person_id, alloc.id, name)} disabled={isMonthLocked || isSaving} /></TableCell>
                          <TableCell className="p-2"><Input value={alloc.clientId} readOnly className="bg-muted w-24" placeholder="Code" /></TableCell>
                          <TableCell className="text-center"><Input type="number" step="0.05" min="0" placeholder="0.00" className="w-20 text-center mx-auto" value={displayBulkFte} onChange={(e) => handleMonthlyFteChange(employee.person_id, alloc.id, e.target.value)} disabled={isMonthLocked || isSaving} /></TableCell>
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
                          <TableCell className='text-right'><Button variant="ghost" size="icon" onClick={() => handleRemoveAllocationRow(employee.person_id, alloc.id)} disabled={allocations.length === 1 || isMonthLocked || isSaving}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                        </TableRow>
                      )})}
                      <TableRow>
                        <TableCell className="sticky left-0 bg-card z-10 py-2" colSpan={3}><Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleAddAllocationRow(employee.person_id)} disabled={isSaving || isMonthLocked}><PlusCircle className="mr-2 h-4 w-4" /> Add Allocation</Button></TableCell>
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
