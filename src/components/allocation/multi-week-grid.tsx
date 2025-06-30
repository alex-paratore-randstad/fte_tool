
'use client';

import { useState, useMemo, Fragment, useEffect } from 'react';
import { addWeeks, subWeeks, startOfWeek, endOfWeek, format, isBefore, isSameWeek } from 'date-fns';
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
import { ChevronLeft, ChevronRight, PlusCircle, Trash2, Lock } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getAccounts, getEmployees, getAllocations } from '@/services/domo';
import type { Employee, Account, Allocation } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

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

  const [allocations, setAllocations] = useState<MultiWeekAllocationState>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const { currentUser, isManager, isAdmin, isVp } = useCurrentUser();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [empData, accData, initialAllocations] = await Promise.all([
        getEmployees(),
        getAccounts(),
        getAllocations(),
      ]);
      setEmployees(empData);
      setAccounts(accData);

      const transformed: MultiWeekAllocationState = {};
      empData.forEach(emp => {
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
      setAllocations(transformed);
      setLoading(false);
    }
    fetchData();
  }, []);

  const displayedEmployees = useMemo(() => {
    if (isManager) {
        return employees.filter((employee) => employee.manager === currentUser.name);
    }
    if (isVp) {
        const managersUnderVp = employees
          .filter(e => e.manager === currentUser.name)
          .map(m => m.name);
        return employees.filter(e => managersUnderVp.includes(e.manager));
    }
    return employees; // Admins and default
  }, [isManager, isVp, currentUser?.name, employees]);

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

  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Multi-Week Allocation Grid</CardTitle>
          <CardDescription>Allocate FTEs across multiple weeks. Past weeks are locked for non-admins.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Loading grid data...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Multi-Week Allocation Grid</CardTitle>
            <CardDescription>Allocate FTEs across multiple weeks. Past weeks are locked for non-admins.</CardDescription>
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
                {weeks.map(week => {
                  const isPast = isBefore(endOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                  const isCurrent = isSameWeek(week, today, { weekStartsOn: 1 });
                  const isLockedForUser = isPast && !isAdmin;
                  return (
                    <TableHead key={week.toISOString()} className={cn("text-center min-w-[150px] transition-colors", {
                      "bg-muted/40": isPast,
                      "bg-primary/10": isCurrent,
                    })}>
                      <div className='flex items-center justify-center gap-2'>
                        {isLockedForUser && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span>W/E {format(endOfWeek(week, { weekStartsOn: 1 }), 'MMM d')}</span>
                      </div>
                      {isCurrent && <Badge variant="default" className="w-fit mx-auto mt-1">Current</Badge>}
                    </TableHead>
                  )
                })}
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

                    {empAllocations.map((alloc) => {
                      const isRowLocked = weeks.some(week => {
                        const weekKey = formatDateKey(week);
                        const isPast = isBefore(endOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                        const isLockedForUser = isPast && !isAdmin;
                        return isLockedForUser && (alloc.weeklyFtes[weekKey] || 0) > 0;
                      });

                      return (
                      <TableRow key={alloc.id}>
                        <TableCell className="sticky left-0 bg-card z-10">
                          <div className="pl-6">
                            <Select value={alloc.accountId} onValueChange={(newAccId) => handleAccountChange(emp.id, alloc.id, newAccId)} disabled={isRowLocked}>
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
                          const isPast = isBefore(endOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                          const isLockedForUser = isPast && !isAdmin;
                          return (
                            <TableCell key={week.toISOString()} className={cn("text-center", {"bg-muted/40": isPast})}>
                              <Input
                                type="number"
                                step="0.05"
                                min="0"
                                placeholder="0.00"
                                className={cn("w-24 text-center mx-auto", {
                                  "bg-muted/50 cursor-not-allowed": isLockedForUser
                                })}
                                value={alloc.weeklyFtes[weekKey] || ''}
                                onChange={(e) => handleFteChange(emp.id, alloc.id, weekKey, e.target.value)}
                                disabled={isLockedForUser}
                                readOnly={isLockedForUser}
                              />
                            </TableCell>
                          )
                        })}
                         <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveAllocation(emp.id, alloc.id)} disabled={isRowLocked}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )})}

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
