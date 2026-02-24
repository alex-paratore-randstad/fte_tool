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
import { Checkbox } from '@/components/ui/checkbox';
import { writeLog } from '@/lib/logger';

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

  const displayColumns: (keyof TeamMember)[] = [
    'person_id',
    'full_name',
    'status',
    'employment_type',
    'department',
    'title',
    'manager',
    'person_email',
    'country',
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
        const data: TeamMember[] = await response.json();
        
        const tempWorker: TeamMember = {
            person_id: 'TEMP_WORKER',
            full_name: 'Temp Worker',
            title: 'Temporary Staff',
            employment_type: 'Temporary',
            status: 'Active',
            department: 'Temporary',
            manager_id: 'N/A',
            manager: 'N/A',
            manager_email: 'N/A',
            person_email: 'N/A',
            start_date: '',
            end_date: '',
            country: 'N/A',
            fte: '1.0'
        };

        const allData = [tempWorker, ...data];
        setTeamMembers(allData);

        // Derive filter options from the data
        const getUniqueSorted = (key: keyof TeamMember) => 
            Array.from(new Set(allData.map(item => item[key]).filter(Boolean) as string[])).sort((a,b) => a.localeCompare(b));
        
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
    return teamMembers.filter(member => {
        const filterBy = (key: keyof typeof filters, memberField: keyof TeamMember) => {
            const values = filters[key];
            if (values.length === 0) return true;
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
        const currentValues = prev[filterName];
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
          This page displays the current team roster from the live dataset. Use the filters below to refine the results.
        </CardDescription>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4">
            <MultiSelectFilter placeholder="Filter by Name..." options={filterOptions.employees} selected={filters.employee} onValueChange={value => handleFilterChange('employee', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Filter by Department..." options={filterOptions.departments} selected={filters.department} onValueChange={value => handleFilterChange('department', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Filter by Title..." options={filterOptions.titles} selected={filters.title} onValueChange={value => handleFilterChange('title', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Filter by Manager..." options={filterOptions.managers} selected={filters.manager} onValueChange={value => handleFilterChange('manager', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Filter by Country..." options={filterOptions.countries} selected={filters.country} onValueChange={value => handleFilterChange('country', value)} disabled={loading} />
            <Button variant="outline" onClick={clearFilters} disabled={loading}>Clear Filters</Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full h-[60vh] whitespace-nowrap">
          <Table>
            <TableHeader>
              <TableRow>
                {displayColumns.map((column) => (
                  <TableHead key={column}>{column.replace(/_/g, ' ')}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!hasMounted || loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {displayColumns.map(col => <TableCell key={col}><Skeleton className="h-5 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : filteredMembers.length > 0 ? (
                filteredMembers.map((member, rowIndex) => (
                  <TableRow key={member.person_id || rowIndex}>
                    {displayColumns.map((column) => (
                      <TableCell key={column}>{member[column] as string}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={displayColumns.length} className="h-24 text-center">
                        No team members match the current filters.
                    </TableCell>
                </TableRow>
               )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
