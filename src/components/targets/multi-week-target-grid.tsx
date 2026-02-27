
'use client';

import { useState, useMemo, Fragment, useEffect, useCallback, useRef } from 'react';
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
import { ChevronLeft, ChevronRight, PlusCircle, Trash2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { TeamMember, WeeklyTarget } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { v4 as uuidv4 } from 'uuid';
import { writeLog } from '@/lib/logger';

type AiReportData = {
    Code: string;
    Name: string;
    DisplayName: string;
    RollsUpTo: string;
};

const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

const getQuarterStartDate = (year: number, quarter: string) => {
    const quarterMonth = (parseInt(quarter.substring(1)) - 1) * 3 + 1;
    return `${year}-${quarterMonth.toString().padStart(2, '0')}-01`;
}

type TargetRow = {
  id: string;
  clientId: string;
  clientName: string;
  quarterlyTargets: { [quarterKey: string]: number };
};

type EmployeeTarget = {
  employee: TeamMember;
  targets: TargetRow[];
};

type QuarterlyTargetGridProps = {
  currentYear: number;
  setCurrentYear: (year: number) => void;
  onSaveSuccess: () => void;
};

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
    const validClients = clients.filter(c => c && c.DisplayName);
    const sorted = [...validClients].sort((a, b) => (a.DisplayName || '').localeCompare(b.DisplayName || ''));
    if (!searchTerm) return sorted;
    return sorted.filter(cc => cc.DisplayName && cc.DisplayName.toLowerCase().includes(searchTerm.toLowerCase()));
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
    const validEmps = employees.filter(e => e && e.full_name);
    const sortedEmployees = [...validEmps].sort((a,b) => (a.full_name || '').localeCompare(b.full_name || ''));
    if (!searchTerm) return sortedEmployees;
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
    const validManagers = managers.filter(m => m && m.name);
    const sortedManagers = [...validManagers].sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    if (!searchTerm) return sortedManagers;
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


export function QuarterlyTargetGrid({ currentYear, setCurrentYear, onSaveSuccess }: QuarterlyTargetGridProps) {
  const [activeTargets, setActiveTargets] = useState<EmployeeTarget[]>([]);
  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [managers, setManagers] = useState<{id: string, name: string}[]>([]);
  const [clients, setClients] = useState<AiReportData[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [yearDataCache, setYearDataCache] = useState<WeeklyTarget[]>([]);
  const [selectedEmployeeToAdd, setSelectedEmployeeToAdd] = useState('');
  const [hasMounted, setHasMounted] = useState(false);

  const { currentUser, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const fetchYearData = useCallback(async () => {
    setInternalLoading(true);
    try {
        const quarterDates = quarters.map(q => getQuarterStartDate(currentYear, q));
        const requests = quarterDates.map(date => fetch(`/domo/datastores/v1/collections/weekly_targets/documents?q=content.targets_allocation_date='${date}'`));
        const responses = await Promise.all(requests);
        const allYearlyTargets: WeeklyTarget[] = (await Promise.all(responses.map(res => res.ok ? res.json() : []))).flat();
        setYearDataCache(allYearlyTargets);

        // Refresh active employees
        setActiveTargets(prev => prev.map(empTarget => {
            const employeeIdString = `[${empTarget.employee.person_id}]`;
            const employeeTargets = allYearlyTargets.filter(t => t?.content?.targets_allocation_name?.startsWith(employeeIdString));
            
            if (employeeTargets.length === 0) {
                return { ...empTarget, targets: [{ id: uuidv4(), clientId: '', clientName: '', quarterlyTargets: {} }] };
            }

            const clientTargetsMap = new Map<string, { clientName: string, quarterlyTargets: { [key: string]: number } }>();
            employeeTargets.forEach(target => {
                const clientKey = target.content.targets_cost_center_number;
                if (!clientTargetsMap.has(clientKey)) {
                    clientTargetsMap.set(clientKey, { clientName: target.content.targets_cost_center_name, quarterlyTargets: {} });
                }
                const date = new Date(target.content.targets_allocation_date);
                const quarterIndex = Math.floor(date.getUTCMonth() / 3);
                clientTargetsMap.get(clientKey)!.quarterlyTargets[quarters[quarterIndex]] = parseInt(target.content.targets_allocation_amount, 10) || 0;
            });

            const newTargetRows = Array.from(clientTargetsMap.entries()).map(([clientId, data]) => ({
                id: uuidv4(),
                clientId,
                clientName: data.clientName,
                quarterlyTargets: data.quarterlyTargets,
            }));

            return { ...empTarget, targets: newTargetRows };
        }));

    } catch (error) {
        writeLog('QuarterlyTargetGrid', 'error', 'Failed to fetch year targets cache', error);
    } finally {
        setInternalLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    if (hasMounted) {
        fetchYearData();
    }
  }, [currentYear, fetchYearData, hasMounted]);

  const fetchBaseData = useCallback(async () => {
    setInternalLoading(true);
    try {
      const [empResponse, clientResponse] = await Promise.all([
        fetch(`/data/v1/consolidated_hr_fte_report_view`),
        fetch(`/data/v1/ai_report`),
      ]);

      const rawEmps = empResponse.ok ? await empResponse.json() : [];
      const rawClients = clientResponse.ok ? await clientResponse.json() : [];

      const empData: TeamMember[] = (Array.isArray(rawEmps) ? rawEmps : [])
        .filter((e: TeamMember) => e && e.full_name && e.person_id)
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

      const clientData: AiReportData[] = (Array.isArray(rawClients) ? rawClients : [])
        .filter((c: AiReportData) => c && c.Code && c.DisplayName);
      
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
      setClients([...clientData]);
      
      const managerMap = new Map<string, string>();
      empData.forEach(emp => { if(emp.manager_id && emp.manager) managerMap.set(emp.manager_id, emp.manager); });
      setManagers(Array.from(managerMap, ([id, name]) => ({ id, name })).sort((a, b) => (a.name || '').localeCompare(b.name || '')));

    } catch (error) {
      writeLog('QuarterlyTargetGrid', 'error', 'Failed to fetch metadata', error);
      toast({ variant: 'destructive', title: 'Failed to fetch data' });
    } finally {
      setInternalLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if(!userLoading) fetchBaseData();
  }, [fetchBaseData, userLoading]);

  const availableEmployees = useMemo(() => {
    const activeEmployeeIds = new Set(activeTargets.map(a => a.employee.person_id));
    return allEmployees.filter(e => e && e.person_id && !activeEmployeeIds.has(e.person_id));
  }, [allEmployees, activeTargets]);

  const handleAddEmployee = (employeeId: string) => {
    if (!employeeId) return;
    setSelectedEmployeeToAdd(employeeId);
    const employeeToAdd = allEmployees.find(e => e && e.person_id === employeeId);
    if (employeeToAdd) {
      if (activeTargets.some(a => a.employee.person_id === employeeId)) {
          toast({ variant: 'destructive', title: 'Employee already in grid' }); return;
      }
      
      const employeeIdString = `[${employeeToAdd.person_id}]`;
      const employeeTargets = yearDataCache.filter(t => t?.content?.targets_allocation_name?.startsWith(employeeIdString));
      
      let rows: TargetRow[] = [];
      if (employeeTargets.length === 0) {
          rows = [{ id: uuidv4(), clientId: '', clientName: '', quarterlyTargets: {} }];
      } else {
          const clientTargetsMap = new Map<string, { clientName: string, quarterlyTargets: { [key: string]: number } }>();
          employeeTargets.forEach(target => {
              const clientKey = target.content.targets_cost_center_number;
              if (!clientTargetsMap.has(clientKey)) {
                  clientTargetsMap.set(clientKey, { clientName: target.content.targets_cost_center_name, quarterlyTargets: {} });
              }
              const date = new Date(target.content.targets_allocation_date);
              const quarterIndex = Math.floor(date.getUTCMonth() / 3);
              clientTargetsMap.get(clientKey)!.quarterlyTargets[quarters[quarterIndex]] = parseInt(target.content.targets_allocation_amount, 10) || 0;
          });
          rows = Array.from(clientTargetsMap.entries()).map(([clientId, data]) => ({
              id: uuidv4(),
              clientId,
              clientName: data.clientName,
              quarterlyTargets: data.quarterlyTargets,
          }));
      }
      
      setActiveTargets(prev => [{ employee: employeeToAdd, targets: rows }, ...prev]);
    }
    setTimeout(() => setSelectedEmployeeToAdd(''), 0);
  };

  const handleAddManagerTeam = (managerId: string) => {
    if (!managerId) return;
    const teamMembers = allEmployees.filter(e => e && e.manager_id === managerId && !activeTargets.some(a => a.employee.person_id === e.person_id));
    if (teamMembers.length === 0) { toast({ title: 'No new employees to add', description: 'All direct reports for this manager are already in the grid.' }); return; }
    
    const newEmployeeTargets = teamMembers.map(employee => {
        const employeeIdString = `[${employee.person_id}]`;
        const employeeTargets = yearDataCache.filter(t => t?.content?.targets_allocation_name?.startsWith(employeeIdString));
        
        let rows: TargetRow[] = [];
        if (employeeTargets.length === 0) {
            rows = [{ id: uuidv4(), clientId: '', clientName: '', quarterlyTargets: {} }];
        } else {
            const clientTargetsMap = new Map<string, { clientName: string, quarterlyTargets: { [key: string]: number } }>();
            employeeTargets.forEach(target => {
                const clientKey = target.content.targets_cost_center_number;
                if (!clientTargetsMap.has(clientKey)) {
                    clientTargetsMap.set(clientKey, { clientName: target.content.targets_cost_center_name, quarterlyTargets: {} });
                }
                const date = new Date(target.content.targets_allocation_date);
                const quarterIndex = Math.floor(date.getUTCMonth() / 3);
                clientTargetsMap.get(clientKey)!.quarterlyTargets[quarters[quarterIndex]] = parseInt(target.content.targets_allocation_amount, 10) || 0;
            });
            rows = Array.from(clientTargetsMap.entries()).map(([clientId, data]) => ({
                id: uuidv4(),
                clientId,
                clientName: data.clientName,
                quarterlyTargets: data.quarterlyTargets,
            }));
        }
        return { employee, targets: rows };
    });

    setActiveTargets(prev => [...newEmployeeTargets, ...prev]);
    toast({ title: 'Team Loaded', description: `Loaded ${newEmployeeTargets.length} team members.` });
  };

  const handleRemoveEmployee = (employeeId: string) => setActiveTargets(prev => prev.filter(a => a.employee.person_id !== employeeId));
  
  const handleTargetChange = (employeeId: string, rowId: string, quarter: string, value: string) => {
    const newTarget = parseInt(value, 10) || 0;
    setActiveTargets(prev => prev.map(emp => (emp.employee.person_id === employeeId ? {
      ...emp, targets: emp.targets.map(row => (row.id === rowId ? {
        ...row, quarterlyTargets: { ...row.quarterlyTargets, [quarter]: newTarget }
      } : row))
    } : emp)));
  };
  
  const handleClientChange = (employeeId: string, rowId: string, newClientName: string) => {
     setActiveTargets(prev => prev.map(emp => (emp.employee.person_id === employeeId ? {
        ...emp, targets: emp.targets.map(row => (row.id === rowId ? {
            ...row, clientName: newClientName, clientId: clients.find(c => c.DisplayName === newClientName)?.Code || ''
        } : row))
     } : emp)));
  };

  const handleAddTargetRow = (employeeId: string) => {
    setActiveTargets(prev => prev.map(emp => (emp.employee.person_id === employeeId ? {
      ...emp, targets: [...emp.targets, { id: uuidv4(), clientId: '', clientName: '', quarterlyTargets: {} }]
    } : emp)));
  };

  const handleRemoveTargetRow = (employeeId: string, rowId: string) => {
    setActiveTargets(prev => prev.map(emp => (emp.employee.person_id === employeeId ? {
      ...emp, targets: emp.targets.filter(r => r.id !== rowId)
    } : emp)));
  };

  const handleSave = async () => {
    const yearAtSave = currentYear;
    const submissions: any[] = [];
    let hasInvalidTarget = false;

    activeTargets.forEach(emp => {
      emp.targets.forEach(row => {
        Object.entries(row.quarterlyTargets).forEach(([quarter, target]) => {
          if (target > 0) {
             if (!row.clientId || !row.clientName) {
                hasInvalidTarget = true;
                toast({ variant: 'destructive', title: 'Missing Client', description: `Please select a client for ${emp.employee.full_name}.` });
                return;
            }
            submissions.push({ content: {
                targets_allocation_date: getQuarterStartDate(yearAtSave, quarter),
                targets_allocation_name: `[${emp.employee.person_id}] ${emp.employee.full_name}`,
                targets_cost_center_name: row.clientName,
                targets_cost_center_number: row.clientId,
                targets_allocation_amount: target.toString(),
            }});
          }
        });
      });
    });

    if (hasInvalidTarget) return;
    if (submissions.length === 0) { toast({ title: 'No changes to save.' }); return; }

    try {
        await Promise.all(submissions.map(entry => 
            fetch('/domo/datastores/v1/collections/weekly_targets/documents/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
            }).then(res => { if (!res.ok) throw new Error('One or more saves failed.') })
        ));
        toast({ title: 'Targets Saved', description: `${submissions.length} target entries have been saved for ${yearAtSave}.` });
        writeLog('QuarterlyTargetGrid', 'success', 'Targets saved', { count: submissions.length, year: yearAtSave });
        onSaveSuccess();
    } catch (error: any) {
        writeLog('QuarterlyTargetGrid', 'error', 'Save failed', error);
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };
  
  const pageIsLoading = internalLoading || userLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Quarterly Target Grid</CardTitle>
            <CardDescription>Add employees to build your hiring target plan for the year.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <EmployeeSelect employees={availableEmployees} onValueChange={handleAddEmployee} value={selectedEmployeeToAdd} disabled={pageIsLoading} />
            <ManagerSelect managers={managers} onValueChange={handleAddManagerTeam} disabled={pageIsLoading} />
            <Button variant="outline" size="icon" onClick={() => setCurrentYear(currentYear - 1)} disabled={pageIsLoading}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium w-20 text-center">{pageIsLoading ? <Skeleton className="h-5 w-16 mx-auto" /> : currentYear}</span>
            <Button variant="outline" size="icon" onClick={() => setCurrentYear(currentYear + 1)} disabled={pageIsLoading}><ChevronRight className="h-4 w-4" /></Button>
            <Button onClick={handleSave} disabled={pageIsLoading || activeTargets.length === 0}>Save All</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] sticky left-0 bg-card z-10">Employee</TableHead>
                  <TableHead className="min-w-[220px]">Client Name</TableHead>
                  {quarters.map(q => <TableHead key={q} className="text-center min-w-[120px]">{q}</TableHead>)}
                  <TableHead className="w-[80px]"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {!hasMounted || pageIsLoading ? (
                <TableRow><TableCell colSpan={7}><div className="space-y-4 py-8"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></TableCell></TableRow>
              ) : activeTargets.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Select an employee to begin.</TableCell></TableRow>
              ) : activeTargets.map(({ employee, targets }) => (
                    <Fragment key={employee.person_id}>
                      <TableRow className="bg-muted/50 hover:bg-muted">
                        <TableCell className="font-semibold sticky left-0 bg-muted/50 z-10">
                          {employee.full_name}
                          <div className="text-xs text-muted-foreground font-normal">{employee.title}</div>
                        </TableCell>
                        <TableCell></TableCell>
                        {quarters.map(q => <TableCell key={q} className="text-center font-semibold text-muted-foreground">{targets.reduce((sum, row) => sum + (row.quarterlyTargets[q] || 0), 0) || '-'}</TableCell>)}
                        <TableCell className='text-right'><Button variant="ghost" size="icon" onClick={() => handleRemoveEmployee(employee.person_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                      {targets.map(row => (
                        <TableRow key={row.id}>
                          <TableCell className="sticky left-0 bg-card z-10"></TableCell>
                          <TableCell><ClientSelect clients={clients} value={row.clientName} onValueChange={name => handleClientChange(employee.person_id, row.id, name)}/></TableCell>
                          {quarters.map(q => (
                              <TableCell key={q} className="text-center">
                                <Input type="number" step="1" min="0" placeholder="0" className="w-20 text-center mx-auto"
                                  value={row.quarterlyTargets[q] || ''}
                                  onChange={e => handleTargetChange(employee.person_id, row.id, q, e.target.value)}
                                />
                              </TableCell>
                          ))}
                          <TableCell className='text-right'><Button variant="ghost" size="icon" onClick={() => handleRemoveTargetRow(employee.person_id, row.id)} disabled={targets.length <= 1}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="sticky left-0 bg-card z-10 py-2" colSpan={2}>
                          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleAddTargetRow(employee.person_id)}><PlusCircle className="mr-2 h-4 w-4" /> Add Target Row</Button>
                        </TableCell>
                        <TableCell colSpan={5}></TableCell>
                      </TableRow>
                    </Fragment>
                  ))}
              </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
