
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '../ui/button';
import { SelectSearch } from '../ui/select-search';

type FilterOptions = {
  teams: string[];
  titles: string[];
  managers: string[];
  regions: string[];
}

const FilterSelect = ({ placeholder, options, value, onValueChange }: { placeholder: string, options: string[], value: string, onValueChange: (value: string) => void }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredOptions = useMemo(() => {
    const sortedOptions = [...options].sort((a,b) => a.localeCompare(b));
    if (!searchTerm) return sortedOptions;
    return sortedOptions.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectSearch placeholder="Search..." onChange={setSearchTerm} />
        {filteredOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
         {filteredOptions.length === 0 && (
          <div className="p-4 text-sm text-center text-muted-foreground">
              No results found.
          </div>
        )}
      </SelectContent>
    </Select>
  );
};

export function TeamContent() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    name: '',
    team: '',
    title: '',
    manager: '',
    region: '',
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
      teams: [], titles: [], managers: [], regions: []
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
        setTeamMembers(data);

        // Derive filter options from the data
        const getUnique = (key: keyof TeamMember) => 
            Array.from(new Set(data.map(item => item[key]).filter(Boolean) as string[]));
        
        setFilterOptions({
            teams: getUnique('Team_Name'),
            titles: getUnique('Market_Facing_Title'),
            managers: getUnique('First_Reviewer_Name'),
            regions: getUnique('Region'),
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
        (filters.name === '' || member.Full_Name?.toLowerCase().includes(filters.name.toLowerCase())) &&
        (filters.team === '' || member.Team_Name === filters.team) &&
        (filters.title === '' || member.Market_Facing_Title === filters.title) &&
        (filters.manager === '' || member.First_Reviewer_Name === filters.manager) &&
        (filters.region === '' || member.Region === filters.region)
      );
    });
  }, [teamMembers, filters]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({ name: '', team: '', title: '', manager: '', region: '' });
  };


  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-1/4" /></CardTitle>
          <div className="text-sm text-muted-foreground">
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Roster</CardTitle>
        <CardDescription>
          This page displays the current team roster from the live dataset. Use the filters below to refine the results.
        </CardDescription>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4">
            <Input 
                placeholder="Filter by Name..."
                value={filters.name}
                onChange={e => handleFilterChange('name', e.target.value)}
            />
            <FilterSelect placeholder="Filter by Region..." options={filterOptions.regions} value={filters.region} onValueChange={value => handleFilterChange('region', value)} />
            <FilterSelect placeholder="Filter by Team..." options={filterOptions.teams} value={filters.team} onValueChange={value => handleFilterChange('team', value)} />
            <FilterSelect placeholder="Filter by Title..." options={filterOptions.titles} value={filters.title} onValueChange={value => handleFilterChange('title', value)} />
            <FilterSelect placeholder="Filter by Manager..." options={filterOptions.managers} value={filters.manager} onValueChange={value => handleFilterChange('manager', value)} />
            <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
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
              {filteredMembers.map((member, rowIndex) => (
                <TableRow key={member['Person_Number'] || rowIndex}>
                  {displayColumns.map((column) => (
                    <TableCell key={column}>{member[column as keyof TeamMember]}</TableCell>
                  ))}
                </TableRow>
              ))}
               {filteredMembers.length === 0 && (
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
