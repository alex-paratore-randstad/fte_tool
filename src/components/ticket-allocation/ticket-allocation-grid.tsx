
'use client';

import { useState, useMemo, Fragment, useEffect, useCallback } from 'react';
import { startOfWeek, endOfWeek, format, isBefore, isSameDay } from 'date-fns';
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
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { getWeeksForFiscalMonth, getFiscalDataForDate, getPreviousFiscalMonth, getNextFiscalMonth } from '@/lib/fiscal-calendar';

type TicketData = {
  agent_name: string;
  agent_group_name: string;
  reporting_week_date: string; // "YYYY-MM-DD"
  tickets: number;
};

const formatDateKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

type AllocationRow = {
  id: string; // agent_group_name
  agentGroupName: string;
  weeklyFtes: { [weekKey: string]: number };
};

type EmployeeAllocation = {
  employeeName: string;
  allocations: AllocationRow[];
};

type TicketAllocationGridProps = {
  currentDate: Date | null;
  setCurrentDate: (date: Date) => void;
  onSaveSuccess: () => void;
};


export function TicketAllocationGrid({ currentDate, setCurrentDate, onSaveSuccess }: TicketAllocationGridProps) {
  const [activeAllocations, setActiveAllocations] = useState<EmployeeAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [startOfCurrentWeek, setStartOfCurrentWeek] = useState<Date | null>(null);

  const { isAdmin, loading: userLoading } = useCurrentUser();
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

  const fetchDataAndCalculate = useCallback(async () => {
    if (!weeks.length) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const weekKeys = weeks.map(formatDateKey);
      
      const ticketRequests = weekKeys.map(async weekKey => {
        const query = `SELECT * FROM table WHERE \`reporting_week_date\` = '${weekKey}'`;
        const response = await fetch(`/data/v1/fte_tickets_grouped?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            console.warn(`Failed to fetch ticket data for ${weekKey}.`);
            return [];
        };
        return response.json();
      });

      const results = await Promise.all(ticketRequests);
      const relevantTickets: TicketData[] = results.flat();
      
      const weeklyTotalsPerAgent: { [weekKey: string]: { [agentName: string]: number } } = {};
      
      relevantTickets.forEach(ticket => {
        const weekKey = ticket.reporting_week_date;
        if (!weeklyTotalsPerAgent[weekKey]) {
          weeklyTotalsPerAgent[weekKey] = {};
        }
        if (!weeklyTotalsPerAgent[weekKey][ticket.agent_name]) {
          weeklyTotalsPerAgent[weekKey][ticket.agent_name] = 0;
        }
        weeklyTotalsPerAgent[weekKey][ticket.agent_name] += Number(ticket.tickets) || 0;
      });

      const groupedByAgent: { [agentName: string]: { [weekKey: string]: { [groupName: string]: number } } } = {};
      relevantTickets.forEach(ticket => {
        if (!groupedByAgent[ticket.agent_name]) {
          groupedByAgent[ticket.agent_name] = {};
        }
        const weekKey = ticket.reporting_week_date;
        if (!groupedByAgent[ticket.agent_name][weekKey]) {
          groupedByAgent[ticket.agent_name][weekKey] = {};
        }
        groupedByAgent[ticket.agent_name][weekKey][ticket.agent_group_name] = Number(ticket.tickets) || 0;
      });
      
      const calculatedAllocations: EmployeeAllocation[] = Object.entries(groupedByAgent).map(([agentName, weeklyData]) => {
        const agentGroups = new Set<string>();
        Object.values(weeklyData).forEach(groups => {
          Object.keys(groups).forEach(groupName => agentGroups.add(groupName));
        });

        const allocationRows: AllocationRow[] = Array.from(agentGroups).map(groupName => {
          const weeklyFtes: { [weekKey: string]: number } = {};
          
          Object.entries(weeklyData).forEach(([weekKey, groups]) => {
            const totalTickets = weeklyTotalsPerAgent[weekKey]?.[agentName] || 0;
            const groupTickets = groups[groupName] || 0;
            const percentage = totalTickets > 0 ? (groupTickets / totalTickets) : 0;
            // Round to nearest 0.05
            weeklyFtes[weekKey] = Math.round(percentage * 20) / 20;
          });

          return {
            id: groupName,
            agentGroupName: groupName,
            weeklyFtes,
          };
        });

        return {
          employeeName: agentName,
          allocations: allocationRows,
        };
      });

      setActiveAllocations(calculatedAllocations);

    } catch (error) {
      console.error("Failed to fetch or process ticket data:", error);
      toast({ variant: 'destructive', title: 'Failed to load ticket data' });
    } finally {
      setLoading(false);
    }
  }, [weeks, toast]);

  useEffect(() => {
    if (!userLoading && currentDate) {
      fetchDataAndCalculate();
    }
  }, [fetchDataAndCalculate, userLoading, currentDate]);


  const handlePrevMonth = () => {
    if (currentDate) setCurrentDate(getPreviousFiscalMonth(currentDate));
  };
  const handleNextMonth = () => {
    if (currentDate) setCurrentDate(getNextFiscalMonth(currentDate));
  };
  
  const handleFteChange = (employeeName: string, agentGroupName: string, weekKey: string, newFteValue: string) => {
    const newFte = parseFloat(newFteValue) || 0;
    setActiveAllocations(prev => prev.map(empAlloc => {
        if (empAlloc.employeeName === employeeName) {
            const newAllocations = empAlloc.allocations.map(alloc => {
                if (alloc.agentGroupName === agentGroupName) {
                    return { ...alloc, weeklyFtes: { ...alloc.weeklyFtes, [weekKey]: newFte } };
                }
                return alloc;
            });
            return { ...empAlloc, allocations: newAllocations };
        }
        return empAlloc;
    }));
  };

  const handleSave = async () => {
    const submissions: any[] = [];
    
    activeAllocations.forEach(empAlloc => {
      empAlloc.allocations.forEach(alloc => {
        Object.entries(alloc.weeklyFtes).forEach(([weekKey, fte]) => {
          if (fte > 0) {
            submissions.push({
              content: {
                allocation_date: weekKey,
                allocation_name: empAlloc.employeeName,
                cost_center_name: alloc.agentGroupName, // agent_group_name acts as cost center
                cost_center_number: alloc.agentGroupName, // Using name as number for now
                allocation_amount: fte.toString(),
              }
            });
          }
        });
      });
    });

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
            description: `${submissions.length} ticket-based allocation entries have been saved.`,
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
            <CardTitle>Ticket Allocation Grid</CardTitle>
            <CardDescription>Review and adjust ticket-based FTE allocations for the month.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium w-32 text-center">
              {fiscalMonthLabel}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
            <Button onClick={handleSave} disabled={activeAllocations.length === 0}>Save All</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px] sticky left-0 bg-card z-10">Agent / Group</TableHead>
                {weeks.map(week => {
                  const isPast = isBefore(endOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                  const isCurrent = isSameDay(startOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                  const isLockedForUser = isPast && !isAdmin;
                  return (
                    <TableHead key={week.toISOString()} className={cn("text-center min-w-[150px] transition-colors", { "bg-muted/40": isPast, "bg-primary/10": isCurrent })}>
                      <div className='flex items-center justify-center gap-2'>
                        {isLockedForUser && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span>W/E {format(endOfWeek(week, { weekStartsOn: 1 }), 'MMM d')}</span>
                      </div>
                      {isCurrent && <Badge variant="default" className="w-fit mx-auto mt-1">Current</Badge>}
                    </TableHead>
                  )
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
             {activeAllocations.length === 0 && (
                <TableRow>
                    <TableCell colSpan={weeks.length + 1} className="text-center h-24 text-muted-foreground">
                        No ticket data found for the selected period.
                    </TableCell>
                </TableRow>
             )}
              {activeAllocations.map(({ employeeName, allocations }) => {
                const weeklyTotals = weeks.map(week => {
                  const weekKey = formatDateKey(week);
                  return allocations.reduce((total, alloc) => total + (alloc.weeklyFtes[weekKey] || 0), 0);
                });

                return (
                  <Fragment key={employeeName}>
                    <TableRow className="bg-muted/50 hover:bg-muted">
                       <TableCell className="font-semibold sticky left-0 bg-muted/50 z-10">
                        {employeeName}
                      </TableCell>
                      {weeklyTotals.map((total, index) => (
                        <TableCell key={index} className={cn("text-center font-semibold", total > 1.0 ? "text-destructive" : "text-muted-foreground")}>
                          {total > 0 ? total.toFixed(2) : '-'}
                        </TableCell>
                      ))}
                    </TableRow>

                    {allocations.map((alloc) => {
                      return (
                      <TableRow key={alloc.id}>
                        <TableCell className="sticky left-0 bg-card z-10 pl-8 text-muted-foreground">{alloc.agentGroupName}</TableCell>
                        {weeks.map(week => {
                          const weekKey = formatDateKey(week);
                          const isPast = isBefore(endOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                           const isCurrent = isSameDay(startOfWeek(week, { weekStartsOn: 1 }), startOfCurrentWeek);
                          const isLockedForUser = isPast && !isAdmin;
                          return (
                            <TableCell key={week.toISOString()} className={cn("text-center", {"bg-muted/40": isPast, "bg-primary/10": isCurrent})}>
                              <Input
                                type="number" step="0.05" min="0" placeholder="0.00"
                                className={cn("w-24 text-center mx-auto", { "bg-muted/50 cursor-not-allowed": isLockedForUser })}
                                value={alloc.weeklyFtes[weekKey] || ''}
                                onChange={(e) => handleFteChange(employeeName, alloc.agentGroupName, weekKey, e.target.value)}
                                disabled={isLockedForUser} readOnly={isLockedForUser}
                              />
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )})}
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
