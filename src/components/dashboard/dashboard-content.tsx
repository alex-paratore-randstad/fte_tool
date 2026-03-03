'use client';

import { useEffect, useState, useMemo } from 'react';
import { Users, Briefcase, AlertTriangle, UserMinus, ChevronsUpDown } from 'lucide-react';
import SummaryCard from '@/components/dashboard/summary-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TeamMember, WeeklyAllocation, BulkFteDoc, BulkSummaryDoc, WeeklyTarget } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import FteAllocationChart from '@/components/dashboard/fte-allocation-chart';
import { startOfWeek, subWeeks, format, isValid, parseISO } from 'date-fns';
import { PageHeader } from '../page-header';
import { writeLog } from '@/lib/logger';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Checkbox } from '../ui/checkbox';

type ActiveView = 'total' | 'allocated' | 'unallocated' | 'missing' | null;

type ChartData = {
  name: string;
  [key: string]: any;
};

type FilterOptions = {
  fullNames: string[];
  titles: string[];
  managers: string[];
};

const MultiSelectFilter = ({
  placeholder,
  options,
  selected,
  onValueChange,
  disabled,
}: {
  placeholder: string;
  options: string[];
  selected: string[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">
            {(selected || []).length === 0
              ? placeholder
              : (selected || []).length <= 2
              ? (selected || []).join(', ')
              : `${(selected || []).length} selected`}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-64">
                {(options || []).map(option => (
                  <CommandItem
                    key={option}
                    onSelect={() => onValueChange(option)}
                  >
                    <Checkbox
                      className="mr-2"
                      checked={(selected || []).includes(option)}
                    />
                    <span>{option}</span>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};


export function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<Date | null>(null);

  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [weeklyAllocations, setWeeklyAllocations] = useState<WeeklyAllocation[]>([]);
  const [bulkFtes, setBulkFtes] = useState<BulkFteDoc[]>([]);
  const [bulkSummaries, setBulkSummaries] = useState<BulkSummaryDoc[]>([]);
  const [targets, setTargets] = useState<WeeklyTarget[]>([]);

  const [activeView, setActiveView] = useState<ActiveView>('total');
  const [employeeFilters, setEmployeeFilters] = useState({ fullName: [] as string[], title: [] as string[], manager: [] as string[] });
  const [chartClientFilter, setChartClientFilter] = useState<string[]>([]);
  const [chartDepartmentFilter, setChartDepartmentFilter] = useState<string[]>([]);
  const [chartView, setChartView] = useState<'weekly' | 'bulk' | 'freshservice' | 'targets' | 'total'>('weekly');
  
  const { toast } = useToast();
  
  useEffect(() => {
    setToday(new Date());

    async function fetchData() {
      setLoading(true);
      try {
        const [
          empResponse,
          weeklyAllocResponse,
          bulkFteResponse,
          bulkSummaryResponse,
          targetsResponse,
        ] = await Promise.all([
          fetch(`/data/v1/consolidated_hr_fte_report_view`),
          fetch(`/domo/datastores/v1/collections/weekly_allocation/documents/`),
          fetch(`/domo/datastores/v1/collections/bulk_allocation_fte/documents/`),
          fetch(`/domo/datastores/v1/collections/bulk_allocation_summary/documents/`),
          fetch(`/domo/datastores/v1/collections/weekly_targets/documents/`),
        ]);

        const rawEmps = empResponse.ok ? await empResponse.json() : [];
        const rawWeekly = weeklyAllocResponse.ok ? await weeklyAllocResponse.json() : [];
        const rawBFtes = bulkFteResponse.ok ? await bulkFteResponse.json() : [];
        const rawBSums = bulkSummaryResponse.ok ? await bulkSummaryResponse.json() : [];
        const rawTargs = targetsResponse.ok ? await targetsResponse.json() : [];

        setAllEmployees(Array.isArray(rawEmps) ? rawEmps.filter(e => e && e.person_id) : []);
        setWeeklyAllocations(Array.isArray(rawWeekly) ? rawWeekly.filter(a => a?.content) : []);
        setBulkFtes(Array.isArray(rawBFtes) ? rawBFtes.filter(f => f?.content) : []);
        setBulkSummaries(Array.isArray(rawBSums) ? rawBSums.filter(s => s?.content) : []);
        setTargets(Array.isArray(rawTargs) ? rawTargs.filter(t => t?.content) : []);

      } catch (error) {
        writeLog('DashboardContent', 'error', 'Failed to load dashboard data', error);
        toast({ variant: 'destructive', title: 'Failed to load dashboard data'});
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  const { totalFtes, allocatedFtes, unallocatedFtes, missingAllocations, allocatedEmployees, unallocatedEmployees } = useMemo(() => {
    if (!today || loading) {
      return { totalFtes: 0, allocatedFtes: 0, unallocatedFtes: 0, missingAllocations: 0, allocatedEmployees: [], unallocatedEmployees: [] };
    }

    const safeEmployees = (allEmployees || []).filter(e => e && e.person_id && e.full_name);
    const total = new Set(safeEmployees.map(e => e.person_id)).size;
    
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
    const currentWeekKey = format(startOfThisWeek, 'yyyy-MM-dd');
    const currentWeekAllocations = (weeklyAllocations || []).filter(a => a?.content?.allocation_date === currentWeekKey);
    
    const allocatedEmployeeIds = new Set<string>();
    currentWeekAllocations
      .filter(a => a?.content && parseFloat(a.content.allocation_amount) > 0)
      .forEach(a => {
        if (a?.content?.employee_id) {
          allocatedEmployeeIds.add(a.content.employee_id);
        } else if (a?.content?.allocation_name) {
          const match = a.content.allocation_name.match(/\[(.*?)\]/);
          if (match && match[1]) allocatedEmployeeIds.add(match[1]);
        }
      });

    const allocatedEmps = safeEmployees.filter(e => allocatedEmployeeIds.has(e.person_id));
    const unallocatedEmps = safeEmployees.filter(e => !allocatedEmployeeIds.has(e.person_id));
    
    return {
      totalFtes: total,
      allocatedFtes: allocatedEmps.length,
      unallocatedFtes: unallocatedEmps.length,
      missingAllocations: unallocatedEmps.length,
      allocatedEmployees: allocatedEmps,
      unallocatedEmployees: unallocatedEmps,
    };
  }, [today, loading, allEmployees, weeklyAllocations]);

  const employeeFilterOptions = useMemo<FilterOptions>(() => {
    const safeEmployees = (allEmployees || []).filter(e => e && e.person_id && e.full_name);
    const getUniqueSorted = (key: keyof TeamMember) =>
        Array.from(
            new Set(
                safeEmployees
                    .map(item => item[key])
                    .filter(val => typeof val === 'string' && val) as string[]
            )
        ).sort((a, b) => a.localeCompare(b));

    return {
      fullNames: getUniqueSorted('full_name'),
      titles: getUniqueSorted('title'),
      managers: getUniqueSorted('manager'),
    };
  }, [allEmployees]);
  
  const allChartClients = useMemo<string[]>(() => {
    if (loading) return [];
    const clients = new Set<string>();
    (weeklyAllocations || []).forEach(a => { if (a?.content?.cost_center_name) clients.add(a.content.cost_center_name); });
    (bulkSummaries || []).forEach(s => { if (s?.content?.cost_center_name) clients.add(s.content.cost_center_name); });
    (targets || []).forEach(t => { if (t?.content?.targets_cost_center_name) clients.add(t.content.targets_cost_center_name); });
    
    return Array.from(clients)
      .filter(c => typeof c === 'string' && c)
      .sort((a,b) => a.localeCompare(b));
  }, [loading, weeklyAllocations, bulkSummaries, targets]);

  const allChartDepartments = useMemo<string[]>(() => {
    if (loading) return [];
    const depts = new Set<string>();
    (allEmployees || []).forEach(e => { if (e && e.department) depts.add(e.department); });
    return Array.from(depts).sort((a, b) => a.localeCompare(b));
  }, [loading, allEmployees]);

  const { chartData, chartTitle, chartDescription } = useMemo(() => {
    if (!today || loading) {
        return { chartData: [], chartTitle: 'Loading Chart...', chartDescription: '...'};
    }
    
    const employeeIdToDeptMap = new Map<string, string>();
    const employeeNameToDeptMap = new Map<string, string>();
    allEmployees.forEach(e => {
        if (e.person_id && e.department) employeeIdToDeptMap.set(e.person_id, e.department);
        if (e.full_name && e.department) employeeNameToDeptMap.set(e.full_name, e.department);
    });

    const isDeptMatch = (id?: string, name?: string) => {
        if (chartDepartmentFilter.length === 0) return true;
        let dept = '';
        if (id) dept = employeeIdToDeptMap.get(id) || '';
        if (!dept && name) {
            const match = name.match(/\[(.*?)\]/);
            if (match && match[1]) {
                dept = employeeIdToDeptMap.get(match[1]) || '';
            } else {
                dept = employeeNameToDeptMap.get(name) || '';
            }
        }
        return dept && chartDepartmentFilter.includes(dept);
    };

    let initialChartData: ChartData[] = [];
    let title: string = '';
    let description: string = '';

    const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    switch(chartView) {
        case 'bulk': {
            const bulkSummariesByProfileId = (bulkSummaries || []).reduce((acc, summary) => {
                if (!summary?.content?.bulk_allocation_id) return acc;
                if (!acc[summary.content.bulk_allocation_id]) acc[summary.content.bulk_allocation_id] = [];
                acc[summary.content.bulk_allocation_id].push(summary);
                return acc;
            }, {} as Record<string, BulkSummaryDoc[]>);

            const bulkDataByMonth = (bulkFtes || []).reduce((acc, fte) => {
                const { allocation_monthyear, bulk_allocation_id, employee_id, employee_name } = fte?.content || {};
                if (!allocation_monthyear || !bulk_allocation_id) return acc;
                
                if (!isDeptMatch(employee_id, employee_name)) return acc;

                const summariesForFte = bulkSummariesByProfileId[bulk_allocation_id] || [];
                if (!acc[allocation_monthyear]) acc[allocation_monthyear] = {};
                summariesForFte.forEach(summary => {
                    const percentage = parseFloat(summary?.content?.allocation_percentage) || 0;
                    const clientName = summary?.content?.cost_center_name || 'Unknown';
                    acc[allocation_monthyear][clientName] = (acc[allocation_monthyear][clientName] || 0) + percentage;
                });
                return acc;
            }, {} as Record<string, Record<string, number>>);
            initialChartData = Object.entries(bulkDataByMonth).map(([month, clientTotals]) => ({ name: month, ...clientTotals }));
            title = "Monthly Bulk Allocations";
            description = "Total FTEs assigned per client via bulk allocation profiles.";
            break;
        }
        case 'freshservice': {
            const freshserviceAllocations = (weeklyAllocations || []).filter(a => {
                if (!a?.content) return false;
                const matchesClient = a.content.cost_center_name === a.content.cost_center_number;
                const matchesDept = isDeptMatch(a.content.employee_id, a.content.allocation_name);
                return matchesClient && matchesDept;
            });
            const freshserviceDataByMonth = freshserviceAllocations.reduce((acc, alloc) => {
                const dateStr = alloc?.content?.allocation_date;
                if (!dateStr) return acc;
                
                const dateParts = String(dateStr).split('-');
                if (dateParts.length !== 3) return acc;
                
                const year = dateParts[0];
                const monthIndex = parseInt(dateParts[1], 10) - 1;
                
                if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return acc;

                const monthLabel = `${monthsShort[monthIndex]} ${year}`;
                const clientName = alloc?.content?.cost_center_name || 'Unknown';
                const amount = parseFloat(alloc?.content?.allocation_amount || '0') || 0;
                
                acc[monthLabel] = acc[monthLabel] || {};
                acc[monthLabel][clientName] = (acc[monthLabel][clientName] || 0) + amount;
                return acc;
            }, {} as Record<string, Record<string, number>>);
             initialChartData = Object.entries(freshserviceDataByMonth).map(([month, totals]) => ({ name: month, ...totals }));
             title = "Monthly Freshservice Allocations";
             description = "Total FTEs assigned per client from Freshservice ticket ratios.";
             break;
        }
        case 'targets': {
            const targetsByQuarter = (targets || []).reduce((acc, target) => {
                const dateStr = target?.content?.targets_allocation_date;
                if (!dateStr) return acc;
                
                if (!isDeptMatch(undefined, target.content.targets_allocation_name)) return acc;

                const date = parseISO(dateStr);
                if (!isValid(date)) return acc;
                
                const quarter = `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
                const clientName = target?.content?.targets_cost_center_name || 'Unknown';
                const amount = parseInt(target?.content?.targets_allocation_amount || '0', 10) || 0;
                
                acc[quarter] = acc[quarter] || {};
                acc[quarter][clientName] = (acc[quarter][clientName] || 0) + amount;
                return acc;
            }, {} as Record<string, Record<string, number>>);
            initialChartData = Object.entries(targetsByQuarter).map(([quarter, totals]) => ({ name: quarter, ...totals }));
            title = "Quarterly Hiring Targets";
            description = "Total hires targeted per client, grouped by quarter.";
            break;
        }
        case 'total':
        case 'weekly':
        default: {
            const isTotal = chartView === 'total';
            const weeksCount = isTotal ? 8 : 6;
            const allWeeklyClients = Array.from(new Set((weeklyAllocations || []).map(a => a?.content?.cost_center_name).filter(Boolean)));
            const lastPeriod = Array.from({ length: weeksCount }, (_, i) => startOfWeek(subWeeks(today, (weeksCount - 1) - i), { weekStartsOn: 1 }));
            
            initialChartData = lastPeriod.map(weekStart => {
              const weekKey = format(weekStart, 'yyyy-MM-dd');
              const allocationsForWeek = (weeklyAllocations || []).filter(a => {
                  if (a?.content?.allocation_date !== weekKey) return false;
                  return isDeptMatch(a.content.employee_id, a.content.allocation_name);
              });
              
              const weeklyTotals = allocationsForWeek.reduce((acc, curr) => {
                const clientName = curr?.content?.cost_center_name || 'Unknown';
                const amount = Number(curr?.content?.allocation_amount) || 0;
                acc[clientName] = (acc[clientName] || 0) + amount;
                return acc;
              }, {} as Record<string, number>);
              
              const completeWeeklyData: Record<string, any> = { name: weekKey };
              allWeeklyClients.forEach(client => { if (client) completeWeeklyData[client as string] = weeklyTotals[client as string] || 0; });
              return completeWeeklyData;
            });
            
            title = isTotal ? "Total FTE Allocation Trend" : "Weekly Client Allocation";
            description = isTotal 
                ? "FTEs allocated per client (Weekly) over the last 8 weeks." 
                : "Total FTEs allocated per client over the last 6 weeks.";
            break;
        }
    }

    const finalChartData =
      chartClientFilter.length > 0
        ? initialChartData.map(item => {
            const newItem: { [key: string]: any } = { name: item.name };
            chartClientFilter.forEach(client => {
              if (item[client] !== undefined) {
                newItem[client] = item[client];
              }
            });
            return newItem;
          })
        : initialChartData;

    return { 
        chartData: finalChartData, 
        chartTitle: title, 
        chartDescription: description
    };
  }, [today, loading, chartView, weeklyAllocations, bulkFtes, bulkSummaries, targets, chartClientFilter, chartDepartmentFilter, allEmployees]);

  const { title: detailTitle, data: detailData, description: detailDescription } = useMemo(() => {
    let baseData: TeamMember[] = [];
    let baseTitle: string = 'FTE List';

    switch (activeView) {
      case 'total':
        baseData = allEmployees || [];
        baseTitle = 'All FTEs';
        break;
      case 'allocated':
        baseData = allocatedEmployees || [];
        baseTitle = 'Allocated FTEs (Current Week)';
        break;
      case 'unallocated':
      case 'missing':
        baseData = unallocatedEmployees || [];
        baseTitle = activeView === 'unallocated' ? 'Unallocated FTEs (Current Week)' : 'FTEs with Missing Allocations (Current Week)';
        break;
      default:
        baseData = allEmployees || [];
        baseTitle = 'All FTEs';
    }

    const filteredData = (baseData || []).filter(member => {
        if (!member) return false;
        const nameMatch = employeeFilters.fullName.length === 0 || (member.full_name && employeeFilters.fullName.includes(member.full_name));
        const titleMatch = employeeFilters.title.length === 0 || (member.title && employeeFilters.title.includes(member.title));
        const managerMatch = employeeFilters.manager.length === 0 || (member.manager && employeeFilters.manager.includes(member.manager));
        return nameMatch && titleMatch && managerMatch;
    });

    const isFiltered = employeeFilters.fullName.length > 0 || employeeFilters.title.length > 0 || employeeFilters.manager.length > 0;
    
    let description = `Displaying ${filteredData.length} employee(s).`;
    if (isFiltered && baseData.length !== filteredData.length) {
      description = `Displaying ${filteredData.length} of ${baseData.length} employee(s) matching filters.`;
    }

    return { title: baseTitle, data: filteredData, description: description };
  }, [activeView, allEmployees, allocatedEmployees, unallocatedEmployees, employeeFilters]);

  const handleCardClick = (view: ActiveView) => {
    setActiveView(current => (current === view ? null : view));
  };

  const handleEmployeeFilterChange = (filterName: keyof typeof employeeFilters, value: string) => {
    setEmployeeFilters(prev => {
        const currentValues = prev[filterName] || [];
        const newValues = currentValues.includes(value)
          ? currentValues.filter(v => v !== value)
          : [...currentValues, value];
        return { ...prev, [filterName]: newValues };
    });
  };
  
  const handleChartClientFilterChange = (value: string) => {
    setChartClientFilter(prev => {
      const currentValues = prev || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return newValues;
    });
  };

  const handleChartDepartmentFilterChange = (value: string) => {
    setChartDepartmentFilter(prev => {
      const currentValues = prev || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return newValues;
    });
  };

  const clearEmployeeFilters = () => {
    setEmployeeFilters({ fullName: [], title: [], manager: [] });
  };
  
  const clearChartFilters = () => {
    setChartClientFilter([]);
    setChartDepartmentFilter([]);
  };
  
  const isPageLoading = loading || !today;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Dashboard" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total FTEs"
          value={isPageLoading ? <Skeleton className="h-8 w-1/2" /> : totalFtes.toString()}
          icon={Users}
          onClick={() => handleCardClick('total')}
          isActive={activeView === 'total'}
        />
        <SummaryCard
          title="Allocated FTEs"
          value={isPageLoading ? <Skeleton className="h-8 w-1/2" /> : allocatedFtes.toString()}
          icon={Briefcase}
          onClick={() => handleCardClick('allocated')}
          isActive={activeView === 'allocated'}
        />
        <SummaryCard
          title="Unallocated FTEs"
          value={isPageLoading ? <Skeleton className="h-8 w-1/2" /> : unallocatedFtes.toString()}
          icon={UserMinus}
          variant={unallocatedFtes > 0 ? 'default' : 'default'}
          onClick={() => handleCardClick('unallocated')}
          isActive={activeView === 'unallocated'}
        />
        <SummaryCard
          title="Missing Allocations"
          value={isPageLoading ? <Skeleton className="h-8 w-1/2" /> : missingAllocations.toString()}
          icon={AlertTriangle}
          variant={missingAllocations > 0 ? 'destructive' : 'default'}
          onClick={() => handleCardClick('missing')}
          isActive={activeView === 'missing'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="flex-1">
                  <CardTitle>{isPageLoading ? <Skeleton className="h-6 w-2/3" /> : chartTitle}</CardTitle>
                  <CardDescription>{isPageLoading ? <Skeleton className="h-4 w-full" /> : chartDescription}</CardDescription>
                </div>
                <Tabs value={chartView} onValueChange={(v) => setChartView(v as any)} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto sm:h-10">
                        <TabsTrigger value="weekly">Weekly</TabsTrigger>
                        <TabsTrigger value="bulk">Bulk</TabsTrigger>
                        <TabsTrigger value="freshservice">Freshservice</TabsTrigger>
                        <TabsTrigger value="targets">Targets</TabsTrigger>
                        <TabsTrigger value="total">Total</TabsTrigger>
                    </TabsList>
                </Tabs>
              </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-4">
                  <MultiSelectFilter
                      placeholder="Filter by Client..."
                      options={allChartClients}
                      selected={chartClientFilter}
                      onValueChange={handleChartClientFilterChange}
                      disabled={isPageLoading}
                  />
                  <MultiSelectFilter
                      placeholder="Filter by Dept..."
                      options={allChartDepartments}
                      selected={chartDepartmentFilter}
                      onValueChange={handleChartDepartmentFilterChange}
                      disabled={isPageLoading}
                  />
                  <Button variant="outline" onClick={clearChartFilters} disabled={isPageLoading || (chartClientFilter.length === 0 && chartDepartmentFilter.length === 0)}>
                    Clear Chart Filters
                  </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isPageLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <FteAllocationChart data={chartData} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
               <div className="flex justify-between items-start gap-4">
                    <div>
                        <CardTitle>{isPageLoading ? <Skeleton className="h-6 w-1/3" /> : detailTitle}</CardTitle>
                        <CardDescription>{isPageLoading ? <Skeleton className="h-4 w-2/3" /> : detailDescription}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={clearEmployeeFilters} disabled={isPageLoading}>Clear Filters</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-4">
                    <MultiSelectFilter placeholder="Filter by Name..." options={employeeFilterOptions.fullNames} selected={employeeFilters.fullName} onValueChange={value => handleEmployeeFilterChange('fullName', value)} disabled={isPageLoading} />
                    <MultiSelectFilter placeholder="Filter by Title..." options={employeeFilterOptions.titles} selected={employeeFilters.title} onValueChange={value => handleEmployeeFilterChange('title', value)} disabled={isPageLoading} />
                    <MultiSelectFilter placeholder="Filter by Manager..." options={employeeFilterOptions.managers} selected={employeeFilters.manager} onValueChange={value => handleEmployeeFilterChange('manager', value)} disabled={isPageLoading} />
                </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[330px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Manager</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isPageLoading ? (
                       Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : (detailData || []).length > 0 ? detailData.map(employee => (
                      <TableRow key={employee.person_id}>
                        <TableCell>{employee.full_name}</TableCell>
                        <TableCell>{employee.title}</TableCell>
                        <TableCell>{employee.manager}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                          No data to display.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
