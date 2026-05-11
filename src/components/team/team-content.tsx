
'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { TeamMember } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { writeLog } from '@/lib/logger';
import { cn } from '@/lib/utils';

type FilterOptions = {
  employees: string[];
  departments: string[];
  titles: string[];
  managers: string[];
  countries: string[];
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
          className="w-full justify-between text-xs"
          disabled={disabled}
        >
          <span className="truncate">
            {(selected || []).length === 0
              ? placeholder
              : (selected || []).length <= 1
              ? (selected || []).join(', ')
              : `${(selected || []).length} selected`}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command filter={(val, search) => val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-64">
                {(options || []).map(option => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => onValueChange(option)}
                  >
                    <Checkbox
                      className="mr-2"
                      checked={(selected || []).includes(option)}
                    />
                    <span className="text-xs">{option}</span>
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


export function TeamContent() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [filters, setFilters] = useState({
    employee: [] as string[],
    department: [] as string[],
    title: [] as string[],
    manager: [] as string[],
    country: [] as string[],
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
      employees: [], departments: [], titles: [], managers: [], countries: []
  });
  const { toast } = useToast();

  const columnConfig: { label: string; key: keyof TeamMember; width: string }[] = [
    { label: 'Employee Name', key: 'full_name', width: 'w-[140px]' },
    { label: 'Region', key: 'region', width: 'w-[80px]' },
    { label: 'Country', key: 'country', width: 'w-[100px]' },
    { label: 'Employee ID', key: 'person_id', width: 'w-[100px]' },
    { label: 'Status', key: 'status', width: 'w-[80px]' },
    { label: 'Job Title', key: 'title', width: 'w-[140px]' },
    { label: 'Manager Name', key: 'manager', width: 'w-[140px]' },
    { label: 'Department', key: 'department', width: 'w-[140px]' },
    { label: 'Department Detail', key: 'department_detail', width: 'w-[140px]' },
    { label: 'FTE Value', key: 'fte', width: 'w-[70px]' },
  ];

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/data/v1/consolidated_hr_fte_report_view`);
        if (!response.ok) {
          writeLog('TeamContent', 'error', 'Failed to fetch team data', { status: response.status });
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const rawData: any[] = await response.json();
        
        const allData = Array.isArray(rawData) ? rawData : [];
        setTeamMembers(allData);

        const getUniqueSorted = (key: keyof TeamMember) =>
            Array.from(
                new Set(
                    allData
                        .map(item => item && item[key])
                        .filter(val => typeof val === 'string' && val) as string[]
                )
            ).sort((a, b) => a.localeCompare(b));
        
        setFilterOptions({
            employees: getUniqueSorted('full_name'),
            departments: getUniqueSorted('department'),
            titles: getUniqueSorted('title'),
            managers: getUniqueSorted('manager'),
            countries: getUniqueSorted('country'),
        });
        
      } catch (error) {
        console.error("Failed to fetch team members:", error);
        toast({
          variant: 'destructive',
          title: 'Failed to fetch team data',
          description: 'Could not retrieve data from the server.'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);
  
  const filteredMembers = useMemo(() => {
    return (teamMembers || []).filter(member => {
        if (!member) return false;
        const filterBy = (key: keyof typeof filters, memberField: keyof TeamMember) => {
            const values = filters[key];
            if (!values || values.length === 0) return true;
            const memberValue = member[memberField];
            return memberValue ? values.includes(memberValue as string) : false;
        };

        return (
            filterBy('employee', 'full_name') &&
            filterBy('department', 'department') &&
            filterBy('title', 'title') &&
            filterBy('manager', 'manager') &&
            filterBy('country', 'country')
        );
    });
  }, [teamMembers, filters]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => {
        const currentValues = prev[filterName] || [];
        const newValues = currentValues.includes(value)
          ? currentValues.filter(v => v !== value)
          : [...currentValues, value];
        return { ...prev, [filterName]: newValues };
    });
  };

  const clearFilters = () => {
    setFilters({
        employee: [],
        department: [],
        title: [],
        manager: [],
        country: [],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Roster</CardTitle>
        <CardDescription>
          Current roster with all requested fields. Optimized for single-page viewing.
        </CardDescription>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4">
            <MultiSelectFilter placeholder="Filter by Name..." options={filterOptions.employees} selected={filters.employee} onValueChange={value => handleFilterChange('employee', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Filter by Department..." options={filterOptions.departments} selected={filters.department} onValueChange={value => handleFilterChange('department', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Filter by Title..." options={filterOptions.titles} selected={filters.title} onValueChange={value => handleFilterChange('title', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Filter by Manager..." options={filterOptions.managers} selected={filters.manager} onValueChange={value => handleFilterChange('manager', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Filter by Country..." options={filterOptions.countries} selected={filters.country} onValueChange={value => handleFilterChange('country', value)} disabled={loading} />
            <Button variant="outline" size="sm" onClick={clearFilters} disabled={loading}>Clear Filters</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                {columnConfig.map((col) => (
                  <TableHead key={col.key} className={cn("text-[11px] font-bold uppercase tracking-wider", col.width)}>{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!hasMounted || loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {columnConfig.map(col => <TableCell key={col.key} className={col.width}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : filteredMembers.length > 0 ? (
                filteredMembers.map((member, rowIndex) => (
                  <TableRow key={member.person_id || rowIndex}>
                    {columnConfig.map((col) => (
                      <TableCell key={col.key} className={cn("text-[11px] truncate py-2", col.width)} title={member[col.key] as string || '-'}>
                        {member[col.key] as string || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={columnConfig.length} className="h-24 text-center text-muted-foreground text-xs">
                        No team members match the current filters.
                    </TableCell>
                </TableRow>
               )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
