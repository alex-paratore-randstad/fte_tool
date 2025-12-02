
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Report Data</CardTitle>
        <CardDescription>
            Data from the `ai_report` dataset.
        </CardDescription>
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
                {reportData && reportData.length > 0 ? (
                    reportData.map((row, rowIndex) => (
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
                            No AI report data available.
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
