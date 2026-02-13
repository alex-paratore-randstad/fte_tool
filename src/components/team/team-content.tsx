
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
import { ScrollArea } from '@/components/ui/scroll-area';
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
          This page displays the current team roster from the live dataset. Use the filters below to refine the results.
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
