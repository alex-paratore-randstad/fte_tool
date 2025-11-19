
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
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea } from '../ui/scroll-area';
import { SelectSearch } from '../ui/select-search';
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertDescription } from '../ui/alert';
import { Label } from '../ui/label';

type CostCenterData = { ['cost_center_number']: string; ['cost_center_name']: string };
type AllocationRow = { id: string; costCenterName: string; percentage: number };
type Agent = { id: string; name: string };
type TicketData = { agent_name: string };

type TicketAllocationGridProps = {
  onSaveSuccess: () => void;
};

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

export function TicketAllocationGrid({ onSaveSuccess }: TicketAllocationGridProps) {
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [allocationRows, setAllocationRows] = useState<AllocationRow[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [costCenterSearchTerm, setCostCenterSearchTerm] = useState('');
  
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);


  const { currentUser, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();

  useEffect(() => {
    const now = new Date();
    setSelectedMonth(months[now.getMonth()]);
    setSelectedYear(now.getFullYear().toString());
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketDataResponse, ccResponse] = await Promise.all([
        fetch(`/data/v1/fte_tickets_grouped_monthly`),
        fetch(`/data/v1/gbs_ind_finance_cc_report`),
      ]);

      if (!ticketDataResponse.ok) {
        console.warn("Could not fetch ticket data for agent list.");
      }
      if (!ccResponse.ok) {
        console.warn("Could not fetch cost center data.");
      }
      
      const ticketData: TicketData[] = ticketDataResponse.ok ? await ticketDataResponse.json() : [];
      const uniqueAgentNames = Array.from(new Set(ticketData.map(d => d.agent_name).filter(Boolean)));
      const agentList: Agent[] = uniqueAgentNames.map(name => ({ id: name, name: name }));
      setAllAgents(agentList);

      const ccData: CostCenterData[] = ccResponse.ok ? (await ccResponse.json()).filter((c: CostCenterData) => c.cost_center_number && c.cost_center_name) : [];
      
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
    setAllocationRows([{ id: `new-${Date.now()}`, costCenterName: '', percentage: 100 }]);
  }, [fetchData, userLoading, currentUser.id]);

  const filteredAgents = useMemo(() => {
    if (!employeeSearchTerm) {
      return allAgents;
    }
    return allAgents.filter(e => e.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()));
  }, [allAgents, employeeSearchTerm]);
  
  const filteredCostCenters = useMemo(() => {
    if (!costCenterSearchTerm) {
      return costCenters;
    }
    return costCenters.filter(cc =>
      cc.cost_center_name.toLowerCase().includes(costCenterSearchTerm.toLowerCase())
    );
  }, [costCenters, costCenterSearchTerm]);

  const totalPercentage = useMemo(() => {
    return allocationRows.reduce((sum, row) => sum + (Number(row.percentage) || 0), 0);
  }, [allocationRows]);

  const handleAgentToggle = (agentId: string, isSelected: boolean) => {
    setSelectedAgents(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(agentId);
      } else {
        newSet.delete(agentId);
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
    if (selectedAgents.size === 0) {
      toast({ variant: 'destructive', title: 'No agents selected.' });
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
    if (!selectedMonth || !selectedYear) {
      toast({ variant: 'destructive', title: 'Please select a month and year.' });
      return;
    }


    setIsSubmitting(true);
    const ticketAllocationId = uuidv4();
    const allocationDate = new Date().toISOString();
    const allocationMonthYear = `${selectedMonth} ${selectedYear}`;

    const agentSubmissions = Array.from(selectedAgents).map(agentName => {
      return fetch('/domo/datastores/v1/collections/ticket_allocation_fte/documents/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            ticket_allocation_id: ticketAllocationId,
            employee_id: agentName,
            employee_name: agentName,
            ticket_allocation_date: allocationDate,
            allocation_monthyear: allocationMonthYear,
          }
        }),
      });
    });

    const summarySubmissions = allocationRows.map(row => {
      const cc = costCenters.find(c => c.cost_center_name === row.costCenterName);
      return fetch('/domo/datastores/v1/collections/ticket_allocation_summary/documents/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            ticket_allocation_id: ticketAllocationId,
            cost_center_number: cc?.cost_center_number || 'Unknown',
            cost_center_name: row.costCenterName,
            allocation_percentage: row.percentage.toString(),
            ticket_allocation_date: allocationDate,
          }
        }),
      });
    });

    try {
      const allPromises = [...agentSubmissions, ...summarySubmissions];
      const results = await Promise.all(allPromises);

      if (results.some(res => !res.ok)) {
        throw new Error('One or more submissions failed.');
      }
      
      toast({ title: 'Ticket Allocation Saved', description: `Assigned allocation profile to ${selectedAgents.size} agents for ${allocationMonthYear}.` });
      
      setSelectedAgents(new Set());
      setAllocationRows([{ id: `new-${Date.now()}`, costCenterName: '', percentage: 100 }]);
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
          <CardTitle>Step 1: Select Agents</CardTitle>
          <CardDescription>Choose the agents who will share this allocation profile.</CardDescription>
          <div className="relative pt-2">
            <Input 
              placeholder="Search agents..." 
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.map(agent => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedAgents.has(agent.id)}
                        onCheckedChange={checked => handleAgentToggle(agent.id, !!checked)}
                        aria-label={`Select ${agent.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                  </TableRow>
                ))}
                {filteredAgents.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                            No agents found in the ticket dataset.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        <CardFooter>
            <div className="text-sm text-muted-foreground">
                {selectedAgents.size} agent(s) selected.
            </div>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Define Allocation</CardTitle>
          <CardDescription>Define the cost center percentages for the selected group.</CardDescription>
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
              {allocationRows.map((row) => (
                <div key={row.id} className="flex gap-2 items-center">
                  <Select value={row.costCenterName} onValueChange={value => handleAllocationChange(row.id, 'costCenterName', value)}>
                      <SelectTrigger>
                          <SelectValue placeholder="Select Cost Center..." />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectSearch placeholder="Search cost center..." onChange={setCostCenterSearchTerm} />
                          {filteredCostCenters.map(cc => <SelectItem key={cc.cost_center_number} value={cc.cost_center_name}>{cc.cost_center_name}</SelectItem>)}
                          {filteredCostCenters.length === 0 && (
                              <div className="p-4 text-sm text-center text-muted-foreground">
                                  No cost centers found.
                              </div>
                          )}
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
          </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleSave} disabled={isSubmitting || selectedAgents.size === 0 || totalPercentage !== 100}>
              {isSubmitting ? 'Saving...' : 'Save Ticket Allocation'}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
