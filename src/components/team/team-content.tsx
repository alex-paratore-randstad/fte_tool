
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

type FilterOptions = {
  employees: string[];
  teams: string[];
  titles: string[];
  managers: string[];
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
  const [filters, setFilters] = useState({
    employee: '',
    team: '',
    title: '',
    manager: '',
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
      employees: [], teams: [], titles: [], managers: []
  });
  const { toast } = useToast();

  const displayColumns = [
    'Person_Number',
    'Full_Name',
    'Employment_Status',
    'Employment_Mode',
    'Team_Name',
    'Vertical_Name',
    'Market_Facing_Title',
    'First_Reviewer_Code',
    'First_Reviewer_Name',
    'Official_Email'
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/data/v1/gbs_ind_hr_fte_report`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: TeamMember[] = await response.json();
        
        const tempWorker: TeamMember = {
          'Person_Number': 'TEMP_WORKER',
          'Full_Name': 'Temp Worker',
          'Employment_Status': 'Active',
          'Employment_Mode': 'Temporary',
          'Team_Name': 'Temporary',
          'Vertical_Name': 'N/A',
          'Market_Facing_Title': 'Temporary Staff',
          'First_Reviewer_Name': 'N/A',
          'Official_Email': 'N/A',
          'First_Reviewer_Code': 'N/A',
        } as TeamMember;

        const allData = [tempWorker, ...data];
        setTeamMembers(allData);

        // Derive filter options from the data
        const getUniqueSorted = (key: keyof TeamMember) => 
            Array.from(new Set(allData.map(item => item[key]).filter(Boolean))).sort((a,b) => a.localeCompare(b));
        
        setFilterOptions({
            employees: getUniqueSorted('Full_Name'),
            teams: getUniqueSorted('Team_Name'),
            titles: getUniqueSorted('Market_Facing_Title'),
            managers: getUniqueSorted('First_Reviewer_Name'),
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
        (filters.employee === '' || member.Full_Name === filters.employee) &&
        (filters.team === '' || member.Team_Name === filters.team) &&
        (filters.title === '' || member.Market_Facing_Title === filters.title) &&
        (filters.manager === '' || member.First_Reviewer_Name === filters.manager)
      );
    });
  }, [teamMembers, filters]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({ employee: '', team: '', title: '', manager: '' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Roster</CardTitle>
        <CardDescription>
          This page displays the current team roster from the live dataset. Use the filters below to refine the results.
        </CardDescription>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4">
            <FilterSelect placeholder="Filter by Name..." options={filterOptions.employees} value={filters.employee} onValueChange={value => handleFilterChange('employee', value)} disabled={loading} />
            <FilterSelect placeholder="Filter by Team..." options={filterOptions.teams} value={filters.team} onValueChange={value => handleFilterChange('team', value)} disabled={loading} />
            <FilterSelect placeholder="Filter by Title..." options={filterOptions.titles} value={filters.title} onValueChange={value => handleFilterChange('title', value)} disabled={loading} />
            <FilterSelect placeholder="Filter by Manager..." options={filterOptions.managers} value={filters.manager} onValueChange={value => handleFilterChange('manager', value)} disabled={loading} />
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
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {displayColumns.map(col => <TableCell key={col}><Skeleton className="h-5 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : filteredMembers.length > 0 ? (
                filteredMembers.map((member, rowIndex) => (
                  <TableRow key={member['Person_Number'] || rowIndex}>
                    {displayColumns.map((column) => (
                      <TableCell key={column}>{member[column as keyof TeamMember]}</TableCell>
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
