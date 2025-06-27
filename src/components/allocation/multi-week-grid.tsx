
'use client';

import { useState, useMemo, Fragment } from 'react';
import { addWeeks, subWeeks, startOfWeek, endOfWeek, format } from 'date-fns';
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
import { ChevronLeft, ChevronRight, PlusCircle, Trash2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { accounts, employees, allocations as initialAllocations } from '@/lib/mock-data';

// Helper to format date as a consistent key
const formatDateKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

type AllocationRow = {
  id: string;
  accountId: string;
  weeklyFtes: { [weekKey: string]: number };
};

type MultiWeekAllocationState = {
  [employeeId: string]: {
    allocations: AllocationRow[];
  };
};

export function MultiWeekGrid() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const [allocations, setAllocations] = useState<MultiWeekAllocationState>(() => {
    const transformed: MultiWeekAllocationState = {};
    
    employees.forEach(emp => {
      transformed[emp.id] = { allocations: [] };
    });

    initialAllocations.forEach(empAlloc => {
      const weekKey = formatDateKey(new Date());
      if (transformed[empAlloc.employeeId]) {
        const employeeGridAllocs = empAlloc.allocations.map((accAlloc, index) => ({
          id: `${empAlloc.employeeId}-${accAlloc.accountId}-${Date.now()}-${index}`, // More unique id
          accountId: accAlloc.accountId,
          weeklyFtes: {
            [weekKey]: accAlloc.fte,
          },
        }));
        transformed[empAlloc.employeeId].allocations.push(...employeeGridAllocs);
      }
    });
    
    return transformed;
  });

  const { currentUser, isManager } = useCurrentUser();

  const displayedEmployees = useMemo(() => (isManager
    ? employees.filter((employee) => employee.manager === currentUser.name)
    : employees), [isManager, currentUser.name]);

  const weeks = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 4 }, (_, i) => addWeeks(start, i));
  }, [currentDate]);

  const handlePrevWeeks = () => setCurrentDate(subWeeks(currentDate, 4));
  const handleNextWeeks = () => setCurrentDate(addWeeks(currentDate, 4));

  const handleFteChange = (employeeId: string, allocId: string, weekKey: string, newFteValue: string) => {
    const newFte = parseFloat(newFteValue) || 0;
    setAllocations(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      const empAllocs = newState[employeeId].allocations;
      const allocIndex = empAllocs.findIndex((a: AllocationRow) => a.id === allocId);
      if (allocIndex > -1) {
        empAllocs[allocIndex].weeklyFtes[weekKey] = newFte;
      }
      return newState;
    });
  };
  
  const handleAccountChange = (employeeId: string, allocId: string, newAccountId: string) => {
     setAllocations(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      const empAllocs = newState[employeeId].allocations;
      const allocIndex = empAllocs.findIndex((a: AllocationRow) => a.id === allocId);
      if (allocIndex > -1) {
        empAllocs[allocIndex].accountId = newAccountId;
      }
      return newState;
    });
  };

  const handleAddAllocation = (employeeId: string) => {
    setAllocations(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      const newAlloc: AllocationRow = {
        id: `${employeeId}-new-${Date.now()}`,
        accountId: '',
        weeklyFtes: {},
      };
      newState[employeeId].allocations.push(newAlloc);
      return newState;
    });
  };

  const handleRemoveAllocation = (employeeId: string, allocId: string) => {
    setAllocations(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState[employeeId].allocations = newState[employeeId].allocations.filter((a: AllocationRow) => a.id !== allocId);
      return newState;
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Multi-Week Allocation Grid</CardTitle>
            <CardDescription>Allocate FTEs across multiple weeks for each team member.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="icon" onClick={handlePrevWeeks}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium w-48 text-center">
              {format(weeks[0], 'MMM d')} - {format(endOfWeek(weeks[3], { weekStartsOn: 1 }), 'MMM d, yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextWeeks}><ChevronRight className="h-4 w-4" /></Button>
            <Button>Save All</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[250px] sticky left-0 bg-card z-10">Employee / Account</TableHead>
                {weeks.map(week => (
                  <TableHead key={week.toISOString()} className="text-center min-w-[150px]">
                    W/E {format(endOfWeek(week, { weekStartsOn: 1 }), 'MMM d')}
                  </TableHead>
                ))}
                <TableHead className="w-[50px]"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedEmployees.map(emp => {
                const empAllocations = allocations[emp.id]?.allocations || [];

                const weeklyTotals = weeks.map(week => {
                  const weekKey = formatDateKey(week);
                  return empAllocations.reduce((total, alloc) => total + (alloc.weeklyFtes[weekKey] || 0), 0);
                });

                return (
                  <Fragment key={emp.id}>
                    <TableRow className="bg-muted/50 hover:bg-muted">
                       <TableCell className="font-semibold sticky left-0 bg-muted/50 z-10">
                        {emp.name}
                        <div className="text-xs text-muted-foreground font-normal">{emp.title}</div>
                      </TableCell>
                      {weeklyTotals.map((total, index) => (
                        <TableCell key={index} className="text-right font-semibold text-muted-foreground">
                          {total > 0 ? total.toFixed(2) : '-'}
                        </TableCell>
                      ))}
                      <TableCell></TableCell>
                    </TableRow>

                    {empAllocations.map((alloc) => (
                      <TableRow key={alloc.id}>
                        <TableCell className="sticky left-0 bg-card z-10">
                          <div className="pl-6">
                            <Select value={alloc.accountId} onValueChange={(newAccId) => handleAccountChange(emp.id, alloc.id, newAccId)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Account..." />
                              </SelectTrigger>
                              <SelectContent>
                                {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        {weeks.map(week => {
                          const weekKey = formatDateKey(week);
                          return (
                            <TableCell key={week.toISOString()} className="text-center">
                              <Input
                                type="number"
                                step="0.05"
                                min="0"
                                placeholder="0.00"
                                className="w-24 text-center mx-auto"
                                value={alloc.weeklyFtes[weekKey] || ''}
                                onChange={(e) => handleFteChange(emp.id, alloc.id, weekKey, e.target.value)}
                              />
                            </TableCell>
                          )
                        })}
                         <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveAllocation(emp.id, alloc.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    <TableRow>
                      <TableCell className="sticky left-0 bg-card z-10 py-2">
                        <div className="pl-6">
                          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleAddAllocation(emp.id)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Allocation
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell colSpan={weeks.length + 1}></TableCell>
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
