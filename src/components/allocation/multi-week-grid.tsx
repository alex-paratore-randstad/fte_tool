
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
import type { Employee, CostCenter, Allocation, TeamMember } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';

// Initialize a local domo object to handle data fetching.
const baseUrl = 'https://c5899a60-de1d-42af-b19b-99f8dff54fad.domoapps.prod10.domo.com';
const domo = {
  get: async (url: string) => {
    const rUrl = `${baseUrl}${url}`;
    const response = await fetch(rUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  post: async (url: string, body: any) => {
    const rUrl = `${baseUrl}${url}`;
    const response = await fetch(rUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
};

type CostCenterData = { ['cost_center_number']: string; ['cost_center_name']: string };

// Helper to format date as a consistent key
const formatDateKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

type AllocationRow = {
  id: string;
  costCenterId: string; // Using name as ID for simplicity with current data structure
  costCenterName: string;
  weeklyFtes: { [weekKey: string]: number };
};

type MultiWeekAllocationState = {
  [employeeName: string]: {
    allocations: AllocationRow[];
  };
};

export function MultiWeekGrid() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const [allocations, setAllocations] = useState<MultiWeekAllocationState>({});
  const [employees, setEmployees] = useState<TeamMember[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterData[]>([]);
  const [loading, setLoading] = useState(true);

  const { currentUser, isManager, isAdmin, isVp } = useCurrentUser();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
          const [empResult, ccResult] = await Promise.all([
            domo.get(`/data/v1/gbs_ind_hr_fte_report`),
            domo.get(`/data/v1/gbs_ind_finance_cc_report`),
          ]);
          
          const empData: TeamMember[] = empResult.filter((e: TeamMember) => e.Full_Name);
          const ccData: CostCenterData[] = ccResult.filter((c: CostCenterData) => c.cost_center_number && c.cost_center_name);
          
          setEmployees(empData);
          setCostCenters(ccData);

          // Initialize allocation state for each employee
          const initialAllocations: MultiWeekAllocationState = {};
          empData.forEach(emp => {
            initialAllocations[emp.Full_Name] = { allocations: [] };
          });
          setAllocations(initialAllocations);

      } catch (error) {
        console.error("Failed to fetch initial data:", error)
        toast({ variant: 'destructive', title: 'Failed to fetch data' });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  const displayedEmployees = useMemo(() => {
     if (isManager && currentUser) {
        return employees.filter((employee) => employee.First_Reviewer_Name === currentUser.name);
    }
    if (isVp && currentUser) {
        const managersUnderVp = employees
          .filter(e => e.Vertical_Head_Name === currentUser.name)
          .map(m => m.First_Reviewer_Name);
        return employees.filter(e => managersUnderVp.includes(e.First_Reviewer_Name));
    }
    return employees; // Admins and default
  }, [isManager, isVp, currentUser?.name, employees]);

  const weeks = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 4 }, (_, i) => addWeeks(start, i));
  }, [currentDate]);

  const handlePrevWeeks = () => setCurrentDate(subWeeks(currentDate, 4));
  const handleNextWeeks = () => setCurrentDate(addWeeks(currentDate, 4));

  const handleFteChange = (employeeName: string, allocId: string, weekKey: string, newFteValue: string) => {
    const newFte = parseFloat(newFteValue) || 0;
    setAllocations(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      const empAllocs = newState[employeeName].allocations;
      const allocIndex = empAllocs.findIndex((a: AllocationRow) => a.id === allocId);
      if (allocIndex > -1) {
        empAllocs[allocIndex].weeklyFtes[weekKey] = newFte;
      }
      return newState;
    });
  };
  
  const handleCostCenterChange = (employeeName: string, allocId: string, newCostCenterName: string) => {
     setAllocations(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      const empAllocs = newState[employeeName].allocations;
      const allocIndex = empAllocs.findIndex((a: AllocationRow) => a.id === allocId);
      if (allocIndex > -1) {
        const selectedCc = costCenters.find(cc => cc.cost_center_name === newCostCenterName);
        empAllocs[allocIndex].costCenterName = newCostCenterName;
        empAllocs[allocIndex].costCenterId = selectedCc?.cost_center_number || '';
      }
      return newState;
    });
  };

  const handleAddAllocation = (employeeName: string) => {
    setAllocations(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      const newAlloc: AllocationRow = {
        id: `${employeeName}-new-${Date.now()}`,
        costCenterId: '',
        costCenterName: '',
        weeklyFtes: {},
      };
      newState[employeeName].allocations.push(newAlloc);
      return newState;
    });
  };

  const handleRemoveAllocation = (employeeName: string, allocId: string) => {
    setAllocations(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState[employeeName].allocations = newState[employeeName].allocations.filter((a: AllocationRow) => a.id !== allocId);
      return newState;
    });
  };

  const handleSave = () => {
    const submissions: any[] = [];
    Object.entries(allocations).forEach(([employeeName, empData]) => {
      empData.allocations.forEach(alloc => {
        Object.entries(alloc.weeklyFtes).forEach(([weekKey, fte]) => {
          if (fte > 0) {
            submissions.push({
              content: {
                allocation_date: weekKey,
                allocation_name: employeeName,
                cost_center_name: alloc.costCenterName,
                cost_center_number: alloc.costCenterId,
                allocation_amount: fte.toString(),
              }
            });
          }
        });
      });
    });

    if (submissions.length === 0) {
      toast({ variant: 'destructive', title: 'No new allocations to save.' });
      return;
    }

    Promise.all(submissions.map(entry => 
      domo.post('/domo/datastores/v1/collections/weekly_allocation/documents/', entry)
    ))
    .then(() => {
      toast({
        title: 'Allocations Saved',
        description: `${submissions.length} allocation entries have been saved successfully.`,
      });
    })
    .catch(error => {
      console.error("Save error:", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    });
  };

  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-1/4" /></CardTitle>
          <CardDescription><Skeleton className="h-4 w-1/2" /></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Monthly Allocation Grid</CardTitle>
            <CardDescription>Allocate FTEs across multiple weeks. Past weeks are locked for non-admins.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="icon" onClick={handlePrevWeeks}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium w-48 text-center">
              {format(weeks[0], 'MMM d')} - {format(endOfWeek(weeks[3], { weekStartsOn: 1 }), 'MMM d, yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextWeeks}><ChevronRight className="h-4 w-4" /></Button>
            <Button onClick={handleSave}>Save All</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[250px] sticky left-0 bg-card z-10">Employee / Cost Center</TableHead>
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
                const empAllocations = allocations[emp.Full_Name]?.allocations || [];

                const weeklyTotals = weeks.map(week => {
                  const weekKey = formatDateKey(week);
                  return empAllocations.reduce((total, alloc) => total + (alloc.weeklyFtes[weekKey] || 0), 0);
                });

                return (
                  <Fragment key={emp.Person_Number}>
                    <TableRow className="bg-muted/50 hover:bg-muted">
                       <TableCell className="font-semibold sticky left-0 bg-muted/50 z-10">
                        {emp.Full_Name}
                        <div className="text-xs text-muted-foreground font-normal">{emp.Market_Facing_Title}</div>
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
                        return isPast && !isAdmin;
                      });

                      return (
                      <TableRow key={alloc.id}>
                        <TableCell className="sticky left-0 bg-card z-10">
                          <div className="pl-6">
                            <Select value={alloc.costCenterName} onValueChange={(newCcName) => handleCostCenterChange(emp.Full_Name, alloc.id, newCcName)} disabled={isRowLocked}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Cost Center..." />
                              </SelectTrigger>
                              <SelectContent>
                                {costCenters.map(cc => <SelectItem key={cc.cost_center_number} value={cc.cost_center_name}>{cc.cost_center_name}</SelectItem>)}
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
                                onChange={(e) => handleFteChange(emp.Full_Name, alloc.id, weekKey, e.target.value)}
                                disabled={isLockedForUser}
                                readOnly={isLockedForUser}
                              />
                            </TableCell>
                          )
                        })}
                         <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveAllocation(emp.Full_Name, alloc.id)} disabled={isRowLocked}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )})}

                    <TableRow>
                      <TableCell className="sticky left-0 bg-card z-10 py-2">
                        <div className="pl-6">
                          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleAddAllocation(emp.Full_Name)}>
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
