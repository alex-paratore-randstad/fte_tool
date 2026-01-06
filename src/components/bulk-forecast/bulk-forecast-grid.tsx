
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

type AiReportData = {
    Code: string;
    Name: string;
    DisplayName: string;
    RollsUpTo: string;
};
type ForecastRow = { id: string; clientName: string; percentage: number };

type BulkForecastGridProps = {
  onSaveSuccess: () => void;
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
  onValueChange
}: {
  clients: AiReportData[],
  value: string,
  onValueChange: (value: string) => void
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
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
          <SelectValue placeholder="Select Client..." />
      </SelectTrigger>
      <SelectContent>
          <SelectSearch placeholder="Search client..." onChange={setSearchTerm} />
          {filteredClients.map(client => <SelectItem key={client.Code} value={client.DisplayName}>{client.DisplayName}</SelectItem>)}
          {filteredClients.length === 0 && (
              <div className="p-4 text-sm text-center text-muted-foreground">
                  No clients found.
              </div>
          )}
      </SelectContent>
    </Select>
  );
};


export function BulkForecastGrid({ onSaveSuccess }: BulkForecastGridProps) {
  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<AiReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [forecastRows, setForecastRows] = useState<ForecastRow[]>([]);
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
      
      setAllEmployees(empData);
      
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
    if (!userLoading) {
      fetchData();
    }
    // Add default forecast row
    setForecastRows([{ id: `new-${Date.now()}`, clientName: '', percentage: 100 }]);
  }, [fetchData, userLoading, currentUser.id]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearchTerm) {
      return allEmployees;
    }
    return allEmployees.filter(e => e.Full_Name.toLowerCase().includes(employeeSearchTerm.toLowerCase()));
  }, [allEmployees, employeeSearchTerm]);
  
  const totalPercentage = useMemo(() => {
    return forecastRows.reduce((sum, row) => sum + (Number(row.percentage) || 0), 0);
  }, [forecastRows]);

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

  const handleAddForecastRow = () => {
    setForecastRows(prev => [...prev, { id: `new-${Date.now()}`, clientName: '', percentage: 0 }]);
  };

  const handleRemoveForecastRow = (id: string) => {
    setForecastRows(prev => prev.filter(row => row.id !== id));
  };
  
  const handleForecastChange = (id: string, field: 'clientName' | 'percentage', value: string) => {
    setForecastRows(prev => prev.map(row => {
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
    if (totalPercentage !== 100) {
      toast({ variant: 'destructive', title: 'Total forecast must be 100%.' });
      return;
    }
    if (forecastRows.some(row => !row.clientName || row.percentage <= 0)) {
        toast({ variant: 'destructive', title: 'Invalid forecast rows.', description: 'Please ensure every row has a client and a percentage greater than 0.' });
        return;
    }
    if (!selectedMonth || !selectedYear) {
      toast({ variant: 'destructive', title: 'Please select a month and year.' });
      return;
    }


    setIsSubmitting(true);
    const bulkForecastId = uuidv4();
    const forecastDate = new Date().toISOString();
    const forecastMonthYear = `${selectedMonth} ${selectedYear}`;

    const employeeSubmissions = Array.from(selectedEmployees).map(employeeId => {
      const employee = allEmployees.find(e => e.Person_Number === employeeId);
      return fetch('/domo/datastores/v1/collections/bulk_forecast_fte/documents/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            bulk_forecast_id: bulkForecastId,
            employee_id: employeeId,
            employee_name: employee?.Full_Name || 'Unknown',
            bulk_forecast_date: forecastDate,
            forecast_monthyear: forecastMonthYear,
          }
        }),
      });
    });

    const summarySubmissions = forecastRows.map(row => {
      const client = clients.find(c => c.DisplayName === row.clientName);
      return fetch('/domo/datastores/v1/collections/bulk_forecast_summary/documents/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            bulk_forecast_id: bulkForecastId,
            cost_center_number: client?.Code || 'Unknown',
            cost_center_name: row.clientName,
            forecast_percentage: row.percentage.toString(),
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
      
      toast({ title: 'Bulk Forecast Saved', description: `Assigned forecast profile to ${selectedEmployees.size} employees for ${forecastMonthYear}.` });
      
      // Reset form
      setSelectedEmployees(new Set());
      setForecastRows([{ id: `new-${Date.now()}`, clientName: '', percentage: 100 }]);
      onSaveSuccess();

    } catch (error: any) {
      console.error("Save error:", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || userLoading || !selectedMonth || !selectedYear) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader><Skeleton className="h-10 w-full" /></CardHeader>
          <CardContent><Skeleton className="h-96 w-full" /></CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-10 w-full" /></CardHeader>
          <CardContent><Skeleton className="h-96 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Select Employees</CardTitle>
          <CardDescription>Choose the employees who will share this forecast profile.</CardDescription>
          <div className="relative pt-2">
            <Input 
              placeholder="Search employees..." 
              value={employeeSearchTerm}
              onChange={e => setEmployeeSearchTerm(e.target.value)}
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
                {filteredEmployees.map(emp => (
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
                ))}
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
          <CardTitle>Step 2: Define Forecast</CardTitle>
          <CardDescription>Define the client percentages for the selected group.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="month">Month</Label>
                    <Select value={selectedMonth} onValueChange={(value) => setSelectedMonth(value)}>
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
                    <Select value={selectedYear} onValueChange={(value) => setSelectedYear(value)}>
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
              {forecastRows.map((row, index) => (
                <div key={row.id} className="flex gap-2 items-center">
                  <ClientSelect
                    clients={clients}
                    value={row.clientName}
                    onValueChange={value => handleForecastChange(row.id, 'clientName', value)}
                  />
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    value={row.percentage}
                    onChange={e => handleForecastChange(row.id, 'percentage', e.target.value)}
                    className="w-32 text-center"
                    placeholder="%"
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveForecastRow(row.id)} disabled={forecastRows.length === 1}>
                      <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={handleAddForecastRow}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Client
              </Button>
              <Alert variant={totalPercentage !== 100 ? 'destructive' : 'default'}>
                <AlertDescription>
                  Total Forecast: <span className="font-bold">{totalPercentage}%</span>
                  {totalPercentage !== 100 && " (Must equal 100%)"}
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleSave} disabled={isSubmitting || selectedEmployees.size === 0 || totalPercentage !== 100}>
              {isSubmitting ? 'Saving...' : 'Save Bulk Forecast'}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
