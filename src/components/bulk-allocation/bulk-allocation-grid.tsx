
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
import { PlusCircle, Trash2, X } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { TeamMember } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea } from '../ui/scroll-area';
import { SelectSearch } from '../ui/select-search';
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertDescription } from '../ui/alert';

type CostCenterData = { ['cost_center_number']: string; ['cost_center_name']: string };
type AllocationRow = { id: string; costCenterName: string; percentage: number };

type BulkAllocationGridProps = {
  onSaveSuccess: () => void;
};

export function BulkAllocationGrid({ onSaveSuccess }: BulkAllocationGridProps) {
  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [allocationRows, setAllocationRows] = useState<AllocationRow[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

  const { currentUser, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empResponse, ccResponse] = await Promise.all([
        fetch(`/data/v1/gbs_ind_hr_fte_report`),
        fetch(`/data/v1/gbs_ind_finance_cc_report`),
      ]);

      if (!empResponse.ok || !ccResponse.ok) {
        console.warn("Could not fetch initial data.");
      }
      
      const empData: TeamMember[] = empResponse.ok ? (await empResponse.json()).filter((e: TeamMember) => e.Full_Name) : [];
      const ccData: CostCenterData[] = ccResponse.ok ? (await ccResponse.json()).filter((c: CostCenterData) => c.cost_center_number && c.cost_center_name) : [];
      
      setAllEmployees(empData);
      
      const staticCostCenters: CostCenterData[] = [
        { cost_center_number: 'UNALLOCATED', cost_center_name: 'Unallocated' },
        { cost_center_number: 'PTO', cost_center_name: 'PTO' },
      ];
      setCostCenters([...staticCostCenters, ...ccData]);

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
    // Add default allocation row
    setAllocationRows([{ id: `new-${Date.now()}`, costCenterName: '', percentage: 100 }]);
  }, [fetchData, userLoading, currentUser.id]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearchTerm) {
      return allEmployees;
    }
    return allEmployees.filter(e => e.Full_Name.toLowerCase().includes(employeeSearchTerm.toLowerCase()));
  }, [allEmployees, employeeSearchTerm]);

  const totalPercentage = useMemo(() => {
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
    setAllocationRows(prev => [...prev, { id: `new-${Date.now()}`, costCenterName: '', percentage: 0 }]);
  };

  const handleRemoveAllocationRow = (id: string) => {
    setAllocationRows(prev => prev.filter(row => row.id !== id));
  };
  
  const handleAllocationChange = (id: string, field: 'costCenterName' | 'percentage', value: string) => {
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
    if (totalPercentage !== 100) {
      toast({ variant: 'destructive', title: 'Total allocation must be 100%.' });
      return;
    }
    if (allocationRows.some(row => !row.costCenterName || row.percentage <= 0)) {
        toast({ variant: 'destructive', title: 'Invalid allocation rows.', description: 'Please ensure every row has a cost center and a percentage greater than 0.' });
        return;
    }

    setIsSubmitting(true);
    const bulkAllocationId = uuidv4();
    const creationDate = new Date().toISOString();

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
          }
        }),
      });
    });

    const summarySubmissions = allocationRows.map(row => {
      const cc = costCenters.find(c => c.cost_center_name === row.costCenterName);
      return fetch('/domo/datastores/v1/collections/bulk_allocation_summary/documents/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            bulk_allocation_id: bulkAllocationId,
            cost_center_number: cc?.cost_center_number || 'Unknown',
            cost_center_name: row.costCenterName,
            allocation_percentage: row.percentage.toString(),
            creation_date: creationDate,
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
      
      toast({ title: 'Bulk Allocation Saved', description: `Assigned allocation profile to ${selectedEmployees.size} employees.` });
      
      // Reset form
      setSelectedEmployees(new Set());
      setAllocationRows([{ id: `new-${Date.now()}`, costCenterName: '', percentage: 100 }]);
      onSaveSuccess();

    } catch (error: any) {
      console.error("Save error:", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || userLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card><CardHeader><Skeleton className="h-40 w-full" /></CardHeader></Card>
        <Card><CardHeader><Skeleton className="h-40 w-full" /></CardHeader></Card>
      </div>
    );
  }

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
          <CardTitle>Step 2: Define Allocation</CardTitle>
          <CardDescription>Define the cost center percentages for the selected group.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {allocationRows.map((row, index) => (
              <div key={row.id} className="flex gap-2 items-center">
                <Select value={row.costCenterName} onValueChange={value => handleAllocationChange(row.id, 'costCenterName', value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Cost Center..." />
                    </SelectTrigger>
                    <SelectContent>
                        {costCenters.map(cc => <SelectItem key={cc.cost_center_number} value={cc.cost_center_name}>{cc.cost_center_name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Input 
                  type="number"
                  min="0"
                  max="100"
                  value={row.percentage}
                  onChange={e => handleAllocationChange(row.id, 'percentage', e.target.value)}
                  className="w-32 text-center"
                  placeholder="%"
                />
                 <Button variant="ghost" size="icon" onClick={() => handleRemoveAllocationRow(row.id)} disabled={allocationRows.length === 1}>
                    <X className="h-4 w-4" />
                 </Button>
              </div>
            ))}
            <Button variant="outline" onClick={handleAddAllocationRow}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Cost Center
            </Button>
            <Alert variant={totalPercentage !== 100 ? 'destructive' : 'default'}>
              <AlertDescription>
                Total Allocation: <span className="font-bold">{totalPercentage}%</span>
                {totalPercentage !== 100 && " (Must equal 100%)"}
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleSave} disabled={isSubmitting || selectedEmployees.size === 0 || totalPercentage !== 100}>
              {isSubmitting ? 'Saving...' : 'Save Bulk Allocation'}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
