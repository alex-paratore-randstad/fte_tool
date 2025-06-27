
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { accounts, employees, allocations } from '@/lib/mock-data';
import type { Allocation } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Calendar } from '@/components/ui/calendar';
import { addWeeks, subWeeks, endOfWeek, format } from 'date-fns';

export default function AllocationPage() {
  const [weekEndingDate, setWeekEndingDate] = useState(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [employeeAllocations, setEmployeeAllocations] = useState(() => {
    // Ensure every employee has an allocation entry for easier state management
    return employees.map(emp => {
      const existingAlloc = allocations.find(a => a.employeeId === emp.id);
      // Deep copy to prevent state mutation issues
      return existingAlloc 
        ? JSON.parse(JSON.stringify(existingAlloc)) 
        : { employeeId: emp.id, allocations: [] };
    });
  });

  const { currentUser, isManager } = useCurrentUser();

  // Admins see all employees, managers see their direct reports.
  const displayedEmployees = isManager
    ? employees.filter((employee) => employee.manager === currentUser.name)
    : employees;

  // The manager's team name for the card title
  const cardTitle = isManager && displayedEmployees.length > 0 ? `${displayedEmployees[0].team} Team` : 'All Teams';

  const getEmployeeAllocation = (employeeId: string) => {
    return employeeAllocations.find((a) => a.employeeId === employeeId) || { employeeId, allocations: [] };
  };

  const calculateTotalFte = (employeeId: string) => {
    const allocation = getEmployeeAllocation(employeeId);
    return allocation.allocations.reduce((sum, alloc) => sum + Number(alloc.fte || 0), 0);
  };
  
  const handlePreviousWeek = () => {
    setWeekEndingDate((prev) => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setWeekEndingDate((prev) => addWeeks(prev, 1));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setWeekEndingDate(endOfWeek(date, { weekStartsOn: 1 }));
    }
  };

  const handleAllocationChange = (
    employeeId: string, 
    index: number, 
    field: 'accountId' | 'fte', 
    value: string | number
  ) => {
    setEmployeeAllocations(currentAllocs => 
        currentAllocs.map(alloc => {
            if (alloc.employeeId === employeeId) {
                const newAllocations = [...alloc.allocations];
                const updatedAlloc = { ...newAllocations[index], [field]: value };
                newAllocations[index] = updatedAlloc;
                return { ...alloc, allocations: newAllocations };
            }
            return alloc;
        })
    );
  };

  const handleAddAllocation = (employeeId: string) => {
    setEmployeeAllocations(currentAllocs => 
        currentAllocs.map(alloc => {
            if (alloc.employeeId === employeeId) {
                return {
                    ...alloc,
                    allocations: [...alloc.allocations, { accountId: '', fte: 0 }]
                };
            }
            return alloc;
        })
    );
  };

  const handleRemoveAllocation = (employeeId: string, indexToRemove: number) => {
    setEmployeeAllocations(currentAllocs => 
        currentAllocs.map(alloc => {
            if (alloc.employeeId === employeeId) {
                return {
                    ...alloc,
                    allocations: alloc.allocations.filter((_, index) => index !== indexToRemove)
                };
            }
            return alloc;
        })
    );
  };

  const weekEnding = format(weekEndingDate, "eeee, MMMM d, yyyy");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Weekly Allocation"
        description={`Enter FTE allocations for the week ending ${weekEnding}.`}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[280px] justify-start text-left font-normal gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{weekEnding}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={weekEndingDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="icon" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button>Save Allocations</Button>
            </div>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="w-[60%]">Allocations</TableHead>
                <TableHead className="text-right">Total FTE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedEmployees.map((emp) => {
                const empAllocations = getEmployeeAllocation(emp.id);
                const totalFte = calculateTotalFte(emp.id);
                return (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium align-top pt-6">
                      <div>{emp.name}</div>
                      <div className="text-sm text-muted-foreground">{emp.title}</div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-col gap-4">
                        {empAllocations.allocations.length === 0 && (
                          <p className="text-sm text-muted-foreground py-2">No allocations assigned.</p>
                        )}
                        {empAllocations.allocations.map((alloc, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Select
                              value={alloc.accountId}
                              onValueChange={(value) => handleAllocationChange(emp.id, index, 'accountId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select Account" />
                              </SelectTrigger>
                              <SelectContent>
                                {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              step="0.05"
                              min="0"
                              value={alloc.fte}
                              onChange={(e) => handleAllocationChange(emp.id, index, 'fte', e.target.value)}
                              className="w-28 text-center"
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveAllocation(emp.id, index)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2 w-fit" 
                          onClick={() => handleAddAllocation(emp.id)}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Allocation
                        </Button>
                      </div>
                    </TableCell>

                    <TableCell className="text-right align-top pt-6">
                      {totalFte !== 1 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'flex items-center justify-end gap-2 font-semibold',
                                'text-destructive'
                              )}
                            >
                              <AlertCircle className="h-4 w-4" />
                              {totalFte.toFixed(2)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {totalFte > 1
                                ? 'Total FTE is over-allocated.'
                                : 'Total FTE is under-allocated.'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div
                          className={cn(
                            'flex items-center justify-end gap-2 font-semibold',
                            'text-green-600'
                          )}
                        >
                          <CheckCircle className="h-4 w-4" />
                          {totalFte.toFixed(2)}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
