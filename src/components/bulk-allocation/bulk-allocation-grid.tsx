
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, X } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { TeamMember } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea } from '../ui/scroll-area';
import { SelectSearch } from '../ui/select-search';
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertDescription } from '../ui/alert';
import { Label } from '../ui/label';
import type { SummaryEntry } from './saved-bulk-allocations-table';
import { writeLog } from '@/lib/logger';
import { Badge } from '../ui/badge';

type AiReportData = {
    Code: string;
    Name: string;
    DisplayName: string;
    RollsUpTo: string;
};
type AllocationRow = { id: string; clientName: string; fte: number };

type BulkAllocationGridProps = {
  onSaveSuccess: () => void;
  templateToCopy: SummaryEntry[] | null;
};

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

// New self-contained component for the Client dropdown
const ClientSelect = ({
  clients,
  value,
  onValueChange,
  disabled,
}: {
  clients: AiReportData[],
  value: string,
  onValueChange: (value: string) => void,
  disabled?: boolean;
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
      
      if (aIsSpecial && bIsSpecial) {
          return a.DisplayName === 'Unallocated' ? -1 : 1;
      }
      
      return (a.DisplayName || '').localeCompare(b.DisplayName || '');
    });

    if (!searchTerm) {
      return sorted;
    }
    return sorted.filter(client =>
      client.DisplayName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
          <SelectValue placeholder="Select Client..." />
      </SelectTrigger>
      <SelectContent>
          <SelectSearch placeholder="Search client..." onChange={setSearchTerm} />
          <ScrollArea className="h-64">
            {filteredClients.map(client => <SelectItem key={client.Code} value={client.DisplayName}>{client.DisplayName}</SelectItem>)}
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

const ManagerSelect = ({ 
  managers, 
  onValueChange,
  disabled,
}: { 
  managers: {id: string, name: string}[], 
  onValueChange: (value: string) => void,
  disabled?: boolean,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredManagers = useMemo(() => {
    const sortedManagers = managers.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    if (!searchTerm) {
      return sortedManagers;
    }
    return sortedManagers.filter(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [managers, searchTerm]);

  return (
    <Select onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-full">
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


export function BulkAllocationGrid({ onSaveSuccess, templateToCopy }: BulkAllocationGridProps) {
  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<AiReportData[]>([]);
  const [managers, setManagers] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [allocationRows, setAllocationRows] = useState<AllocationRow[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);


  const { currentUser, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  
  useEffect(() => {
    setHasMounted(true);
    // Set date state on client to avoid hydration mismatch
    const now = new Date();
    setSelectedMonth(months[now.getMonth()]);
    setSelectedYear(now.getFullYear().toString());
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empResponse, clientResponse] = await Promise.all([
        fetch(`/data/v1/consolidated_hr_fte_report_view`),
        fetch(`/data/v1/ai_report`),
      ]);

      if (!empResponse.ok) writeLog('BulkAllocationGrid', 'warning', 'Could not fetch employee data', { status: empResponse.status });
      if (!clientResponse.ok) writeLog('BulkAllocationGrid', 'warning', 'Could not fetch client data', { status: clientResponse.status });
      
      const empData: TeamMember[] = empResponse.ok ? (await empResponse.json()).filter((e: TeamMember) => e.full_name).sort((a,b) => (a.full_name || '').localeCompare(b.full_name || '')) : [];
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

    } catch (error) {
      writeLog('BulkAllocationGrid', 'error', 'Failed to fetch initial data', error);
      toast({ variant: 'destructive', title: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  const selectedEmployeeDetails = useMemo(() => {
    return Array.from(selectedEmployees)
      .map(id => allEmployees.find(e => e.person_id === id))
      .filter((e): e is TeamMember => !!e)
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [selectedEmployees, allEmployees]);

  const totalSelectedFte = useMemo(() => {
    return selectedEmployeeDetails.reduce((sum, e) => sum + (parseFloat(e.fte || '0')), 0);
  }, [selectedEmployeeDetails]);
  
  useEffect(() => {
    if (templateToCopy) {
      if (totalSelectedFte === 0) {
        toast({
          title: 'Select Employees First',
          description: 'Copying template as a 1.0 FTE base. Select employees to see the true distribution.',
        });
        const newAllocationRows = templateToCopy.map(summary => ({
          id: uuidv4(),
          clientName: summary.name,
          fte: summary.percentage, // Show percentage as FTE for now
        }));
        setAllocationRows(newAllocationRows);
      } else {
        const newAllocationRows = templateToCopy.map(summary => ({
          id: uuidv4(),
          clientName: summary.name,
          fte: summary.percentage * totalSelectedFte
        }));
        setAllocationRows(newAllocationRows);
        toast({ title: 'Template Copied', description: 'Allocation profile has been copied. Review the FTE distribution.' });
      }
    } else {
        // Only set the initial row if the allocationRows array is empty.
        // This prevents overwriting user's manually entered rows when they select employees.
        if (allocationRows.length === 0) {
            setAllocationRows([{ id: uuidv4(), clientName: '', fte: 0 }]);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateToCopy, totalSelectedFte]);

  useEffect(() => {
    if (!userLoading) {
      fetchData();
    }
  }, [fetchData, userLoading, currentUser.id]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearchTerm) {
      return allEmployees;
    }
    return allEmployees.filter(e => e.full_name?.toLowerCase().includes(employeeSearchTerm.toLowerCase()));
  }, [allEmployees, employeeSearchTerm]);
  
  const totalAllocatedFte = useMemo(() => {
    return allocationRows.reduce((sum, row) => sum + (Number(row.fte) || 0), 0);
  }, [allocationRows]);

  const handleEmployeeToggle = (employeeId: string, isSelected: boolean) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(employeeId);
      } else {
        newSet.delete(employeeId);
      }
      return newSet;
    });
  };

  const handleAddAllocationRow = () => {
    setAllocationRows(prev => [...prev, { id: uuidv4(), clientName: '', fte: 0 }]);
  };

  const handleRemoveAllocationRow = (id: string) => {
    setAllocationRows(prev => prev.filter(row => row.id !== id));
  };
  
  const handleAllocationChange = (id: string, field: 'clientName' | 'fte', value: string) => {
    setAllocationRows(prev => prev.map(row => {
      if (row.id === id) {
        if (field === 'fte') {
          return { ...row, [field]: Number(value) };
        }
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const handleLoadManagerTeam = (managerId: string) => {
    if (!managerId) return;

    const teamMemberIds = allEmployees
        .filter(e => e.manager_id === managerId)
        .map(e => e.person_id);

    if (teamMemberIds.length === 0) {
      toast({ title: 'No employees found for this manager.' });
      return;
    }

    setSelectedEmployees(prev => {
        const newSet = new Set(prev);
        teamMemberIds.forEach(id => newSet.add(id));
        return newSet;
    });

    toast({ title: 'Team Loaded', description: `${teamMemberIds.length} employee(s) have been selected.` });
  };

  const handleSave = async () => {
    if (selectedEmployees.size === 0) {
      toast({ variant: 'destructive', title: 'No employees selected.' });
      return;
    }
    if (Math.abs(totalAllocatedFte - totalSelectedFte) > 0.01) {
      toast({ variant: 'destructive', title: 'Allocation Mismatch', description: `Total allocated FTE (${totalAllocatedFte.toFixed(2)}) must match the selected employees' total FTE (${totalSelectedFte.toFixed(2)}).` });
      return;
    }
    if (allocationRows.some(row => !row.clientName || row.fte < 0)) {
        toast({ variant: 'destructive', title: 'Invalid allocation rows.', description: 'Please ensure every row has a client and an allocation of 0 or more.' });
        return;
    }
    if (!selectedMonth || !selectedYear) {
      toast({ variant: 'destructive', title: 'Please select a month and year.' });
      return;
    }


    setIsSubmitting(true);
    const bulkAllocationId = uuidv4();
    const allocationDate = new Date().toISOString();
    const allocationMonthYear = `${selectedMonth} ${selectedYear}`;

    const employeeSubmissions = Array.from(selectedEmployees).map(employeeId => {
      const employee = allEmployees.find(e => e.person_id === employeeId);
      return fetch('/domo/datastores/v1/collections/bulk_allocation_fte/documents/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            bulk_allocation_id: bulkAllocationId,
            employee_id: employeeId,
            employee_name: employee?.full_name || 'Unknown',
            bulk_allocation_date: allocationDate,
            allocation_monthyear: allocationMonthYear,
          }
        }),
      });
    });

    const summarySubmissions = allocationRows.map(row => {
      const client = clients.find(c => c.DisplayName === row.clientName);
      // Convert FTE back to percentage for storage in the "profile"
      const percentage = totalSelectedFte > 0 ? row.fte / totalSelectedFte : 0;
      return fetch('/domo/datastores/v1/collections/bulk_allocation_summary/documents/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            bulk_allocation_id: bulkAllocationId,
            cost_center_number: client?.Code || 'Unknown',
            cost_center_name: row.clientName,
            allocation_percentage: percentage.toString(),
            bulk_allocation_date: allocationDate,
          }
        }),
      });
    });

    try {
      const allPromises = [...employeeSubmissions, ...summarySubmissions];
      const results = await Promise.all(allPromises);

      if (results.some(res => !res.ok)) {
        throw new Error('One or more submissions failed.');
      }
      
      writeLog('BulkAllocationGrid', 'success', 'Bulk allocation saved', { count: selectedEmployees.size, month: allocationMonthYear });
      toast({ title: 'Bulk Allocation Saved', description: `Assigned allocation profile to ${selectedEmployees.size} employees for ${allocationMonthYear}.` });
      
      // Reset form
      setSelectedEmployees(new Set());
      setAllocationRows([{ id: uuidv4(), clientName: '', fte: 0 }]);
      onSaveSuccess();

    } catch (error: any) {
      writeLog('BulkAllocationGrid', 'error', 'Bulk allocation save failed', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isPageLoading = loading || userLoading || !hasMounted;
  const isAllocationInvalid = Math.abs(totalAllocatedFte - totalSelectedFte) > 0.01;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Select Employees</CardTitle>
          <CardDescription>Choose the employees who will share this allocation profile.</CardDescription>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Input 
              placeholder="Search employees..." 
              value={employeeSearchTerm}
              onChange={e => setEmployeeSearchTerm(e.target.value)}
              disabled={isPageLoading}
            />
             <ManagerSelect 
                managers={managers} 
                onValueChange={handleLoadManagerTeam} 
                disabled={isPageLoading}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPageLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-5 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredEmployees.length > 0 ? (
                  filteredEmployees.map(emp => (
                    <TableRow key={emp.person_id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedEmployees.has(emp.person_id)}
                          onCheckedChange={checked => handleEmployeeToggle(emp.person_id, !!checked)}
                          aria-label={`Select ${emp.full_name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{emp.full_name || ''}</TableCell>
                      <TableCell className="text-muted-foreground">{emp.title || ''}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                      No employees to display.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        <CardFooter>
            <div className="text-sm text-muted-foreground">
                {selectedEmployees.size} employee(s) selected, for a total of {totalSelectedFte.toFixed(2)} FTE.
            </div>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Define Allocation</CardTitle>
          <CardDescription>Define the client allocation in FTE. Must sum to the total FTE of selected employees.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="month">Month</Label>
                    <Select value={selectedMonth || ''} onValueChange={(value) => setSelectedMonth(value)} disabled={isPageLoading}>
                        <SelectTrigger id="month">
                            <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="year">Year</Label>
                    <Select value={selectedYear || ''} onValueChange={(value) => setSelectedYear(value)} disabled={isPageLoading}>
                        <SelectTrigger id="year">
                            <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-2">
              <Label>Selected Employees ({selectedEmployeeDetails.length})</Label>
              <ScrollArea className="h-40 rounded-md border">
                <div className="p-4 text-sm">
                  {isPageLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : selectedEmployeeDetails.length > 0 ? (
                    <ul className="space-y-2">
                      {selectedEmployeeDetails.map(emp => (
                        <li key={emp.person_id} className="flex items-center justify-between">
                          <span>{emp.full_name || ''}</span>
                          <Badge variant="secondary">FTE: {emp.fte || 'N/A'}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-4 text-center text-muted-foreground">Select employees from the list on the left.</p>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="grid gap-4">
              {allocationRows.map((row, index) => (
                <div key={row.id} className="flex gap-2 items-center">
                  <ClientSelect
                    clients={clients}
                    value={row.clientName}
                    onValueChange={value => handleAllocationChange(row.id, 'clientName', value)}
                    disabled={isPageLoading || isSubmitting}
                  />
                  <Input 
                    type="number"
                    min="0"
                    step="0.05"
                    value={row.fte}
                    onChange={e => handleAllocationChange(row.id, 'fte', e.target.value)}
                    className="w-32 text-center"
                    placeholder="0.00"
                    disabled={isPageLoading || isSubmitting}
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveAllocationRow(row.id)} disabled={allocationRows.length === 1 || isPageLoading || isSubmitting}>
                      <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={handleAddAllocationRow} disabled={isPageLoading || isSubmitting}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Client
              </Button>
              <Alert variant={isAllocationInvalid ? 'destructive' : 'default'}>
                <AlertDescription>
                  Total Allocated: <span className="font-bold">{totalAllocatedFte.toFixed(2)}</span> / {totalSelectedFte.toFixed(2)} FTE
                  {isAllocationInvalid && " (Totals must match)"}
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleSave} disabled={isPageLoading || isSubmitting || selectedEmployees.size === 0 || isAllocationInvalid}>
              {isSubmitting ? 'Saving...' : 'Save Bulk Allocation'}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    