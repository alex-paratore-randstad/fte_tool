
'use client';

import { useState, useEffect } from 'react';
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
import { getAccounts, getEmployees, getAllocations } from '@/services/domo';
import type { Employee, Account, Allocation } from '@/types';
import { cn } from '@/lib/utils';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle,
  PlusCircle,
  Trash2,
  Copy,
  Lock,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Calendar } from '@/components/ui/calendar';
import { addWeeks, subWeeks, endOfWeek, format, isBefore, startOfWeek, isSameWeek } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiWeekGrid } from '@/components/allocation/multi-week-grid';
import { Badge } from '@/components/ui/badge';


export default function AllocationPage() {
  const [weekEndingDate, setWeekEndingDate] = useState(endOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [baseAllocations, setBaseAllocations] = useState<Allocation[]>([]);
  const [employeeAllocations, setEmployeeAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);

  const { currentUser, isManager, isAdmin, isVp } = useCurrentUser();
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [empData, accData, allocData] = await Promise.all([
        getEmployees(),
        getAccounts(),
        getAllocations(),
      ]);
      setEmployees(empData);
      setAccounts(accData);
      setBaseAllocations(allocData);

      const initialAllocs = empData.map(emp => {
        const existingAlloc = allocData.find(a => a.employeeId === emp.id);
        return existingAlloc 
          ? JSON.parse(JSON.stringify(existingAlloc)) 
          : { employeeId: emp.id, allocations: [] };
      });
      setEmployeeAllocations(initialAllocs);
      setLoading(false);
    }
    fetchData();
  }, []);

  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
  const isPastWeek = isBefore(weekEndingDate, startOfCurrentWeek);
  const isCurrentWeek = isSameWeek(weekEndingDate, today, { weekStartsOn: 1 });
  const isLocked = isPastWeek && !isAdmin; // Past weeks are locked for non-admins

  const displayedEmployees = isManager
    ? employees.filter((employee) => employee.manager === currentUser.name)
    : isVp
    ? (() => {
        const managersUnderVp = employees
          .filter(e => e.manager === currentUser.name)
          .map(m => m.name);
        // VPs see the employees of the managers who report to them.
        return employees.filter((e) => managersUnderVp.includes(e.manager));
      })()
    : employees; // Admins see all

  const getCardTitle = () => {
    if (isManager) return `${currentUser.team} Team`;
    if (isVp) return `My Organization's Teams`;
    return 'All Teams';
  }

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
  
  const handleCopyLastWeek = () => {
    const initialAllocations = employees.map(emp => {
      const existingAlloc = baseAllocations.find(a => a.employeeId === emp.id);
      return existingAlloc 
        ? JSON.parse(JSON.stringify(existingAlloc)) 
        : { employeeId: emp.id, allocations: [] };
    });
    setEmployeeAllocations(initialAllocations);
    toast({
      title: 'Allocations Copied',
      description: 'The allocations from last week have been copied to the current week.',
    });
  };

  const handleSave = () => {
    // In a real app, this would be an API call.
    toast({
      title: 'Allocations Saved',
      description: 'Your changes have been saved successfully.',
    });
  };

  const weekEnding = format(weekEndingDate, "eeee, MMMM d, yyyy");

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Weekly Allocation"
          description="Enter FTE allocations for your team. Choose a view that works best for you."
        />
        <p>Loading allocation data...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Weekly Allocation"
        description="Enter FTE allocations for your team. Choose a view that works best for you."
      />
      <Tabs defaultValue="single-week">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single-week">Single Week View</TabsTrigger>
          <TabsTrigger value="multi-week">Multi-Week Grid</TabsTrigger>
        </TabsList>

        <TabsContent value="single-week" className="mt-4">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between flex-wrap gap-4 rounded-lg border bg-card text-card-foreground p-4 shadow-sm">
                <div className="grid gap-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold tracking-tight">Week Ending {weekEnding}</h2>
                      {isPastWeek ? (
                        !isAdmin ? (
                          <Badge variant="destructive" className="gap-1.5"><Lock className="h-3 w-3" /> Locked</Badge>
                        ) : (
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="gap-1.5 cursor-help"><Lock className="h-3 w-3" /> Admin Mode</Badge>
                              </TooltipTrigger>
                              <TooltipContent><p>Past week is editable for admins.</p></TooltipContent>
                          </Tooltip>
                        )
                      ) : isCurrentWeek ? (
                          <Badge variant="default">Current Week</Badge>
                      ) : (
                          <Badge variant="secondary">Future</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isLocked ? 'These allocations are locked. Admins can edit past weeks.' : 'Enter FTE allocations for the selected week.'}
                    </p>
                </div>
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
                        <Button variant="outline" onClick={handleCopyLastWeek} disabled={isLocked}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Last Week
                        </Button>
                        <Button disabled={isLocked} onClick={handleSave}>Save Allocations</Button>
                    </div>
                </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{getCardTitle()}</CardTitle>
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
                                    disabled={isLocked}
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
                                    disabled={isLocked}
                                    readOnly={isLocked}
                                  />
                                  <Button variant="ghost" size="icon" onClick={() => handleRemoveAllocation(emp.id, index)} disabled={isLocked}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2 w-fit" 
                                onClick={() => handleAddAllocation(emp.id)}
                                disabled={isLocked}
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
                                  <div className={cn('flex items-center justify-end gap-2 font-semibold', 'text-destructive')}>
                                    <AlertCircle className="h-4 w-4" />
                                    {totalFte.toFixed(2)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{totalFte > 1 ? 'Total FTE is over-allocated.' : 'Total FTE is under-allocated.'}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <div className={cn('flex items-center justify-end gap-2 font-semibold', 'text-green-600')}>
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
        </TabsContent>
        
        <TabsContent value="multi-week" className="mt-4">
          <MultiWeekGrid />
        </TabsContent>
      </Tabs>
    </div>
  );
}
