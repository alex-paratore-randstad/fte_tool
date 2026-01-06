
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Skeleton } from '../ui/skeleton';

export type AiReportData = {
    Code: string;
    Name: string;
    DisplayName: string;
    RollsUpTo: string;
};

type ClientDataTableProps = {
    reportData: AiReportData[];
    loading: boolean;
};

export function ClientDataTable({ reportData, loading }: ClientDataTableProps) {
  const [filter, setFilter] = useState('');

  const filteredData = useMemo(() => {
    if (!filter) return reportData;
    const lowercasedFilter = filter.toLowerCase();
    return reportData.filter(row =>
      (row.DisplayName && row.DisplayName.toLowerCase().includes(lowercasedFilter)) ||
      (row.Code && row.Code.toLowerCase().includes(lowercasedFilter))
    );
  }, [reportData, filter]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Data (from ai_report)</CardTitle>
        <CardDescription>
            This table displays all available clients from the `ai_report` dataset which populates the client dropdowns across the app.
        </CardDescription>
        <div className="pt-2">
            <Input
              placeholder="Filter by Display Name or Code..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm"
              disabled={loading}
            />
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
                  <TableHead>Rolls Up To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={`skeleton-${i}`}>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        </TableRow>
                    ))
                ) : filteredData.length > 0 ? (
                    filteredData.map((row, rowIndex) => (
                    <TableRow key={row.Code || rowIndex}>
                        <TableCell>{row.Code}</TableCell>
                        <TableCell>{row.Name}</TableCell>
                        <TableCell>{row.DisplayName}</TableCell>
                        <TableCell>{row.RollsUpTo}</TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
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
