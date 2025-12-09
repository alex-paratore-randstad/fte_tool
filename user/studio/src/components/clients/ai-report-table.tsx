
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

export type AiReportData = {
    Code: string;
    Name: string;
    DisplayName: string;
    RollsUpTo: string;
};

type AiReportTableProps = {
    reportData: AiReportData[];
};

export function AiReportTable({ reportData }: AiReportTableProps) {
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
        <CardTitle>Client Data</CardTitle>
        <CardDescription>
            This table displays all available clients from the `ai_report` dataset.
        </CardDescription>
        <div className="pt-2">
            <Input
              placeholder="Filter by Display Name or Code..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm"
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
                {filteredData && filteredData.length > 0 ? (
                    filteredData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
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

