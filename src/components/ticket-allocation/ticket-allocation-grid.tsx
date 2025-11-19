
'use client';

import { useState, useMemo, Fragment, useEffect, useCallback } from 'react';
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

// Maps "Jan" to 0, "Feb" to 1, etc.
const monthMap: { [key: string]: number } = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

const formatDateKey = (date: Date) => format(date, 'yyyy-MM');

type AllocationRow = {
  id: string;
  agentGroupName: string;
  monthlyFtes: { [monthKey: string]: number };
};

type EmployeeAllocation = {
  agentName: string;
  allocations: AllocationRow[];
};

type TicketAllocationGridProps = {
  onSaveSuccess: () => void;
};

export function TicketAllocationGrid({ onSaveSuccess }: TicketAllocationGridProps) {
  const [activeAllocations, setActiveAllocations] = useState<EmployeeAllocation[]>([]);
  const [allAgents, setAllAgents] = useState<{name: string}[]>([]);
  const [ticketData, setTicketData] = useState<TicketAllocationData[]>([]);

  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const months = useMemo(() => {
    if (!currentDate) return [];
    return Array.from({ length: 12 }, (_, i) => subMonths(currentDate, i)).reverse();
  }, [currentDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/data/v1/fte_tickets_grouped_monthly`);
      if (!response.ok) {
        throw new Error('Failed to fetch ticket data');
      }
      const data: TicketAllocationData[] = await response.json();
      setTicketData(data);

      const uniqueAgents = [...new Set(data.map(item => item.agent_name))];
      setAllAgents(uniqueAgents.map(name => ({ name })));

    } catch (error) {
      console.error("Failed to fetch and process ticket data:", error);
      toast({ variant: 'destructive', title: 'Failed to process data' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const availableAgents = useMemo(() => {
    const activeAgentNames = new Set(activeAllocations.map(a => a.agentName));
    let unallocatedAgents = allAgents.filter(agent => !activeAgentNames.has(agent.name));

    if (searchTerm) {
      unallocatedAgents = unallocatedAgents.filter(agent => agent.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return unallocatedAgents;
  }, [allAgents, activeAllocations, searchTerm]);

  const handleAddAgent = (agentName: string) => {
    if (!agentName) return;

    const agentToAdd = allAgents.find(a => a.name === agentName);
    if (agentToAdd) {
      const isAlreadyActive = activeAllocations.some(a => a.agentName === agentName);
      if (isAlreadyActive) {
          toast({ variant: 'destructive', title: 'Agent already in grid' });
          return;
      }

      // Pre-populate based on ticket data
      const agentTicketData = ticketData.filter(d => d.agent_name === agentName);
      const groupedByCostCenter = agentTicketData.reduce((acc, item) => {
          if (!acc[item.agent_group_name]) {
              acc[item.agent_group_name] = {
                  id: `${agentName}-${item.agent_group_name}-${Date.now()}`,
                  agentGroupName: item.agent_group_name,
                  monthlyFtes: {},
              };
          }
          const monthKey = formatDateKey(new Date(parseInt(item.reporting_year, 10), monthMap[item.reporting_month]));
          acc[item.agent_group_name].monthlyFtes[monthKey] = parseFloat(item.monthly_ticket_ratio) || 0;
          return acc;
      }, {} as Record<string, AllocationRow>);

      const newAllocations: AllocationRow[] = Object.values(groupedByCostCenter);

      // Add an empty row if no data exists
      if (newAllocations.length === 0) {
        newAllocations.push({
          id: `${agentName}-new-${Date.now()}`,
          agentGroupName: 'MANUAL ENTRY',
          monthlyFtes: {},
        });
      }

      setActiveAllocations(prev => [{
        agentName: agentToAdd.name,
        allocations: newAllocations
      }, ...prev]);
    }
  };

  const handleRemoveAgent = (agentName: string) => {
    setActiveAllocations(prev => prev.filter(a => a.agentName !== agentName));
  };
  
  const handleFteChange = (agentName: string, allocId: string, monthKey: string, newFteValue: string) => {
    const newFte = parseFloat(newFteValue) || 0;
    setActiveAllocations(prev => prev.map(empAlloc => {
      if (empAlloc.agentName === agentName) {
        const newAllocations = empAlloc.allocations.map(alloc => {
          if (alloc.id === allocId) {
            return { ...alloc, monthlyFtes: { ...alloc.monthlyFtes, [monthKey]: newFte } };
          }
          return alloc;
        });
        return { ...empAlloc, allocations: newAllocations };
      }
      return empAlloc;
    }));
  };

  const handleAddAllocationRow = (agentName: string) => {
    setActiveAllocations(prev => prev.map(empAlloc => {
      if (empAlloc.agentName === agentName) {
        const newAlloc: AllocationRow = {
          id: `${agentName}-new-${Date.now()}`,
          agentGroupName: 'MANUAL ENTRY',
          monthlyFtes: {},
        };
        return { ...empAlloc, allocations: [...empAlloc.allocations, newAlloc] };
      }
      return empAlloc;
    }));
  };

  const handleRemoveAllocationRow = (agentName: string, allocId: string) => {
    setActiveAllocations(prev => prev.map(empAlloc => {
      if (empAlloc.agentName === agentName) {
        const newAllocations = empAlloc.allocations.filter(a => a.id !== allocId);
        // If it's the last row, don't remove, just clear it or handle as needed
        if (newAllocations.length === 0) {
            toast({variant: 'destructive', title: "Cannot remove the last allocation row."});
            return empAlloc;
        }
        return { ...empAlloc, allocations: newAllocations };
      }
      return empAlloc;
    }));
  };

  const handleSave = async () => {
    const submissions: any[] = [];
    let hasValidationError = false;

    activeAllocations.forEach(empAlloc => {
      const monthlyTotals: {[key: string]: number} = {};
      
      // Calculate totals per month
      empAlloc.allocations.forEach(alloc => {
        Object.entries(alloc.monthlyFtes).forEach(([monthKey, fte]) => {
          if (!monthlyTotals[monthKey]) monthlyTotals[monthKey] = 0;
          monthlyTotals[monthKey] += fte;

          if (fte > 0) {
            const allocationDate = format(new Date(monthKey), 'yyyy-MM-dd');
            submissions.push({
              content: {
                allocation_date: allocationDate,
                allocation_name: empAlloc.agentName,
                cost_center_name: alloc.agentGroupName,
                cost_center_number: alloc.agentGroupName, // Using name as number for this use case
                allocation_amount: fte.toString(),
              }
            });
          }
        });
      });

      // Validate totals
      Object.entries(monthlyTotals).forEach(([monthKey, total]) => {
         if (Math.abs(total - 1.0) > 0.01) { // Allow for small floating point inaccuracies
          toast({ variant: 'destructive', title: `Validation Error for ${empAlloc.agentName}`, description: `Total for ${format(new Date(monthKey), 'MMM yyyy')} must be 1.0, but is ${total.toFixed(3)}.` });
          hasValidationError = true;
        }
      });
    });

    if (hasValidationError) return;

    if (submissions.length === 0) {
      toast({ title: 'No changes to save.' });
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
            description: `${submissions.length} allocation entries have been saved successfully.`,
        });
        onSaveSuccess();
    } catch (error: any) {
        console.error("Save error:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  const handlePrev = () => {
    if (currentDate) {
      setCurrentDate(subMonths(currentDate, 12));
    }
  };
  const handleNext = () => {
    if (currentDate) {
      setCurrentDate(addMonths(currentDate, 12));
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Ticket Allocation Grid</CardTitle>
            <CardDescription>Add agents to adjust their monthly FTE allocation based on ticket ratios.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select onValueChange={handleAddAgent}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Add Agent..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectSearch placeholder="Search agent..." onChange={setSearchTerm} />
                    {availableAgents.map(a => (
                        <SelectItem key={a.name} value={a.name}>
                            {a.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handlePrev}><ChevronLeft className="h-4 w-4" /></Button>
             <span className="text-sm font-medium w-48 text-center">
              {months.length > 0 ? `${format(months[0], 'MMM yyyy')} - ${format(months[months.length -1], 'MMM yyyy')}` : '...'}
            </span>
            <Button variant="outline" size="icon" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>
            <Button onClick={handleSave} disabled={activeAllocations.length === 0}>Save All</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px] sticky left-0 bg-card z-10">Agent Name</TableHead>
                <TableHead className="min-w-[250px]">Agent Group (Cost Center)</TableHead>
                {months.map(month => (
                    <TableHead key={month.toISOString()} className="text-center min-w-[150px]">
                      {format(month, 'MMM yyyy')}
                    </TableHead>
                ))}
                <TableHead className="w-[100px] text-right"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
             {activeAllocations.length === 0 && (
                <TableRow>
                    <TableCell colSpan={months.length + 3} className="text-center h-24 text-muted-foreground">
                        Select an agent from the dropdown above to begin.
                    </TableCell>
                </TableRow>
             )}
              {activeAllocations.map(({ agentName, allocations }) => {
                const monthlyTotals = months.map(month => {
                  const monthKey = formatDateKey(month);
                  return allocations.reduce((total, alloc) => total + (alloc.monthlyFtes[monthKey] || 0), 0);
                });

                return (
                  <Fragment key={agentName}>
                    <TableRow className="bg-muted/50 hover:bg-muted">
                       <TableCell className="font-semibold sticky left-0 bg-muted/50 z-10">{agentName}</TableCell>
                      <TableCell></TableCell>
                      {monthlyTotals.map((total, index) => (
                        <TableCell key={index} className={cn("text-center font-semibold", total > 1.0 ? "text-destructive" : "text-muted-foreground")}>
                          {total > 0 ? total.toFixed(3) : '-'}
                        </TableCell>
                      ))}
                      <TableCell className='text-right'>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveAgent(agentName)}>
                           <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {allocations.map((alloc) => (
                      <TableRow key={alloc.id}>
                        <TableCell className="sticky left-0 bg-card z-10"></TableCell>
                        <TableCell>
                          <Input value={alloc.agentGroupName} readOnly={alloc.agentGroupName !== 'MANUAL ENTRY'} className={cn({"bg-muted": alloc.agentGroupName !== 'MANUAL ENTRY'})} />
                        </TableCell>
                        {months.map(month => {
                          const monthKey = formatDateKey(month);
                          return (
                            <TableCell key={month.toISOString()} className="text-center">
                              <Input
                                type="number" step="0.01" min="0" placeholder="0.000"
                                className="w-24 text-center mx-auto"
                                value={alloc.monthlyFtes[monthKey] || ''}
                                onChange={(e) => handleFteChange(agentName, alloc.id, monthKey, e.target.value)}
                              />
                            </TableCell>
                          )
                        })}
                         <TableCell className='text-right'>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveAllocationRow(agentName, alloc.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    <TableRow>
                      <TableCell className="sticky left-0 bg-card z-10 py-2" colSpan={2}>
                        <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleAddAllocationRow(agentName)}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Allocation Row
                        </Button>
                      </TableCell>
                      <TableCell colSpan={months.length + 1}></TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
