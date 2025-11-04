
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { startOfWeek, endOfWeek, format, isBefore, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectSearch } from '@/components/ui/select-search';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Trash2, Lock } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { TeamMember } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { getWeeksForFiscalMonth, getFiscalDataForDate, getPreviousFiscalMonth, getNextFiscalMonth } from '@/lib/fiscal-calendar';

type UpdatedTitle = {
  updated_titles: string;
};

const formatDateKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

type EmployeeTitleAllocation = {
  employee: TeamMember;
  weeklyTitles: { [weekKey: string]: string };
};

type TitleAllocationGridProps = {
  currentDate: Date | null;
  setCurrentDate: (date: Date) => void;
  onSaveSuccess: () => void;
};


export function TitleAllocationGrid({ currentDate, setCurrentDate, onSaveSuccess }: TitleAllocationGridProps) {
  const [activeEmployees, setActiveEmployees] = useState<EmployeeTitleAllocation[]>([]);
  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [managers, setManagers] = useState<{id: string, name: string}[]>([]);
  const [titles, setTitles] = useState<UpdatedTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [titleSearchTerm, setTitleSearchTerm] = useState('');
  const [startOfCurrentWeek, setStartOfCurrentWeek] = useState<Date | null>(null);

  const { currentUser, isAdmin, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();

  useEffect(() => {
    setStartOfCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, []);

  const { weeks, fiscalMonthLabel } = useMemo(() => {
    if (!currentDate) return { weeks: [], fiscalMonthLabel: 'Loading...' };
    const fiscalData = getFiscalDataForDate(currentDate);
    const monthWeeks = getWeeksForFiscalMonth(currentDate);
    const label = fiscalData ? `${fiscalData.reporting_month} ${fiscalData.reporting_year}` : 'Loading...';
    return { weeks: monthWeeks, fiscalMonthLabel: label };
  }, [currentDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empResponse, titleResponse] = await Promise.all([
        fetch(`/data/v1/gbs_ind_hr_fte_report`),
        fetch(`/data/v1/mst_fte_updated_titles`),
      ]);

      if (!empResponse.ok || !titleResponse.ok) {
        console.warn("Could not fetch initial data. This may be expected in local dev.");
      }
      
      const empData: TeamMember[] = empResponse.ok ? (await empResponse.json()).filter((e: TeamMember) => e && e.Full_Name) : [];
      const titleData: UpdatedTitle[] = titleResponse.ok ? (await titleResponse.json()).filter((t: UpdatedTitle) => t && t.updated_titles) : [];
      
      setAllEmployees(empData);
      setTitles(titleData);
      
      const managerMap = new Map<string, string>();
      empData.forEach(emp => {
          if(emp.First_Reviewer_Code && emp.First_Reviewer_Name) {
              managerMap.set(emp.First_Reviewer_Code, emp.First_Reviewer_Name);
          }
      });
      const uniqueManagers = Array.from(managerMap, ([id, name]) => ({ id, name }));
      setManagers(uniqueManagers);

      setActiveEmployees([]);

    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      toast({ variant: 'destructive', title: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!userLoading) {
        fetchData();
    }
  }, [fetchData, userLoading, currentUser.id]);


  const availableEmployees = useMemo(() => {
    const activeEmployeeIds = new Set(activeEmployees.map(a => a.employee.Person_Number));
    const unallocatedEmployees = allEmployees.filter(e => !activeEmployeeIds.has(e.Person_Number));
    if (!employeeSearchTerm) {
        return unallocatedEmployees;
    }
    return unallocatedEmployees.filter(e => e.Full_Name.toLowerCase().includes(employeeSearchTerm.toLowerCase()));
  }, [allEmployees, activeEmployees, employeeSearchTerm]);
  
  const filteredTitles = useMemo(() => {
    if (!titleSearchTerm) {
      return titles;
    }
    return titles.filter(t => t.updated_titles.toLowerCase().includes(titleSearchTerm.toLowerCase()));
  }, [titles, titleSearchTerm]);


  const handlePrevMonth = () => {
    if (currentDate) setCurrentDate(getPreviousFiscalMonth(currentDate));
  };
  const handleNextMonth = () => {
    if (currentDate) setCurrentDate(getNextFiscalMonth(currentDate));
  };
  
  const handleAddEmployee = (employeeId: string) => {
    if (!employeeId) return;
    const employeeToAdd = allEmployees.find(e => e.Person_Number === employeeId);
    
    if (employeeToAdd) {
      const isAlreadyActive = activeEmployees.some(a => a.employee.Person_Number === employeeId);
      if (isAlreadyActive) {
          toast({ variant: 'destructive', title: 'Employee already in grid' });
          return;
      }
      
      setActiveEmployees(prev => [{
        employee: employeeToAdd,
        weeklyTitles: {}
      }, ...prev]);
    }
  };

  const handleAddManagerTeam = (managerId: string) => {
    if (!managerId) return;
    const directReports = allEmployees.filter(e => e.First_Reviewer_Code === managerId);
    
    const newEmployees = directReports
      .filter(employee => !activeEmployees.some(a => a.employee.Person_Number === employee.Person_Number))
      .map(employee => ({
          employee,
          weeklyTitles: {},
        }));

    if (newEmployees.length > 0) {
      setActiveEmployees(prev => [...newEmployees, ...prev]);
      toast({ title: 'Team Loaded', description: `${newEmployees.length} employees have been added to the grid.` });
    } else {
      toast({ title: 'No new employees to add', description: 'All direct reports for this manager are already in the grid.' });
    }
  };


  const handleRemoveEmployee = (employeeId: string) => {
    setActiveEmployees(prev => prev.filter(a => a.employee.Person_Number !== employeeId));
  };
  
  const handleTitleChange = (employeeId: string, weekKey: string, newTitle: string) => {
    setActiveEmployees(prev => prev.map(empAlloc => {
        if (empAlloc.employee.Person_Number === employeeId) {
            return { ...empAlloc, weeklyTitles: { ...empAlloc.weeklyTitles, [weekKey]: newTitle } };
        }
        return empAlloc;
    }));
  };

  const handleSave = async () => {
    const submissions: any[] = [];
    
    activeEmployees.forEach(empAlloc => {
      Object.entries(empAlloc.weeklyTitles).forEach(([weekKey, title]) => {
        if (title) {
          submissions.push({
            content: {
              allocation_date: weekKey,
              employee_id: empAlloc.employee.Person_Number,
              employee_name: empAlloc.employee.Full_Name,
              updated_title: title,
            }
          });
        }
      });
    });

    if (submissions.length === 0) {
      toast({ title: 'No changes to save.' });
      return;
    }

    try {
        await Promise.all(submissions.map(entry => 
            fetch('/domo/datastores/v1/collections/title_allocations/documents/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
            }).then(res => {
                if (!res.ok) throw new Error('One or more saves failed.');
                return res.json();
            })
        ));
        toast({
            title: 'Title Allocations Saved',
            description: `${submissions.length} title assignments have been saved successfully.`,
        });
        onSaveSuccess();
    } catch (error: any) {
        console.error("Save error:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  if (loading || userLoading || !startOfCurrentWeek || !currentDate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-1/4" /></CardTitle>
          <CardDescription><Skeleton className="h-4 w-1/2" /></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Title Allocation Grid</CardTitle>
            <CardDescription>Add employees to assign titles for each week. Past weeks are locked.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
             <Select onValueChange={handleAddEmployee}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Add Employee..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectSearch placeholder="Search employee..." onChange={setEmployeeSearchTerm} />
                    {availableEmployees.map(e => (
                        <SelectItem key={e.Person_Number} value={e.Person_Number}>
                            {e.Full_Name}
                        </SelectItem>
                    ))}
                    {availableEmployees.length === 0 && (
                        <div className="p-4 text-sm text-center text-muted-foreground">
                            No employees found.
                        </div>
                    )}
                </SelectContent>
            </Select>
            <Select onValueChange={handleAddManagerTeam}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Load Team..." />
                </SelectTrigger>
                <SelectContent>
                    {managers.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                            {m.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handlePrevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium w-32 text-center">
              {fiscalMonthLabel}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
            <Button onClick={handleSave} disabled={activeEmployees.length === 0}>Save All</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px] sticky left-0 bg-card z-10">Employee</TableHead>
                {weeks.map(week => {
                  const isPast = isBefore(endOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                  const isCurrent = isSameDay(startOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                  const isLockedForUser = isPast && !isAdmin;
                  return (
                    <TableHead key={week.toISOString()} className={cn("text-center min-w-[250px] transition-colors", { "bg-muted/40": isPast, "bg-primary/10": isCurrent })}>
                      <div className='flex items-center justify-center gap-2'>
                        {isLockedForUser && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span>W/E {format(endOfWeek(week, { weekStartsOn: 1 }), 'MMM d')}</span>
                      </div>
                      {isCurrent && <Badge variant="default" className="w-fit mx-auto mt-1">Current</Badge>}
                    </TableHead>
                  )
                })}
                <TableHead className="w-[100px]"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
             {activeEmployees.length === 0 && (
                <TableRow>
                    <TableCell colSpan={weeks.length + 2} className="text-center h-24 text-muted-foreground">
                        Select an employee to begin assigning titles.
                    </TableCell>
                </TableRow>
             )}
              {activeEmployees.map(({ employee, weeklyTitles }) => {
                const isRowLocked = weeks.some(week => {
                    const isPast = isBefore(endOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                    return isPast && !isAdmin;
                });
                return (
                    <TableRow key={employee.Person_Number}>
                       <TableCell className="font-semibold sticky left-0 bg-card z-10">
                        {employee.Full_Name}
                        <div className="text-xs text-muted-foreground font-normal">{employee.Market_Facing_Title}</div>
                      </TableCell>

                      {weeks.map(week => {
                        const weekKey = formatDateKey(week);
                        const isPast = isBefore(endOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                        const isCurrent = isSameDay(startOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                        const isLockedForUser = isPast && !isAdmin;
                        return (
                          <TableCell key={week.toISOString()} className={cn("text-center", {"bg-muted/40": isPast, "bg-primary/10": isCurrent})}>
                            <Select 
                              value={weeklyTitles[weekKey] || ''} 
                              onValueChange={(newTitle) => handleTitleChange(employee.Person_Number, weekKey, newTitle)}
                              disabled={isLockedForUser}
                            >
                              <SelectTrigger className={cn("w-full", { "bg-muted/50 cursor-not-allowed": isLockedForUser })}>
                                <SelectValue placeholder="Select Title..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectSearch placeholder="Search title..." onChange={setTitleSearchTerm} />
                                {filteredTitles.map(t => (
                                    <SelectItem key={t.updated_titles} value={t.updated_titles}>
                                        {t.updated_titles}
                                    </SelectItem>
                                ))}
                                {filteredTitles.length === 0 && (
                                    <div className="p-4 text-sm text-center text-muted-foreground">
                                        No titles found.
                                    </div>
                                )}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )
                      })}
                      <TableCell className='text-right'>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveEmployee(employee.Person_Number)}>
                           <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
