
'use client';

import { useState, useMemo, Fragment, useEffect, useCallback } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { format, startOfMonth, addMonths, subMonths } from 'date-fns';
import { SelectSearch } from '../ui/select-search';

type TicketAllocationData = {
  agent_name: string;
  agent_group_name: string;
  reporting_month: string;
  reporting_year: string;
  monthly_ticket_ratio: string;
};

type AllocationRow = {
  id: string;
  agentGroupName: string;
  fte: number;
};

type EmployeeAllocation = {
  agentName: string;
  allocations: AllocationRow[];
};

type TicketAllocationGridProps = {
  onSaveSuccess: () => void;
};

const AgentSelect = ({
  agents,
  onValueChange,
  value
}: {
  agents: string[],
  onValueChange: (value: string) => void,
  value: string
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAgents = useMemo(() => {
    if (!searchTerm) return agents;
    return agents.filter(agent => agent.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [agents, searchTerm]);

  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger className="w-[250px]">
        <SelectValue placeholder="Select an Agent..." />
      </SelectTrigger>
      <SelectContent>
        <SelectSearch placeholder="Search agent..." onChange={setSearchTerm} />
        {filteredAgents.map(agent => <SelectItem key={agent} value={agent}>{agent}</SelectItem>)}
        {filteredAgents.length === 0 && <div className="p-2 text-sm text-center">No agents found</div>}
      </SelectContent>
    </Select>
  );
};


export function TicketAllocationGrid({ onSaveSuccess }: TicketAllocationGridProps) {
  const [activeAllocation, setActiveAllocation] = useState<EmployeeAllocation | null>(null);
  const [allTicketData, setAllTicketData] = useState<TicketAllocationData[]>([]);
  const [availableAgents, setAvailableAgents] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('');

  const { toast } = useToast();

  useEffect(() => {
    // Set date on client to avoid hydration mismatch
    setCurrentDate(new Date());
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/data/v1/fte_tickets_grouped_monthly`);

      if (!response.ok) {
        console.warn(`Failed to fetch ticket data.`);
        setAllTicketData([]);
        setAvailableAgents([]);
        return;
      }
      const data: TicketAllocationData[] = await response.json();
      setAllTicketData(data);
      
      const uniqueAgents = Array.from(new Set(data.map(d => d.agent_name))).sort();
      setAvailableAgents(uniqueAgents);

    } catch (error) {
      console.error("Failed to fetch and process ticket data:", error);
      toast({ variant: 'destructive', title: 'Failed to process data' });
      setAllTicketData([]);
      setAvailableAgents([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  
  const populateGridForAgentAndMonth = useCallback(() => {
    if (!selectedAgent || !currentDate || allTicketData.length === 0) {
      setActiveAllocation(null);
      return;
    }

    const selectedMonth = format(currentDate, 'MMM');
    const selectedYear = format(currentDate, 'yyyy');

    const agentDataForMonth = allTicketData.filter(
      d => d.agent_name === selectedAgent && d.reporting_month === selectedMonth && d.reporting_year === selectedYear
    );

    if (agentDataForMonth.length > 0) {
      const prepopulated: EmployeeAllocation = {
        agentName: selectedAgent,
        allocations: agentDataForMonth.map((d) => ({
          id: `${selectedAgent}-${d.agent_group_name}-${Date.now()}`,
          agentGroupName: d.agent_group_name,
          fte: parseFloat(d.monthly_ticket_ratio) || 0,
        })),
      };
      setActiveAllocation(prepopulated);
    } else {
       // If no data for this month, start with a clean slate for the agent
      setActiveAllocation({
        agentName: selectedAgent,
        allocations: [{ id: `${selectedAgent}-manual-${Date.now()}`, agentGroupName: '', fte: 0 }]
      });
    }
  }, [selectedAgent, currentDate, allTicketData]);

  useEffect(() => {
    populateGridForAgentAndMonth();
  }, [selectedAgent, currentDate, populateGridForAgentAndMonth]);


  const handlePrevMonth = () => {
    if (currentDate) setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    if (currentDate) setCurrentDate(addMonths(currentDate, 1));
  };

  const handleFteChange = (allocId: string, newFteValue: string) => {
    if (!activeAllocation) return;
    const newFte = parseFloat(newFteValue) || 0;
    
    const newAllocations = activeAllocation.allocations.map(alloc => {
      if (alloc.id === allocId) {
        return { ...alloc, fte: newFte };
      }
      return alloc;
    });

    setActiveAllocation({ ...activeAllocation, allocations: newAllocations });
  };
  
  const handleAgentGroupChange = (allocId: string, newValue: string) => {
    if (!activeAllocation) return;

    const newAllocations = activeAllocation.allocations.map(alloc => {
        if (alloc.id === allocId) {
            return { ...alloc, agentGroupName: newValue };
        }
        return alloc;
    });
    setActiveAllocation({ ...activeAllocation, allocations: newAllocations });
  };

  const handleAddAllocationRow = () => {
    if (!activeAllocation) return;
    const newAlloc: AllocationRow = {
      id: `${activeAllocation.agentName}-new-${Date.now()}`,
      agentGroupName: '',
      fte: 0,
    };
    setActiveAllocation({ ...activeAllocation, allocations: [...activeAllocation.allocations, newAlloc] });
  };

  const handleRemoveAllocationRow = (allocId: string) => {
     if (!activeAllocation) return;
    const newAllocations = activeAllocation.allocations.filter(a => a.id !== allocId);
    setActiveAllocation({ ...activeAllocation, allocations: newAllocations });
  };

  const handleSave = async () => {
    if (!currentDate || !activeAllocation) {
        toast({ variant: 'destructive', title: 'Invalid State', description: 'Please select an agent and a valid month.' });
        return;
    }
    
    const allocationDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    
    const submissions: any[] = [];
    let hasValidationError = false;
    let validationMessage = '';
    
    const totalFte = activeAllocation.allocations.reduce((sum, alloc) => sum + alloc.fte, 0);
    if (Math.abs(totalFte - 1.0) > 0.01) { // Allow for small floating point inaccuracies
        validationMessage = `Total allocation must be 1.0, but it is ${totalFte.toFixed(3)}.`;
        hasValidationError = true;
    }

    if (!hasValidationError) {
      activeAllocation.allocations.forEach(alloc => {
          if (alloc.fte > 0) {
              if (!alloc.agentGroupName) {
                  validationMessage = `Please enter an agent group name.`;
                  hasValidationError = true;
                  return;
              }
            submissions.push({
              content: {
                allocation_date: allocationDate,
                allocation_name: activeAllocation.agentName,
                cost_center_name: alloc.agentGroupName,
                cost_center_number: alloc.agentGroupName, // Using name as number for this use case
                allocation_amount: alloc.fte.toString(),
              }
            });
          }
      });
    }
    
    if (hasValidationError) {
      toast({ variant: 'destructive', title: `Validation Error for ${activeAllocation.agentName}`, description: validationMessage });
      return;
    }

    if (submissions.length === 0) {
      toast({ title: 'No allocation entries to save with FTE > 0.' });
      return;
    }

    try {
        await Promise.all(submissions.map(entry =>
            fetch('/domo/datastores/v1/collections/weekly_allocation/documents/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
            }).then(res => {
                if (!res.ok) throw new Error('One or more saves failed.');
                return res.json();
            })
        ));
        toast({
            title: 'Allocations Saved',
            description: `${submissions.length} allocation entries for ${activeAllocation.agentName} in ${format(currentDate, 'MMM yyyy')} have been saved successfully.`,
        });
        onSaveSuccess();
    } catch (error: any) {
        console.error("Save error:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  if (loading || !currentDate) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-10 w-full" /></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    );
  }
  
  const totalFte = activeAllocation?.allocations.reduce((total, alloc) => total + (alloc.fte || 0), 0) ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Allocation Grid</CardTitle>
            <CardDescription>Select an agent to review and adjust their ticket-based allocations.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <AgentSelect 
              agents={availableAgents}
              value={selectedAgent}
              onValueChange={setSelectedAgent}
            />
            <Button variant="outline" size="icon" onClick={handlePrevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium w-32 text-center">
              {format(currentDate, 'MMM yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
            <Button onClick={handleSave} disabled={!activeAllocation}>Save</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[250px]">Agent Group (Cost Center)</TableHead>
                <TableHead className="text-center min-w-[150px]">FTE</TableHead>
                <TableHead className="w-[100px]"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedAgent ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                    Please select an agent to view their allocation.
                  </TableCell>
                </TableRow>
              ) : !activeAllocation || activeAllocation.allocations.length === 0 ? (
                 <TableRow>
                  <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                    No ticket data found for {selectedAgent} in {format(currentDate, 'MMM yyyy')}. You can add a manual entry.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                {activeAllocation.allocations.map((alloc) => {
                  const isPrePopulated = allTicketData.some(d => d.agent_group_name === alloc.agentGroupName && d.agent_name === selectedAgent);
                  return (
                    <TableRow key={alloc.id}>
                      <TableCell>
                         <Input 
                           value={alloc.agentGroupName}
                           onChange={(e) => handleAgentGroupChange(alloc.id, e.target.value)}
                           placeholder="Enter Agent Group..."
                           className={cn({ "bg-muted cursor-not-allowed": isPrePopulated })}
                           readOnly={isPrePopulated}
                         />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" step="0.01" min="0" placeholder="0.00"
                          className="w-32 text-center mx-auto"
                          value={alloc.fte}
                          onChange={(e) => handleFteChange(alloc.id, e.target.value)}
                        />
                      </TableCell>
                      <TableCell className='text-right'>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveAllocationRow(alloc.id)} disabled={activeAllocation.allocations.length <= 1 && !isPrePopulated}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                </>
              )}
               {selectedAgent && (
                <>
                  <TableRow>
                    <TableCell className="py-2" colSpan={3}>
                      <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleAddAllocationRow}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Manual Allocation
                      </Button>
                    </TableCell>
                  </TableRow>
                  {activeAllocation && activeAllocation.allocations.length > 0 && (
                   <TableRow className="bg-muted/50 font-semibold">
                      <TableCell>Total FTE</TableCell>
                      <TableCell className={cn("text-center", Math.abs(totalFte - 1.0) > 0.01 ? "text-destructive" : "")}>
                          {totalFte.toFixed(3)}
                      </TableCell>
                      <TableCell></TableCell>
                   </TableRow>
                  )}
                </>
               )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

    