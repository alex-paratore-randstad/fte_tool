'use client';

import { useState, useEffect, useMemo } from 'react';
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
import type { TeamMember } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '../ui/button';
import { SelectSearch } from '../ui/select-search';
import { writeLog } from '@/lib/logger';

type FilterOptions = {
  employees: string[];
  departments: string[];
  titles: string[];
  managers: string[];
  countries: string[];
}

const FilterSelect = ({ placeholder, options, value, onValueChange, disabled }: { placeholder: string, options: string[], value: string, onValueChange: (value: string) => void, disabled?: boolean }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectSearch placeholder="Search..." onChange={setSearchTerm} />
        <ScrollArea className="h-64">
            {filteredOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            {filteredOptions.length === 0 && (
              <div className="p-4 text-sm text-center text-muted-foreground">
                  No results found.
              </div>
            )}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
};

export function TeamContent() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [filters, setFilters] = useState({
    employee: '',
    department: '',
    title: '',
    manager: '',
    country: '',
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
      employees: [], departments: [], titles: [], managers: [], countries: []
  });
  const { toast } = useToast();

  const columnConfig: { label: string; key: keyof TeamMember }[] = [
    { label: 'Employee Name', key: 'full_name' },
    { label: 'Region', key: 'region' },
    { label: 'Country', key: 'country' },
    { label: 'Employee ID', key: 'person_id' },
    { label: 'Status', key: 'status' },
    { label: 'Job Title', key: 'title' },
    { label: 'Manager Name', key: 'manager' },
    { label: 'Department', key: 'department' },
    { label: 'Department Detail', key: 'department_detail' },
    { label: 'FTE Value', key: 'fte' },
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
        
        const tempWorker: any = {
            person_id: 'TEMP_WORKER',
            full_name: 'Temp Worker',
            title: 'Temporary Staff',
            status: 'Active',
            department: 'Temporary',
            department_detail: 'Manual Entry',
            manager: 'N/A',
            country: 'N/A',
            region: 'N/A',
            fte: '1.0'
        };

        const allData = [tempWorker, ...rawData];
        setTeamMembers(allData);

        // Derive filter options from the data
        const getUniqueSorted = (key: keyof TeamMember) => 
            Array.from(new Set(allData.map(item => item && item[key]).filter(val => typeof val === 'string' && val) as string[])).sort((a,b) => a.localeCompare(b));
        
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
      if (!member) return false;
      return (
        (filters.employee === '' || member.full_name === filters.employee) &&
        (filters.department === '' || member.department === filters.department) &&
        (filters.title === '' || member.title === filters.title) &&
        (filters.manager === '' || member.manager === filters.manager) &&
        (filters.country === '' || member.country === filters.country)
      );
    });
  }, [teamMembers, filters]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({ employee: '', department: '', title: '', manager: '', country: '' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Roster</CardTitle>
        <CardDescription>
          Current team roster from the consolidated HR report. Use filters to refine results.
        </CardDescription>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4">
            <FilterSelect placeholder="Filter by Name..." options={filterOptions.employees} value={filters.employee} onValueChange={value => handleFilterChange('employee', value)} disabled={loading} />
            <FilterSelect placeholder="Filter by Department..." options={filterOptions.departments} value={filters.department} onValueChange={value => handleFilterChange('department', value)} disabled={loading} />
            <FilterSelect placeholder="Filter by Title..." options={filterOptions.titles} value={filters.title} onValueChange={value => handleFilterChange('title', value)} disabled={loading} />
            <FilterSelect placeholder="Filter by Manager..." options={filterOptions.managers} value={filters.manager} onValueChange={value => handleFilterChange('manager', value)} disabled={loading} />
            <FilterSelect placeholder="Filter by Country..." options={filterOptions.countries} value={filters.country} onValueChange={value => handleFilterChange('country', value)} disabled={loading} />
            <Button variant="outline" onClick={clearFilters} disabled={loading}>Clear Filters</Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full border rounded-md h-[65vh]">
          <Table className="min-w-[1500px]">
            <TableHeader>
              <TableRow>
                {columnConfig.map((col) => (
                  <TableHead key={col.key} className="whitespace-nowrap">{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!hasMounted || loading) ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {columnConfig.map(col => <TableCell key={col.key}><Skeleton className="h-5 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : filteredMembers.length > 0 ? (
                filteredMembers.map((member, rowIndex) => (
                  <TableRow key={member.person_id || rowIndex}>
                    {columnConfig.map((col) => (
                      <TableCell key={col.key} className="whitespace-nowrap">{member[col.key] as string || '-'}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={columnConfig.length} className="h-24 text-center">
                        No team members match the current filters.
                    </TableCell>
                </TableRow>
               )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
