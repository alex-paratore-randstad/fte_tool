
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
import { PlusCircle, X, ChevronsUpDown } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

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

const MultiSelectFilter = ({
  placeholder,
  options,
  selected,
  onValueChange,
  disabled,
}: {
  placeholder: string;
  options: string[];
  selected: string[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">
            {(selected || []).length === 0
              ? placeholder
              : (selected || []).length <= 2
              ? (selected || []).join(', ')
              : `${(selected || []).length} selected`}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-64">
                {(options || []).map(option => (
                  <CommandItem
                    key={option}
                    onSelect={() => onValueChange(option)}
                  >
                    <Checkbox
                      className="mr-2"
                      checked={(selected || []).includes(option)}
                    />
                    <span>{option}</span>
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
    const sorted = [...clients].sort((a, b) => (a.DisplayName || '').localeCompare(b.DisplayName || ''));

    if (!searchTerm) {
      return sorted;
    }
    return sorted.filter(client =>
      (client.DisplayName || '').toLowerCase().includes(searchTerm.toLowerCase())
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


export function BulkAllocationGrid({ onSaveSuccess, templateToCopy }: BulkAllocationGridProps) {
  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<AiReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [allocationRows, setAllocationRows] = useState<AllocationRow[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedAllocationGroup, setSelectedAllocationGroup] = useState('');
  const [otherAllocationGroup, setOtherAllocationGroup] = useState('');

  const [employeeFilters, setEmployeeFilters] = useState({
    fullName: [] as string[],
    manager: [] as string[]
  });

  const { currentUser, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  
  useEffect(() => {
    setHasMounted(true);
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
      
      const empData: TeamMember[] = empResponse.ok ? (await empResponse.json()).filter((e: TeamMember) => e && e.full_name).sort((a,b) => (a.full_name || '').localeCompare(b.full_name || '')) : [];
      const clientData: AiReportData[] = clientResponse.ok ? (await clientResponse.json()).filter((c: AiReportData) => c && c.Code && c.DisplayName) : [];
      
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
          clientName: summary.name || 'Unknown',
          fte: summary.percentage || 0,
        }));
        setAllocationRows(newAllocationRows);
      } else {
        const newAllocationRows = templateToCopy.map(summary => ({
          id: uuidv4(),
          clientName: summary.name || 'Unknown',
          fte: (summary.percentage || 0) * totalSelectedFte
        }));
        setAllocationRows(newAllocationRows);
        toast({ title: 'Template Copied', description: 'Allocation profile has been copied. Review the FTE distribution.' });
      }
    } else {
        if (allocationRows.length === 0) {
            setAllocationRows([{ id: uuidv4(), clientName: '', fte: 0 }]);
        }
    }
  }, [templateToCopy, totalSelectedFte, toast]);

  useEffect(() => {
    if (!userLoading) {
      fetchData();
    }
  }, [fetchData, userLoading]);

  const filterOptions = useMemo(() => {
    const getUniqueSorted = (key: keyof TeamMember) =>
        Array.from(
            new Set(
                allEmployees
                    .map(item => item && item[key])
                    .filter(val => typeof val === 'string' && val) as string[]
            )
        ).sort((a, b) => a.localeCompare(b));

    return {
      fullNames: getUniqueSorted('full_name'),
      managers: getUniqueSorted('manager'),
    };
  }, [allEmployees]);

  const filteredEmployees = useMemo(() => {
    return allEmployees.filter(emp => {
      if (!emp) return false;
      const nameMatch = employeeFilters.fullName.length === 0 || employeeFilters.fullName.includes(emp.full_name || '');
      const managerMatch = employeeFilters.manager.length === 0 || employeeFilters.manager.includes(emp.manager || '');
      return nameMatch && managerMatch;
    });
  }, [allEmployees, employeeFilters]);
  
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

  const handleFilterChange = (filterName: keyof typeof employeeFilters, value: string) => {
    setEmployeeFilters(prev => {
        const currentValues = prev[filterName] || [];
        const newValues = currentValues.includes(value)
          ? currentValues.filter(v => v !== value)
          : [...currentValues, value];
        return { ...prev, [filterName]: newValues };
    });
  };

  const clearEmployeeFilters = () => {
    setEmployeeFilters({ fullName: [], manager: [] });
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

    let allocationGroupValue = selectedAllocationGroup;
    if (selectedAllocationGroup === 'Other') {
      if (!otherAllocationGroup.trim()) {
        toast({ variant: 'destructive', title: 'Missing Field', description: 'Please specify the "Other" allocation group name.' });
        return;
      }
      allocationGroupValue = otherAllocationGroup.trim();
    } else if (!selectedAllocationGroup) {
      toast({ variant: 'destructive', title: 'Missing Field', description: 'Please select an Allocation Group.' });
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
            allocation_group: allocationGroupValue,
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
      toast({ title: 'Bulk Allocation Saved', description: `Assigned allocation profile to ${selectedEmployees.size} employees.` });
      
      setSelectedEmployees(new Set());
      setAllocationRows([{ id: uuidv4(), clientName: '', fte: 0 }]);
      setSelectedAllocationGroup('');
      setOtherAllocationGroup('');
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
  const isSubmitDisabled = isPageLoading || isSubmitting || selectedEmployees.size === 0 || isAllocationInvalid || !selectedAllocationGroup || (selectedAllocationGroup === 'Other' && !otherAllocationGroup.trim());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div>
              <CardTitle>Step 1: Select Employees</CardTitle>
              <CardDescription>Choose the employees who will share this allocation profile.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={clearEmployeeFilters} disabled={isPageLoading}>Clear Filters</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <MultiSelectFilter
              placeholder="Filter by Name..."
              options={filterOptions.fullNames}
              selected={employeeFilters.fullName}
              onValueChange={value => handleFilterChange('fullName', value)}
              disabled={isPageLoading}
            />
            <MultiSelectFilter
              placeholder="Filter by Manager..."
              options={filterOptions.managers}
              selected={employeeFilters.manager}
              onValueChange={value => handleFilterChange('manager', value)}
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
                  <TableHead>Manager</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPageLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-5 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
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
                      <TableCell className="font-medium">{emp.full_name || 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">{emp.title || 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">{emp.manager || 'N/A'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                      No employees match the current filters.
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
                <Label htmlFor="allocation-group">Allocation Group</Label>
                <Select value={selectedAllocationGroup} onValueChange={setSelectedAllocationGroup} disabled={isPageLoading || isSubmitting}>
                    <SelectTrigger id="allocation-group">
                    <SelectValue placeholder="Select Group" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="Contractor Care">Contractor Care</SelectItem>
                    <SelectItem value="Compliance">Compliance</SelectItem>
                    <SelectItem value="NAM MSP Admin">NAM MSP Admin</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {selectedAllocationGroup === 'Other' && (
                <div className="grid gap-2">
                    <Label htmlFor="other-allocation-group">Specify Other Group</Label>
                    <Input
                    id="other-allocation-group"
                    value={otherAllocationGroup}
                    onChange={(e) => setOtherAllocationGroup(e.target.value)}
                    placeholder="Enter group name"
                    disabled={isPageLoading || isSubmitting}
                    />
                </div>
            )}


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
                          <span>{emp.full_name || 'N/A'}</span>
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
                    step="1"
                    value={row.fte}
                    onChange={e => handleAllocationChange(row.id, 'fte', e.target.value)}
                    className="w-32 text-center"
                    placeholder="0"
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
            <Button onClick={handleSave} disabled={isSubmitDisabled}>
              {isSubmitting ? 'Saving...' : 'Save Bulk Allocation'}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
