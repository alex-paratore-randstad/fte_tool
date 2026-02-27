
'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '../ui/skeleton';

export type AiReportData = {
    Code: string;
    Name: string;
    DisplayName: string;
    RollsUpTo: string;
    Region: string;
    Country: string;
};

type FilterOptions = {
  codes: string[];
  names: string[];
  displayNames: string[];
  regions: string[];
  countries: string[];
  rollsUpTos: string[];
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


type AiReportTableProps = {
    reportData: AiReportData[];
    loading: boolean;
};

export function AiReportTable({ reportData, loading }: AiReportTableProps) {
  const [filters, setFilters] = useState({
    code: [] as string[],
    name: [] as string[],
    displayName: [] as string[],
    region: [] as string[],
    country: [] as string[],
    rollsUpTo: [] as string[],
  });
  
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    codes: [], names: [], displayNames: [], regions: [], countries: [], rollsUpTos: []
  });

  useEffect(() => {
    if (reportData && reportData.length > 0) {
        const getUniqueSorted = (key: keyof AiReportData) =>
            Array.from(
                new Set(
                    reportData
                        .map(item => item && item[key])
                        // Ensure value is a non-empty string before including it
                        .filter(val => typeof val === 'string' && val) as string[]
                )
            ).sort((a, b) => a.localeCompare(b));
        
        setFilterOptions({
            codes: getUniqueSorted('Code'),
            names: getUniqueSorted('Name'),
            displayNames: getUniqueSorted('DisplayName'),
            regions: getUniqueSorted('Region'),
            countries: getUniqueSorted('Country'),
            rollsUpTos: getUniqueSorted('RollsUpTo'),
        });
    }
  }, [reportData]);

  const filteredData = useMemo(() => {
    if (!reportData) return [];
    return reportData.filter(row => {
        if (!row) return false;
        const filterBy = (key: keyof typeof filters, rowField: keyof AiReportData) => {
            const values = filters[key];
            if (!values || values.length === 0) return true;
            const rowValue = row[rowField];
            return rowValue ? values.includes(rowValue as string) : false;
        };

        return (
            filterBy('code', 'Code') &&
            filterBy('name', 'Name') &&
            filterBy('displayName', 'DisplayName') &&
            filterBy('region', 'Region') &&
            filterBy('country', 'Country') &&
            filterBy('rollsUpTo', 'RollsUpTo')
        );
    });
  }, [reportData, filters]);

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
        code: [], name: [], displayName: [], region: [], country: [], rollsUpTo: []
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Data</CardTitle>
        <CardDescription>
            Data from the `ai_report` dataset used to populate client dropdowns.
        </CardDescription>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 pt-4">
            <MultiSelectFilter placeholder="Filter by Code..." options={filterOptions.codes} selected={filters.code} onValueChange={value => handleFilterChange('code', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Filter by Name..." options={filterOptions.names} selected={filters.name} onValueChange={value => handleFilterChange('name', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Filter by Display Name..." options={filterOptions.displayNames} selected={filters.displayName} onValueChange={value => handleFilterChange('displayName', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Filter by Region..." options={filterOptions.regions} selected={filters.region} onValueChange={value => handleFilterChange('region', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Filter by Country..." options={filterOptions.countries} selected={filters.country} onValueChange={value => handleFilterChange('country', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Filter by Rolls Up To..." options={filterOptions.rollsUpTos} selected={filters.rollsUpTo} onValueChange={value => handleFilterChange('rollsUpTo', value)} disabled={loading} />
            <Button variant="outline" onClick={clearFilters} disabled={loading}>Clear Filters</Button>
        </div>
      </CardHeader>
      <CardContent>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Rolls Up To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        </TableRow>
                    ))
                ) : filteredData && filteredData.length > 0 ? (
                    filteredData.map((row, rowIndex) => (
                    <TableRow key={row.Code || rowIndex}>
                        <TableCell>{row.Code}</TableCell>
                        <TableCell>{row.Name}</TableCell>
                        <TableCell>{row.DisplayName}</TableCell>
                        <TableCell>{row.Region}</TableCell>
                        <TableCell>{row.Country}</TableCell>
                        <TableCell>{row.RollsUpTo}</TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            No client data available or matching filters.
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
