
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Users, Briefcase, AlertTriangle, UserMinus, ChevronsUpDown } from 'lucide-react';
import SummaryCard from '@/components/dashboard/summary-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TeamMember, WeeklyAllocation, BulkFteDoc, BulkSummaryDoc, WeeklyTarget } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import FteAllocationChart from '@/components/dashboard/fte-allocation-chart';
import { startOfWeek, subWeeks, format } from 'date-fns';
import { PageHeader } from '../page-header';
import { writeLog } from '@/lib/logger';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Checkbox } from '../ui/checkbox';

type ActiveView = 'total' | 'allocated' | 'unallocated' | 'missing' | null;

type ChartData = {
  name: string; // Week start date, month, or quarter
  [key: string]: any; // Client allocations
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
            {selected.length === 0
              ? placeholder
              : selected.length <= 2
              ? selected.join(', ')
              : `${selected.length} selected`}
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
                {options.map(option => (
                  <CommandItem
                    key={option}
                    onSelect={() => onValueChange(option)}
                  >
                    <Checkbox
                      className="mr-2"
                      checked={selected.includes(option)}
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
  const [today, setToday] = useState<Date | null>(null); // State for client-side date

  // Raw data states
  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [weeklyAllocations, setWeeklyAllocations] = useState<WeeklyAllocation[]>([]);
  const [bulkFtes, setBulkFtes] = useState<BulkFteDoc[]>([]);
  const [bulkSummaries, setBulkSummaries] = useState<BulkSummaryDoc[]>([]);
  const [targets, setTargets] = useState<WeeklyTarget[]>([]);

  // UI State
  const [activeView, setActiveView] = useState<ActiveView>('total');
  const [filters, setFilters] = useState({ fullName: [] as string[], title: [] as string[], manager: [] as string[] });
  const [chartView, setChartView] = useState<'weekly' | 'bulk' | 'freshservice' | 'targets'>('weekly');
  
  const { toast } = useToast();
  
  useEffect(() => {
    // Set date only on client-side to prevent hydration mismatch
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

        setAllEmployees(empResponse.ok ? await empResponse.json() : []);
        setWeeklyAllocations(weeklyAllocResponse.ok ? await weeklyAllocResponse.json() : []);
        setBulkFtes(bulkFteResponse.ok ? await bulkFteResponse.json() : []);
        setBulkSummaries(bulkSummaryResponse.ok ? await bulkSummaryResponse.json() : []);
        setTargets(targetsResponse.ok ? await targetsResponse.json() : []);

      } catch (error) {
        writeLog('DashboardContent', 'error', 'Failed to load dashboard data', error);
        toast({ variant: 'destructive', title: 'Failed to load dashboard data'});
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived state for summary cards and employee lists
  const { totalFtes, allocatedFtes, unallocatedFtes, missingAllocations, allocatedEmployees, unallocatedEmployees } = useMemo(() => {
    if (!today || loading) {
      return { totalFtes: 0, allocatedFtes: 0, unallocatedFtes: 0, missingAllocations: 0, allocatedEmployees: [], unallocatedEmployees: [] };
    }

    const safeEmployees = allEmployees.filter(e => e && e.person_id && e.full_name);
    const total = new Set(safeEmployees.map(e => e.person_id)).size;
    
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
    const currentWeekAllocations = weeklyAllocations.filter(a => a.content.allocation_date === format(startOfThisWeek, 'yyyy-MM-dd'));
    
    const allocatedEmployeeIds = new Set<string>();
    currentWeekAllocations
      .filter(a => a?.content && parseFloat(a.content.allocation_amount) > 0)
      .forEach(a => {
        if (a.content.employee_id) allocatedEmployeeIds.add(a.content.employee_id);
        else if (a.content.allocation_name) {
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

  // Derived state for filter options
  const filterOptions = useMemo<FilterOptions>(() => {
    const safeEmployees = allEmployees.filter(e => e && e.person_id && e.full_name);
    const getUniqueSorted = (key: keyof TeamMember) => 
        Array.from(new Set(safeEmployees.map(item => item[key]).filter(Boolean) as string[])).sort((a,b) => a.localeCompare(b));
    return {
      fullNames: getUniqueSorted('full_name'),
      titles: getUniqueSorted('title'),
      managers: getUniqueSorted('manager'),
    };
  }, [allEmployees]);
  
  const { chartData, chartTitle, chartDescription } = useMemo(() => {
    if (!today || loading) {
        return { chartData: [], chartTitle: 'Loading Chart...', chartDescription: '...'};
    }
    
    switch(chartView) {
        case 'bulk': {
            const bulkSummariesByProfileId = bulkSummaries.reduce((acc, summary) => {
                if (!acc[summary.content.bulk_allocation_id]) acc[summary.content.bulk_allocation_id] = [];
                acc[summary.content.bulk_allocation_id].push(summary);
                return acc;
            }, {} as Record<string, BulkSummaryDoc[]>);

            const bulkDataByMonth = bulkFtes.reduce((acc, fte) => {
                const { allocation_monthyear, bulk_allocation_id } = fte.content;
                if (!allocation_monthyear) return acc;
                const summariesForFte = bulkSummariesByProfileId[bulk_allocation_id] || [];
                if (!acc[allocation_monthyear]) acc[allocation_monthyear] = {};
                summariesForFte.forEach(summary => {
                    const percentage = parseFloat(summary.content.allocation_percentage) || 0;
                    acc[allocation_monthyear][summary.content.cost_center_name] = (acc[allocation_monthyear][summary.content.cost_center_name] || 0) + percentage;
                });
                return acc;
            }, {} as Record<string, Record<string, number>>);
            return { 
                chartData: Object.entries(bulkDataByMonth).map(([month, clientTotals]) => ({ name: month, ...clientTotals })), 
                chartTitle: "Monthly Bulk Allocations", 
                chartDescription: "Total FTEs assigned per client via bulk allocation profiles."
            };
        }
        case 'freshservice': {
            const freshserviceAllocations = weeklyAllocations.filter(a => a.content.cost_center_name === a.content.cost_center_number);
            const freshserviceDataByMonth = freshserviceAllocations.reduce((acc, alloc) => {
                const month = format(new Date(alloc.content.allocation_date), 'MMM yyyy');
                acc[month] = acc[month] || {};
                acc[month][alloc.content.cost_center_name] = (acc[month][alloc.content.cost_center_name] || 0) + parseFloat(alloc.content.allocation_amount);
                return acc;
            }, {} as Record<string, Record<string, number>>);
             return { 
                chartData: Object.entries(freshserviceDataByMonth).map(([month, totals]) => ({ name: month, ...totals })), 
                chartTitle: "Monthly Freshservice Allocations", 
                chartDescription: "Total FTEs assigned per client from Freshservice ticket ratios."
            };
        }
        case 'targets': {
            const targetsByQuarter = targets.reduce((acc, target) => {
                const date = new Date(target.content.targets_allocation_date);
                const quarter = `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
                acc[quarter] = acc[quarter] || {};
                acc[quarter][target.content.targets_cost_center_name] = (acc[quarter][target.content.targets_cost_center_name] || 0) + parseInt(target.content.targets_allocation_amount, 10);
                return acc;
            }, {} as Record<string, Record<string, number>>);
             return { 
                chartData: Object.entries(targetsByQuarter).map(([quarter, totals]) => ({ name: quarter, ...totals })), 
                chartTitle: "Quarterly Hiring Targets", 
                chartDescription: "Total hires targeted per client, grouped by quarter."
            };
        }
        case 'weekly':
        default: {
            const allWeeklyClients = Array.from(new Set(weeklyAllocations.map(a => a.content.cost_center_name)));
            const last6Weeks = Array.from({ length: 6 }, (_, i) => startOfWeek(subWeeks(today, 5 - i), { weekStartsOn: 1 }));
            const weeklyData = last6Weeks.map(weekStart => {
              const weekStartDateString = format(weekStart, 'yyyy-MM-dd');
              const allocationsForWeek = weeklyAllocations.filter(a => a.content.allocation_date === weekStartDateString);
              const weeklyTotals = allocationsForWeek.reduce((acc, curr) => {
                acc[curr.content.cost_center_name] = (acc[curr.content.cost_center_name] || 0) + Number(curr.content.allocation_amount);
                return acc;
              }, {} as Record<string, number>);
              
              const completeWeeklyData: Record<string, any> = { name: weekStartDateString };
              allWeeklyClients.forEach(client => { completeWeeklyData[client] = weeklyTotals[client] || 0; });
              return completeWeeklyData;
            });
            return { 
                chartData: weeklyData, 
                chartTitle: "Weekly Client Allocation", 
                chartDescription: "Total FTEs allocated per client over the last 6 weeks."
            };
        }
    }
  }, [today, loading, chartView, weeklyAllocations, bulkFtes, bulkSummaries, targets]);

  const { title: detailTitle, data: detailData, description: detailDescription } = useMemo(() => {
    let baseData: TeamMember[];
    let baseTitle: string;

    switch (activeView) {
      case 'total':
        baseData = allEmployees;
        baseTitle = 'All FTEs';
        break;
      case 'allocated':
        baseData = allocatedEmployees;
        baseTitle = 'Allocated FTEs (Current Week)';
        break;
      case 'unallocated':
      case 'missing':
        baseData = unallocatedEmployees;
        baseTitle = activeView === 'unallocated' ? 'Unallocated FTEs (Current Week)' : 'FTEs with Missing Allocations (Current Week)';
        break;
      default:
        baseData = allEmployees;
        baseTitle = 'All FTEs';
    }

    const filteredData = baseData.filter(member => {
        const nameMatch = filters.fullName.length === 0 || filters.fullName.includes(member.full_name);
        const titleMatch = filters.title.length === 0 || filters.title.includes(member.title);
        const managerMatch = filters.manager.length === 0 || filters.manager.includes(member.manager);
        return nameMatch && titleMatch && managerMatch;
    });

    const isFiltered = filters.fullName.length > 0 || filters.title.length > 0 || filters.manager.length > 0;
    
    let description = `Displaying ${filteredData.length} employee(s).`;
    if (isFiltered && baseData.length !== filteredData.length) {
      description = `Displaying ${filteredData.length} of ${baseData.length} employee(s) matching filters.`;
    }

    return { title: baseTitle, data: filteredData, description: description };
  }, [activeView, allEmployees, allocatedEmployees, unallocatedEmployees, filters]);

  const handleCardClick = (view: ActiveView) => {
    setActiveView(current => (current === view ? null : view));
  };

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => {
        const currentValues = prev[filterName];
        const newValues = currentValues.includes(value)
          ? currentValues.filter(v => v !== value)
          : [...currentValues, value];
        return { ...prev, [filterName]: newValues };
    });
  };

  const clearFilters = () => {
    setFilters({ fullName: [], title: [], manager: [] });
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
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-10">
                        <TabsTrigger value="weekly">Weekly</TabsTrigger>
                        <TabsTrigger value="bulk">Bulk</TabsTrigger>
                        <TabsTrigger value="freshservice">Freshservice</TabsTrigger>
                        <TabsTrigger value="targets">Targets</TabsTrigger>
                    </TabsList>
                </Tabs>
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
                    <Button variant="outline" size="sm" onClick={clearFilters} disabled={isPageLoading}>Clear Filters</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-4">
                    <MultiSelectFilter placeholder="Filter by Name..." options={filterOptions.fullNames} selected={filters.fullName} onValueChange={value => handleFilterChange('fullName', value)} disabled={isPageLoading} />
                    <MultiSelectFilter placeholder="Filter by Title..." options={filterOptions.titles} selected={filters.title} onValueChange={value => handleFilterChange('title', value)} disabled={isPageLoading} />
                    <MultiSelectFilter placeholder="Filter by Manager..." options={filterOptions.managers} selected={filters.manager} onValueChange={value => handleFilterChange('manager', value)} disabled={isPageLoading} />
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
                    ) : detailData.length > 0 ? detailData.map(employee => (
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
