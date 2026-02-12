
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectSearch } from '@/components/ui/select-search';
import { PlusCircle, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { format, startOfMonth, addMonths, subMonths } from 'date-fns';
import { TeamMember } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

type TicketAllocationData = {
  agent_name: string;
  agent_group_name: string;
  department_name: string;
  client_name: string;
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

type MonthlyFreshserviceGridProps = {
  onSaveSuccess: () => void;
};

// Employee Select Component
const EmployeeSelect = ({ 
  employees, 
  onValueChange,
  value,
  disabled
}: { 
  employees: { Person_Number: string, Full_Name: string }[], 
  onValueChange: (value: string) => void,
  value: string,
  disabled?: boolean
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredEmployees = useMemo(() => {
    const sortedEmployees = employees.sort((a,b) => a.Full_Name.localeCompare(b.Full_Name));
    if (!searchTerm) {
      return sortedEmployees;
    }
    return sortedEmployees.filter(e => e.Full_Name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [employees, searchTerm]);

  return (
    <Select onValueChange={onValueChange} value={value} disabled={disabled}>
      <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Load Employee..." />
      </SelectTrigger>
      <SelectContent>
          <SelectSearch placeholder="Search employee..." onChange={setSearchTerm} />
          <ScrollArea className="h-64">
            {filteredEmployees.map(e => (
                <SelectItem key={e.Person_Number} value={e.Full_Name}>
                    {e.Full_Name}
                </SelectItem>
            ))}
            {filteredEmployees.length === 0 && (
                <div className="p-4 text-sm text-center text-muted-foreground">
                    No employees found.
                </div>
            )}
          </ScrollArea>
      </SelectContent>
    </Select>
  );
};

// Placeholder Manager Select
const ManagerSelect = ({ disabled }: { disabled?: boolean }) => (
    <Select disabled={disabled}>
        <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Load Team (Future)..." />
        </SelectTrigger>
        <SelectContent></SelectContent>
    </Select>
);


export function MonthlyFreshserviceGrid({ onSaveSuccess }: MonthlyFreshserviceGridProps) {
  const [activeAllocations, setActiveAllocations] = useState<EmployeeAllocation[]>([]);
  const [allTicketData, setAllTicketData] = useState<TicketAllocationData[]>([]);
  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployeeToAdd, setSelectedEmployeeToAdd] = useState('');
  const [hasMounted, setHasMounted] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const fetchDataForMonth = useCallback(async (date: Date) => {
    setIsLoading(true);
    try {
      const selectedMonth = format(date, 'MMM');
      const selectedYear = format(date, 'yyyy');

      const [ticketResponse, employeeResponse] = await Promise.all([
          fetch(`/data/v1/fte_tickets_grouped_monthly_view`),
          fetch('/data/v1/gbs_ind_hr_fte_report')
      ]);

      if (!ticketResponse.ok || !employeeResponse.ok) {
        console.warn(`Failed to fetch all required data.`);
        setAllTicketData([]);
        setAllEmployees([]);
        return;
      }
      
      const ticketData: TicketAllocationData[] = await ticketResponse.json();
      const employeeData: TeamMember[] = await employeeResponse.json();
      
      setAllEmployees(employeeData);

      // Filter ticket data for the selected month and store it
      const filteredTicketData = ticketData.filter(item => 
        String(item.reporting_month).trim() === selectedMonth && 
        String(item.reporting_year).trim() === selectedYear
      );
      setAllTicketData(filteredTicketData);
      
      // Important: Clear active allocations when the month changes
      setActiveAllocations([]);

    } catch (error) {
      console.error("Failed to fetch and process data:", error);
      toast({ variant: 'destructive', title: 'Failed to process data' });
      setActiveAllocations([]);
      setAllTicketData([]);
      setAllEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    // Set initial date on client-side only to avoid hydration errors
    setCurrentDate(new Date());
  }, []);

  useEffect(() => {
    // Fetch data whenever the date changes, but only if date is not null
    if (currentDate) {
      fetchDataForMonth(currentDate);
    }
  }, [currentDate, fetchDataForMonth]);


  const availableEmployees = useMemo(() => {
    const activeEmployeeNames = new Set(activeAllocations.map(a => a.agentName));
    const uniqueAgentNamesFromTickets = Array.from(new Set(allTicketData.map(t => t.agent_name)));
    
    const dynamicEmployees = allEmployees
        .filter(e => uniqueAgentNamesFromTickets.includes(e.Full_Name) && !activeEmployeeNames.has(e.Full_Name))
        .map(e => ({ Person_Number: e.Person_Number, Full_Name: e.Full_Name }));

    const tempWorkerOption = { Person_Number: 'TEMP_WORKER', Full_Name: 'Temp Worker' };
    if (!activeEmployeeNames.has(tempWorkerOption.Full_Name)) {
        return [tempWorkerOption, ...dynamicEmployees];
    }
    return dynamicEmployees;
  }, [allEmployees, allTicketData, activeAllocations]);

  const handleAddEmployee = (employeeName: string) => {
    if (!employeeName) return;
    
    setSelectedEmployeeToAdd(employeeName);

    const isAlreadyActive = activeAllocations.some(a => a.agentName === employeeName);
    if (isAlreadyActive) {
      toast({ variant: 'destructive', title: 'Employee already in grid' });
      return;
    }

    if (employeeName === 'Temp Worker') {
        const newEmployeeAllocation: EmployeeAllocation = {
            agentName: employeeName,
            allocations: [{
                id: `temp-worker-new-${Date.now()}`,
                clientName: '',
                fte: 1.0
            }],
        };
        setActiveAllocations(prev => [newEmployeeAllocation, ...prev]);
        setTimeout(() => setSelectedEmployeeToAdd(''), 0);
        return;
    }
    
    // Find ticket data for the selected employee
    const employeeTicketData = allTicketData.filter(t => t.agent_name === employeeName);

    if (employeeTicketData.length > 0) {
      const newEmployeeAllocation: EmployeeAllocation = {
        agentName: employeeName,
        allocations: employeeTicketData.map(d => ({
          id: `${employeeName}-${d.client_name || d.agent_group_name}-${Date.now()}`,
          clientName: d.client_name || d.agent_group_name,
          fte: parseFloat(d.monthly_ticket_ratio) || 0,
        })),
      };
      setActiveAllocations(prev => [newEmployeeAllocation, ...prev]);
    } else {
      toast({ variant: 'destructive', title: 'No Data', description: `No ticket allocation data found for ${employeeName} in this month.` });
    }
    
    setTimeout(() => setSelectedEmployeeToAdd(''), 0);
  };


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
            // If it's the last row, remove the entire employee
            if(empAlloc.allocations.length === 1) {
                return null;
            }
            const newAllocations = empAlloc.allocations.filter(a => a.id !== allocId);
            return { ...empAlloc, allocations: newAllocations };
        }
        return empAlloc;
    }).filter(Boolean) as EmployeeAllocation[]);
  };
  
  const handleRemoveEmployee = (agentName: string) => {
      setActiveAllocations(prev => prev.filter(a => a.agentName !== agentName));
  }

  const handleSave = async () => {
    if (!currentDate) {
        toast({ variant: 'destructive', title: 'Invalid Date', description: 'Please select a valid month and year.' });
        return;
    }
    
    setIsSubmitting(true);
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

    if (hasValidationError) {
        setIsSubmitting(false);
        return;
    }

    if (submissions.length === 0) {
      toast({ title: 'No changes to save.' });
      setIsSubmitting(false);
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
    } finally {
        setIsSubmitting(false);
    }
  };

  const isGridLoading = isLoading || !currentDate;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Allocation Grid</CardTitle>
            <CardDescription>Add employees to view and adjust their pre-populated ticket ratios.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <EmployeeSelect 
                employees={availableEmployees}
                onValueChange={handleAddEmployee}
                value={selectedEmployeeToAdd}
                disabled={isGridLoading || isSubmitting}
            />
            <ManagerSelect disabled={isGridLoading || isSubmitting}/>
            <Button variant="outline" size="icon" onClick={handlePrevMonth} disabled={isGridLoading || isSubmitting}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-32 text-center">
              {currentDate ? format(currentDate, 'MMMM yyyy') : <Skeleton className="h-5 w-24" />}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isGridLoading || isSubmitting}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button onClick={handleSave} disabled={activeAllocations.length === 0 || isSubmitting || isGridLoading}>
              {isSubmitting ? 'Saving...' : 'Save All'}
            </Button>
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
              {!hasMounted || isGridLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                     <Skeleton className="h-5 w-48 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : activeAllocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                    Select an employee from the dropdown to begin.
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
                        <TableCell className='text-right'>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveEmployee(agentName)} disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
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
                              disabled={isSubmitting}
                            />
                          </TableCell>
                          <TableCell className='text-right'>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveAllocationRow(agentName, alloc.id)} disabled={isSubmitting}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                      <TableRow>
                        <TableCell className="sticky left-0 bg-card z-10 py-2" colSpan={2}>
                          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleAddAllocationRow(agentName)} disabled={isSubmitting}>
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
