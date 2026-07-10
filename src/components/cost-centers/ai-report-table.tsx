
'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronsUpDown, Check, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';

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
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    const s = (search || '').toLowerCase().trim();
    if (!s) return options || [];
    return (options || []).filter(o => 
      o && String(o).toLowerCase().includes(s)
    );
  }, [search, options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
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
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={`Search ${placeholder.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <CommandList className="max-h-64 overflow-y-auto">
            <CommandEmpty>No matches found.</CommandEmpty>
            <CommandGroup>
                {filteredOptions.map((option, idx) => (
                  <CommandItem
                    key={`${option}-${idx}`}
                    value={option}
                    onSelect={() => onValueChange(option)}
                  >
                    <Checkbox
                      className="mr-2"
                      checked={(selected || []).includes(option)}
                    />
                    <span className="truncate">{option}</span>
                  </CommandItem>
                ))}
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
                        .filter(val => typeof val === 'string' && val)
                        .map(val => (val as string).trim())
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
            const rowValue = (row[rowField] || '').toString().trim();
            return values.includes(rowValue);
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
            View and manage regional client data. All filters are high-performance searchable dropdowns for precise selection.
        </CardDescription>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 pt-4">
            <MultiSelectFilter placeholder="Region..." options={filterOptions.regions} selected={filters.region} onValueChange={value => handleFilterChange('region', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Country..." options={filterOptions.countries} selected={filters.country} onValueChange={value => handleFilterChange('country', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Client..." options={filterOptions.displayNames} selected={filters.displayName} onValueChange={value => handleFilterChange('displayName', value)} disabled={loading} />
            <MultiSelectFilter placeholder="Code..." options={filterOptions.codes} selected={filters.code} onValueChange={value => handleFilterChange('code', value)} disabled={loading} />
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
                ) : filteredData.length > 0 ? (
                    filteredData.map((row, rowIndex) => (
                    <TableRow key={`${row.Code}-${rowIndex}`}>
                        <TableCell>{row.Region || '-'}</TableCell>
                        <TableCell>{row.Country || '-'}</TableCell>
                        <TableCell className="font-medium">{row.DisplayName || '-'}</TableCell>
                        <TableCell>{row.Code || '-'}</TableCell>
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

