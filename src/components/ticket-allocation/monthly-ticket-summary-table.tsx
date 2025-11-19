
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type MonthlyTicketData = {
  agent_name: string;
  agent_group_name: string;
  reporting_month: string;
  reporting_year: string;
  tickets: number;
};

export function MonthlyTicketSummaryTable() {
  const [data, setData] = useState<MonthlyTicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/data/v1/fte_tickets_grouped_monthly');
      if (!response.ok) {
        throw new Error('Failed to fetch monthly ticket summary data.');
      }
      const result: MonthlyTicketData[] = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching monthly ticket data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load summary data',
        description: 'Could not retrieve the monthly ticket summary from the server.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3 mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Ticket Summary</CardTitle>
        <CardDescription>
          A summary of tickets grouped by agent, group, and month from the `fte_tickets_grouped_monthly` dataset.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent Name</TableHead>
                <TableHead>Agent Group</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Tickets</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No summary data found.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => (
                  <TableRow key={`${row.agent_name}-${row.agent_group_name}-${row.reporting_month}-${row.reporting_year}-${index}`}>
                    <TableCell className="font-medium">{row.agent_name}</TableCell>
                    <TableCell>{row.agent_group_name}</TableCell>
                    <TableCell>{row.reporting_month}</TableCell>
                    <TableCell>{row.reporting_year}</TableCell>
                    <TableCell className="text-right">{row.tickets}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
