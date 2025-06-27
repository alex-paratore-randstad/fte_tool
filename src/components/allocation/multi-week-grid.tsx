
'use client';

import { useState, useMemo } from 'react';
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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { accounts, employees, allocations as initialAllocations } from '@/lib/mock-data';

// Helper to format date as a consistent key
const formatDateKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

export function MultiWeekGrid() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0].id);

  // Transform initial data into a structure suitable for multi-week editing
  const [allocations, setAllocations] = useState(() => {
    const transformed: {[empId: string]: {[accId: string]: {[weekKey: string]: number}}} = {};
    initialAllocations.forEach(empAlloc => {
      transformed[empAlloc.employeeId] = {};
      empAlloc.allocations.forEach(accAlloc => {
        if (!transformed[empAlloc.employeeId][accAlloc.accountId]) {
           transformed[empAlloc.employeeId][accAlloc.accountId] = {};
        }
        // Seed the current week with mock data for demonstration
        transformed[empAlloc.employeeId][accAlloc.accountId][formatDateKey(new Date())] = accAlloc.fte;
      });
    });
    return transformed;
  });

  const { currentUser, isManager } = useCurrentUser();

  const displayedEmployees = isManager
    ? employees.filter((employee) => employee.manager === currentUser.name)
    : employees;

  const weeks = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 4 }, (_, i) => addWeeks(start, i));
  }, [currentDate]);

  const handlePrevWeeks = () => setCurrentDate(subWeeks(currentDate, 4));
  const handleNextWeeks = () => setCurrentDate(addWeeks(currentDate, 4));

  const getFteForWeek = (employeeId: string, weekDate: Date): number => {
    const weekKey = formatDateKey(weekDate);
    return allocations[employeeId]?.[selectedAccountId]?.[weekKey] || 0;
  };

  const handleFteChange = (employeeId: string, weekDate: Date, newFteValue: string) => {
    const newFte = parseFloat(newFteValue) || 0;
    const weekKey = formatDateKey(weekDate);

    setAllocations(prev => {
      const newState = JSON.parse(JSON.stringify(prev)); // Deep copy for mutation
      if (!newState[employeeId]) newState[employeeId] = {};
      if (!newState[employeeId][selectedAccountId]) newState[employeeId][selectedAccountId] = {};
      newState[employeeId][selectedAccountId][weekKey] = newFte;
      return newState;
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Multi-Week Allocation Grid</CardTitle>
            <CardDescription>Allocate FTEs for the selected account across multiple weeks.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="icon" onClick={handlePrevWeeks}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium w-48 text-center">
              {format(weeks[0], 'MMM d')} - {format(endOfWeek(weeks[3], { weekStartsOn: 1 }), 'MMM d, yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextWeeks}><ChevronRight className="h-4 w-4" /></Button>
             <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Account" />
                </SelectTrigger>
                <SelectContent>
                    {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Button>Save All</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[250px] sticky left-0 bg-card">Employee</TableHead>
                {weeks.map(week => (
                  <TableHead key={week.toISOString()} className="text-center min-w-[150px]">
                    W/E {format(endOfWeek(week, { weekStartsOn: 1 }), 'MMM d')}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedEmployees.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium sticky left-0 bg-card">
                      <div>{emp.name}</div>
                      <div className="text-sm text-muted-foreground">{emp.title}</div>
                  </TableCell>
                  {weeks.map(week => (
                    <TableCell key={week.toISOString()} className="text-center">
                      <Input
                        type="number"
                        step="0.05"
                        min="0"
                        className="w-24 text-center mx-auto"
                        value={getFteForWeek(emp.id, week)}
                        onChange={(e) => handleFteChange(emp.id, week, e.target.value)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
