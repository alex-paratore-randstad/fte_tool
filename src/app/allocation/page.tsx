'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { accounts, employees, allocations } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Calendar } from '@/components/ui/calendar';
import { addWeeks, subWeeks, endOfWeek, format } from 'date-fns';

export default function AllocationPage() {
  const [weekEndingDate, setWeekEndingDate] = useState(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const { currentUser, isManager } = useCurrentUser();

  // Admins see all employees, managers see their direct reports.
  const displayedEmployees = isManager
    ? employees.filter((employee) => employee.manager === currentUser.name)
    : employees;

  // The manager's team name for the card title
  const cardTitle = isManager && displayedEmployees.length > 0 ? `${displayedEmployees[0].team} Team` : 'All Teams';

  const getEmployeeAllocation = (employeeId: string) => {
    // NOTE: This logic is for demonstration and doesn't change with the week.
    // A real implementation would fetch/filter allocations for the selected week.
    return allocations.find((a) => a.employeeId === employeeId) || { allocations: [] };
  };

  const calculateTotalFte = (employeeId: string) => {
    const allocation = getEmployeeAllocation(employeeId);
    return allocation.allocations.reduce((sum, alloc) => sum + alloc.fte, 0);
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

  const weekEnding = format(weekEndingDate, "eeee, MMMM d, yyyy");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Weekly Allocation"
        description={`Enter FTE allocations for the week ending ${weekEnding}.`}
        actions={
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
            <Button>Save Allocations</Button>
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
                {accounts.map((acc) => (
                  <TableHead key={acc.id} className="text-center">
                    {acc.name}
                  </TableHead>
                ))}
                <TableHead className="text-right">Total FTE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedEmployees.map((emp) => {
                const totalFte = calculateTotalFte(emp.id);
                return (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-sm text-muted-foreground">{emp.title}</div>
                    </TableCell>
                    {accounts.map((acc) => {
                      const allocation = getEmployeeAllocation(emp.id).allocations.find(a => a.accountId === acc.id);
                      return (
                        <TableCell key={acc.id} className="w-32">
                          <Input
                            type="number"
                            step="0.05"
                            min="0"
                            max="1"
                            defaultValue={allocation?.fte || 0}
                            className="text-center"
                          />
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right">
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
