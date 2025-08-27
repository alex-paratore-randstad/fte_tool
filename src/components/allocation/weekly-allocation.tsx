
'use client';

import { useState, useEffect, useCallback } from 'react';
import { endOfWeek, format } from 'date-fns';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { WeeklyAllocation, TeamMember } from '@/types';

type CostCenter = { ['cost_center_number']: string; ['cost_center_name']: string };
type AllocationRow = {
  id: string;
  allocation_date: string;
  allocation_name: string;
  cost_center_number: string;
  cost_center_name: string;
  allocation_amount: number;
};

// Initialize a local domo object to handle data fetching.
const baseUrl = 'https://c5899a60-de1d-42af-b19b-99f8dff54fad.domoapps.prod10.domo.com';
const domo = {
  get: async (url: string) => {
    const rUrl = `${baseUrl}${url}`;
    const response = await fetch(rUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  post: async (url: string, body: any) => {
    const rUrl = `${baseUrl}${url}`;
    const response = await fetch(rUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
};


export function WeeklyAllocation() {
  const [employees, setEmployees] = useState<TeamMember[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [existingAllocations, setExistingAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const weekEndingDate = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
       const [empData, ccData, existingAllocData] = await Promise.all([
         domo.get(`/data/v1/gbs_ind_hr_fte_report`),
         domo.get(`/data/v1/gbs_ind_finance_cc_report`),
         domo.get(`/domo/datastores/v1/collections/weekly_allocation/documents/`),
       ]);
      
      setEmployees(empData.filter((e: TeamMember) => e.Full_Name));
      setCostCenters(ccData.filter((c: CostCenter) => c.cost_center_number && c.cost_center_name));
      setExistingAllocations(existingAllocData.filter((a: any) => a.content.allocation_date === weekEndingDate));

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to fetch initial data', description: error.message });
      console.error("Data fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [toast, weekEndingDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleAddRow = () => {
    setAllocations(prev => [
      ...prev,
      { 
        id: `new-${Date.now()}`,
        allocation_date: weekEndingDate,
        allocation_name: '', 
        cost_center_name: '',
        cost_center_number: '', 
        allocation_amount: 0 
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setAllocations(prev => prev.filter(row => row.id !== id));
  };
  
  const handleRowChange = (id: string, field: keyof AllocationRow, value: string | number) => {
     setAllocations(prev =>
      prev.map(row => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value };
          if (field === 'cost_center_name') {
            const selectedCc = costCenters.find(cc => cc.cost_center_name === value);
            if (selectedCc) {
              updatedRow.cost_center_number = selectedCc.cost_center_number;
            }
          }
          return updatedRow;
        }
        return row;
      })
    );
  };

  const handleSave = async () => {
    if (allocations.length === 0) {
      toast({ variant: 'destructive', title: 'No new allocations to save.' });
      return;
    }
    
    setLoading(true);

    const newAllocations = allocations.map(alloc => ({
      content: {
        allocation_date: alloc.allocation_date,
        allocation_name: alloc.allocation_name,
        cost_center_name: alloc.cost_center_name,
        cost_center_number: alloc.cost_center_number,
        allocation_amount: alloc.allocation_amount.toString(), // Ensure amount is a string per schema
      }
    }));

    try {
        const responses = await Promise.all(newAllocations.map(async (entry) => {
           return domo.post('/domo/datastores/v1/collections/weekly_allocation/documents/', entry);
        }));

        toast({ title: 'Success!', description: 'All new allocations have been saved.' });
        setAllocations([]); // Clear the new rows
        fetchData(); // Refresh the list of existing allocations
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        console.error("Save error:", error);
    } finally {
        setLoading(false);
    }
  };

  if (loading && employees.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Weekly Allocation Entry</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>New Allocation Entry</CardTitle>
                <CardDescription>Week Ending: {weekEndingDate}</CardDescription>
            </div>
            <Button onClick={handleSave} disabled={loading || allocations.length === 0}>Save New Allocations</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Cost Center Name</TableHead>
                <TableHead>Cost Center Number</TableHead>
                <TableHead>Allocation Amount</TableHead>
                <TableHead>Allocation Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map(row => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Select value={row.allocation_name} onValueChange={(val) => handleRowChange(row.id, 'allocation_name', val)}>
                        <SelectTrigger><SelectValue placeholder="Select Employee..." /></SelectTrigger>
                        <SelectContent>
                            {employees.map(emp => <SelectItem key={emp.Full_Name} value={emp.Full_Name}>{emp.Full_Name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={row.cost_center_name} onValueChange={(val) => handleRowChange(row.id, 'cost_center_name', val)}>
                        <SelectTrigger><SelectValue placeholder="Select Cost Center..." /></SelectTrigger>
                        <SelectContent>
                            {costCenters.map(cc => <SelectItem key={cc.cost_center_name} value={cc.cost_center_name}>{cc.cost_center_name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  </TableCell>
                   <TableCell>
                    <Input 
                      type="text"
                      value={row.cost_center_number}
                      readOnly
                      className="bg-muted"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      min="0" max="1" step="0.01"
                      placeholder="e.g. 0.5" 
                      value={row.allocation_amount}
                      onChange={(e) => handleRowChange(row.id, 'allocation_amount', parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="text"
                      value={row.allocation_date}
                      readOnly
                      className="bg-muted"
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(row.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="outline" size="sm" className="mt-4" onClick={handleAddRow}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Row
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Existing Allocations for This Week</CardTitle>
            <CardDescription>Entries already saved for the week ending {weekEndingDate}.</CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? <Skeleton className="h-24 w-full" /> : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Full Name</TableHead>
                            <TableHead>Cost Center</TableHead>
                            <TableHead>Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {existingAllocations.length === 0 ? (
                           <TableRow><TableCell colSpan={3} className="text-center">No allocations found for this week.</TableCell></TableRow>
                        ) : (
                           existingAllocations.map(alloc => (
                                <TableRow key={alloc.id}>
                                    <TableCell>{alloc.content.allocation_name}</TableCell>
                                    <TableCell>{alloc.content.cost_center_name} ({alloc.content.cost_center_number})</TableCell>
                                    <TableCell>{alloc.content.allocation_amount}</TableCell>
                                </TableRow>
                           ))
                        )}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}



    