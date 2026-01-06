
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
import { PlusCircle, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { format, startOfMonth, addMonths, subMonths } from 'date-fns';

type TicketAllocationData = {
  agent_name: string;
  agent_group_name: string;
  reporting_month: string;
  reporting_year: string;
  tickets: string;
  total_monthly_tickets: string;
  monthly_ticket_ratio: string;
};

type AllocationRow = {
  id: string;
  clientName: string;
  fte: number;
};

type EmployeeAllocation = {
  agentName: string;
  allocations: AllocationRow[];
};

type MonthlyRatioGridProps = {
  onSaveSuccess: () => void;
};

export function MonthlyRatioGrid({ onSaveSuccess }: MonthlyRatioGridProps) {
  const [activeAllocations, setActiveAllocations] = useState<EmployeeAllocation[]>([]);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();
  
  useEffect(() => {
    // Set date only on the client to avoid hydration mismatch.
    setCurrentDate(new Date());
  }, []);

  const fetchDataAndPrepopulate = useCallback(async () => {
    if (!currentDate) return;
    setIsLoading(true);

    try {
      const selectedMonth = format(currentDate, 'MMM');
      const selectedYear = format(currentDate, 'yyyy');

      const response = await fetch(`/data/v1/fte_tickets_grouped_monthly`);
      
      if (!response.ok) {
        console.warn(`Failed to fetch ticket data for ${selectedMonth} ${selectedYear}.`);
        setActiveAllocations([]);
        return;
      }
      
      const ticketData: TicketAllocationData[] = await response.json();
      // FORCE CLIENT-SIDE FILTERING
      const filteredData = ticketData.filter(item => item.reporting_month === selectedMonth && item.reporting_year === selectedYear );

      const groupedByAgent = filteredData.reduce((acc, item) => {
        if (!acc[item.agent_name]) {
          acc[item.agent_name] = [];
        }
        acc[item.agent_name].push(item);
        return acc;
      }, {} as Record<string, TicketAllocationData[]>);

      const prepopulatedAllocations: EmployeeAllocation[] = Object.entries(groupedByAgent).map(
        ([agentName, agentData]) => ({
          agentName,
          allocations: agentData.map((d) => ({
            id: `${agentName}-${d.agent_group_name}-${Date.now()}`,
            clientName: d.agent_group_name,
            fte: parseFloat(d.monthly_ticket_ratio) || 0,
          })),
        })
      );

      setActiveAllocations(prepopulatedAllocations);

    } catch (error) {
      console.error("Failed to fetch and process ticket data:", error);
      toast({ variant: 'destructive', title: 'Failed to process data' });
      setActiveAllocations([]);
    } finally {
        setIsLoading(false);
    }
  }, [currentDate, toast]);

  useEffect(() => {
    if (currentDate) {
        fetchDataAndPrepopulate();
    }
  }, [currentDate, fetchDataAndPrepopulate]);

  const handlePrevMonth = () => currentDate && setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => currentDate && setCurrentDate(addMonths(currentDate, 1));

  const handleFteChange = (agentName: string, allocId: string, newFteValue: string) => {
    const newFte = parseFloat(newFteValue) || 0;
    setActiveAllocations(prev => prev.map(empAlloc => {
      if (empAlloc.agentName === agentName) {
        const newAllocations = empAlloc.allocations.map(alloc => {
          if (alloc.id === allocId) {
            return { ...alloc, fte: newFte };
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
          clientName: 'MANUAL ENTRY',
          fte: 0,
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
        return { ...empAlloc, allocations: newAllocations };
      }
      return empAlloc;
    }));
  };

  const handleSave = async () => {
    if (!currentDate) {
        toast({ variant: 'destructive', title: 'Invalid Date', description: 'Please select a valid month and year.' });
        return;
    }
    
    const allocationDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    const selectedMonth = format(currentDate, 'MMM');
    const selectedYear = format(currentDate, 'yyyy');
    
    const submissions: any[] = [];
    let hasValidationError = false;

    activeAllocations.forEach(empAlloc => {
      const totalFte = empAlloc.allocations.reduce((sum, alloc) => sum + alloc.fte, 0);
      if (Math.abs(totalFte - 1.0) > 0.01) { // Allow for small floating point inaccuracies
          toast({ variant: 'destructive', title: `Validation Error for ${empAlloc.agentName}`, description: `Total allocation must be 1.0, but it is ${totalFte.toFixed(3)}.` });
          hasValidationError = true;
          return;
      }
      empAlloc.allocations.forEach(alloc => {
        if (alloc.fte > 0) {
          submissions.push({
            content: {
              allocation_date: allocationDate,
              allocation_name: empAlloc.agentName,
              cost_center_name: alloc.clientName,
              cost_center_number: alloc.clientName, // Using name as number for this use case
              allocation_amount: alloc.fte.toString(),
            }
          });
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
            description: `${submissions.length} allocation entries for ${selectedMonth} ${selectedYear} have been saved successfully.`,
        });
        onSaveSuccess();
    } catch (error: any) {
        console.error("Save error:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Allocation Grid</CardTitle>
            <CardDescription>Allocations are pre-populated from monthly ticket ratios. Adjust as needed.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isLoading ? (
                 <>
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-10 w-24" />
                </>
            ) : (
                <>
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium w-32 text-center">
                {currentDate ? format(currentDate, 'MMMM yyyy') : <Skeleton className="h-5 w-24"/>}
                </span>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
                </Button>
                <Button onClick={handleSave} disabled={activeAllocations.length === 0}>Save All</Button>
                </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px] sticky left-0 bg-card z-10">Agent Name</TableHead>
                <TableHead className="min-w-[250px]">Client</TableHead>
                <TableHead className="text-center min-w-[150px]">FTE</TableHead>
                <TableHead className="w-[100px]"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                       <Skeleton className="h-5 w-48 mx-auto" />
                    </TableCell>
                </TableRow>
              ) : activeAllocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                    No ticket data found for the selected period.
                  </TableCell>
                </TableRow>
              ) : (
                activeAllocations.map(({ agentName, allocations }) => {
                  const totalFte = allocations.reduce((total, alloc) => total + (alloc.fte || 0), 0);
                  return (
                    <Fragment key={agentName}>
                      <TableRow className="bg-muted/50 hover:bg-muted">
                        <TableCell className="font-semibold sticky left-0 bg-muted/50 z-10">{agentName}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className={cn("text-center font-semibold", Math.abs(totalFte - 1.0) > 0.01 ? "text-destructive" : "text-muted-foreground")}>
                          {totalFte > 0 ? totalFte.toFixed(3) : '-'}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>

                      {allocations.map((alloc) => (
                        <TableRow key={alloc.id}>
                          <TableCell className="sticky left-0 bg-card z-10"></TableCell>
                          <TableCell>
                           <Input value={alloc.clientName} readOnly className="bg-muted" />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number" step="0.01" min="0" placeholder="0.00"
                              className="w-32 text-center mx-auto"
                              value={alloc.fte || ''}
                              onChange={(e) => handleFteChange(agentName, alloc.id, e.target.value)}
                            />
                          </TableCell>
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
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Manual Allocation
                          </Button>
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

    