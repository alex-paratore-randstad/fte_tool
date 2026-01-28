
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

type AiReportData = {
    Code: string;
    Name: string;
    DisplayName: string;
    RollsUpTo: string;
};
type AllocationRow = { id: string; clientName: string; percentage: number };

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
      
      // If both are special or both are not, sort by name.
      if (aIsSpecial && bIsSpecial) {
          return a.DisplayName === 'Unallocated' ? -1 : 1;
      }
      
      return a.DisplayName.localeCompare(b.DisplayName);
    });

    if (!searchTerm) {
      return sorted;
    }
    return sorted.filter(client =>
      client.DisplayName.toLowerCase().includes(searchTerm.toLowerCase())
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

  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [allocationRows, setAllocationRows] = useState<AllocationRow[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);


  const { currentUser, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();

  useEffect(() => {
    // Set date state on client to avoid hydration mismatch
    const now = new Date();
    setSelectedMonth(months[now.getMonth()]);
    setSelectedYear(now.getFullYear().toString());
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empResponse, clientResponse] = await Promise.all([
        fetch(`/data/v1/gbs_ind_hr_fte_report`),
        fetch(`/data/v1/ai_report`),
      ]);

      if (!empResponse.ok || !clientResponse.ok) {
        console.warn("Could not fetch initial data.");
      }
      
      const empData: TeamMember[] = empResponse.ok ? (await empResponse.json()).filter((e: TeamMember) => e.Full_Name).sort((a,b) => a.Full_Name.localeCompare(b.Full_Name)) : [];
      const clientData: AiReportData[] = clientResponse.ok ? (await clientResponse.json()).filter((c: AiReportData) => c.Code && c.DisplayName) : [];
      
      const tempWorker: TeamMember = {
        'Person_Number': 'TEMP_WORKER',
        'Full_Name': 'Temp Worker',
        'Market_Facing_Title': 'Temporary Staff',
      } as TeamMember;
      setAllEmployees([tempWorker, ...empData]);
      
      const staticClients: AiReportData[] = [
        { Code: 'UNALLOCATED', Name: 'Unallocated', DisplayName: 'Unallocated', RollsUpTo: '' },
        { Code: 'PTO', Name: 'PTO', DisplayName: 'PTO', RollsUpTo: '' },
      ];
      setClients([...staticClients, ...clientData]);

    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      toast({ variant: 'destructive', title: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (templateToCopy) {
      const newAllocationRows = templateToCopy.map(summary => ({
        id: `copied-${summary.id}-${Date.now()}`,
        clientName: summary.name,
        percentage: summary.percentage
      }));
      setAllocationRows(newAllocationRows);
      toast({ title: 'Template Copied', description: 'Allocation profile has been copied. Select employees and save.' });
    } else {
        // Set default allocation row only if not copying
        setAllocationRows([{ id: `new-${Date.now()}`, clientName: '', percentage: 1.0 }]);
    }
  }, [templateToCopy, toast]);

  useEffect(() => {
    if (!userLoading) {
      fetchData();
    }
  }, [fetchData, userLoading, currentUser.id]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearchTerm) {
      return allEmployees;
    }
    return allEmployees.filter(e => e.Full_Name.toLowerCase().includes(employeeSearchTerm.toLowerCase()));
  }, [allEmployees, employeeSearchTerm]);
  
  const totalAllocation = useMemo(() => {
    return allocationRows.reduce((sum, row) => sum + (Number(row.percentage) || 0), 0);
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
    setAllocationRows(prev => [...prev, { id: `new-${Date.now()}`, clientName: '', percentage: 0 }]);
  };

  const handleRemoveAllocationRow = (id: string) => {
    setAllocationRows(prev => prev.filter(row => row.id !== id));
  };
  
  const handleAllocationChange = (id: string, field: 'clientName' | 'percentage', value: string) => {
    setAllocationRows(prev => prev.map(row => {
      if (row.id === id) {
        if (field === 'percentage') {
          return { ...row, [field]: Number(value) };
        }
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const handleSave = async () => {
    if (selectedEmployees.size === 0) {
      toast({ variant: 'destructive', title: 'No employees selected.' });
      return;
    }
    if (Math.abs(totalAllocation - 1.0) > 0.01) {
      toast({ variant: 'destructive', title: 'Total allocation must be 1.0.' });
      return;
    }
    if (allocationRows.some(row => !row.clientName || row.percentage <= 0)) {
        toast({ variant: 'destructive', title: 'Invalid allocation rows.', description: 'Please ensure every row has a client and an allocation greater than 0.' });
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
      const employee = allEmployees.find(e => e.Person_Number === employeeId);
      return fetch('/domo/datastores/v1/collections/bulk_allocation_fte/documents/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            bulk_allocation_id: bulkAllocationId,
            employee_id: employeeId,
            employee_name: employee?.Full_Name || 'Unknown',
            bulk_allocation_date: allocationDate,
            allocation_monthyear: allocationMonthYear,
          }
        }),
      });
    });

    const summarySubmissions = allocationRows.map(row => {
      const client = clients.find(c => c.DisplayName === row.clientName);
      return fetch('/domo/datastores/v1/collections/bulk_allocation_summary/documents/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            bulk_allocation_id: bulkAllocationId,
            cost_center_number: client?.Code || 'Unknown',
            cost_center_name: row.clientName,
            allocation_percentage: row.percentage.toString(),
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
      
      toast({ title: 'Bulk Allocation Saved', description: `Assigned allocation profile to ${selectedEmployees.size} employees for ${allocationMonthYear}.` });
      
      // Reset form
      setSelectedEmployees(new Set());
      setAllocationRows([{ id: `new-${Date.now()}`, clientName: '', percentage: 1.0 }]);
      onSaveSuccess();

    } catch (error: any) {
      console.error("Save error:", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPageLoading = loading || userLoading || !selectedMonth || !selectedYear;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Select Employees</CardTitle>
          <CardDescription>Choose the employees who will share this allocation profile.</CardDescription>
          <div className="relative pt-2">
            <Input 
              placeholder="Search employees..." 
              value={employeeSearchTerm}
              onChange={e => setEmployeeSearchTerm(e.target.value)}
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
                ) : (
                  filteredEmployees.map(emp => (
                    <TableRow key={emp.Person_Number}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedEmployees.has(emp.Person_Number)}
                          onCheckedChange={checked => handleEmployeeToggle(emp.Person_Number, !!checked)}
                          aria-label={`Select ${emp.Full_Name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{emp.Full_Name}</TableCell>
                      <TableCell className="text-muted-foreground">{emp.Market_Facing_Title}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        <CardFooter>
            <div className="text-sm text-muted-foreground">
                {selectedEmployees.size} employee(s) selected.
            </div>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Define Allocation</CardTitle>
          <CardDescription>Define the client allocation for the selected group. Must sum to 1.0.</CardDescription>
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
                    max="1"
                    step="0.01"
                    value={row.percentage}
                    onChange={e => handleAllocationChange(row.id, 'percentage', e.target.value)}
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
              <Alert variant={Math.abs(totalAllocation - 1.0) > 0.01 ? 'destructive' : 'default'}>
                <AlertDescription>
                  Total Allocation: <span className="font-bold">{totalAllocation.toFixed(2)}</span>
                  {Math.abs(totalAllocation - 1.0) > 0.01 && " (Must equal 1.00)"}
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleSave} disabled={isPageLoading || isSubmitting || selectedEmployees.size === 0 || Math.abs(totalAllocation - 1.0) > 0.01}>
              {isSubmitting ? 'Saving...' : 'Save Bulk Allocation'}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
