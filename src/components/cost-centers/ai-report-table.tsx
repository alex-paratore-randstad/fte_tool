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
  displayNames: string[];
  regions: string[];
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
    displayName: [] as string[],
    region: [] as string[],
    country: [] as string[],
  });
  
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    codes: [], displayNames: [], regions: [], countries: []
  });

  useEffect(() => {
    if (Array.isArray(reportData) && reportData.length > 0) {
        const getUniqueSorted = (key: keyof AiReportData) =>
            Array.from(
                new Set(
                    reportData
                        .map(item => item && item[key])
                        .filter(val => typeof val === 'string' && val) as string[]
                )
            ).sort((a, b) => a.localeCompare(b));
        
        setFilterOptions({
            codes: getUniqueSorted('Code'),
            displayNames: getUniqueSorted('DisplayName'),
            regions: getUniqueSorted('Region'),
            countries: getUniqueSorted('Country'),
        });
    }
  }, [reportData]);

  const filteredData = useMemo(() => {
    if (!Array.isArray(reportData)) return [];
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
            filterBy('displayName', 'DisplayName') &&
            filterBy('region', 'Region') &&
            filterBy('country', 'Country')
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
        code: [], displayName: [], region: [], country: []
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Management</CardTitle>
        <CardDescription>
            View and manage regional client data from the `ai_report` dataset.
        </CardDescription>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 pt-4">
            <MultiSelectFilter placeholder="Filter by Region Name..." options={filterOptions.regions} selected={filters.region} onValueChange={value => handleFilterChange('region', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Filter by Country Name..." options={filterOptions.countries} selected={filters.country} onValueChange={value => handleFilterChange('country', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Filter by Client..." options={filterOptions.displayNames} selected={filters.displayName} onValueChange={value => handleFilterChange('displayName', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Filter by Cost Center Code..." options={filterOptions.codes} selected={filters.code} onValueChange={value => handleFilterChange('code', value)} disabled={loading} />
            <Button variant="outline" onClick={clearFilters} disabled={loading}>Clear Filters</Button>
        </div>
      </CardHeader>
      <CardContent>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Region Name</TableHead>
                  <TableHead>Country Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Cost Center Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        </TableRow>
                    ))
                ) : filteredData && filteredData.length > 0 ? (
                    filteredData.map((row, rowIndex) => (
                    <TableRow key={row.Code || rowIndex}>
                        <TableCell>{row.Region}</TableCell>
                        <TableCell>{row.Country}</TableCell>
                        <TableCell className="font-medium">{row.DisplayName}</TableCell>
                        <TableCell>{row.Code}</TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
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
