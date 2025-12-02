
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
  tickets: string;
  total_monthly_tickets: string;
  monthly_ticket_ratio: string;
};

export function MonthlyTicketSummaryTable() {
  const [data, setData] = useState<MonthlyTicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/data/v1/fte_tickets_grouped_monthly`);
      if (!response.ok) {
        throw new Error('Failed to fetch monthly ticket summary');
      }
      const result: MonthlyTicketData[] = await response.json();
      setData(result.sort((a,b) => Number(b.tickets) - Number(a.tickets)));
    } catch (error) {
      console.error("Failed to fetch summary data:", error);
      toast({
        variant: 'destructive',
        title: 'Failed to fetch summary data',
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
          <CardTitle>Monthly Ticket Summary (Raw Data)</CardTitle>
          <CardDescription>
            A raw view of the fte_tickets_grouped_monthly dataset.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Ticket Summary (Raw Data)</CardTitle>
        <CardDescription>
          A raw view of the fte_tickets_grouped_monthly dataset.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Total Monthly</TableHead>
                <TableHead>Ratio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No data found in the dataset.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => (
                  <TableRow key={`${row.agent_name}-${row.agent_group_name}-${index}`}>
                    <TableCell>{row.agent_name}</TableCell>
                    <TableCell>{row.agent_group_name}</TableCell>
                    <TableCell>{row.reporting_month}</TableCell>
                    <TableCell>{row.reporting_year}</TableCell>
                    <TableCell>{row.tickets}</TableCell>
                    <TableCell>{row.total_monthly_tickets}</TableCell>
                    <TableCell>{(Number(row.monthly_ticket_ratio) || 0).toFixed(4)}</TableCell>
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
