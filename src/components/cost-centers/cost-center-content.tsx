
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export function CostCenterContent() {
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Construct the full URL and fetch directly inside useEffect
        //const baseUrl = 'https://c5899a60-de1d-42af-b19b-99f8dff54fad.domoapps.prod10.domo.com';
        //const url = `${baseUrl}/data/v1/gbs_ind_finance_cc_report`;
        const url = `/data/v1/gbs_ind_finance_cc_report`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setCostCenters(result);

        if (result.length > 0) {
          setColumns(Object.keys(result[0]));
        }

      } catch (error) {
        console.error("Failed to fetch cost centers:", error);
         toast({
          variant: 'destructive',
          title: 'Failed to fetch cost center data',
          description: 'Could not retrieve data from the server.'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  if (loading) {
      return (
        <Card>
            <CardHeader>
                <CardTitle>All Cost Centers</CardTitle>
                <CardDescription>
                    View all available cost centers.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            </CardContent>
        </Card>
      )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Cost Centers</CardTitle>
        <CardDescription>
            View all available cost centers from the live dataset.
        </CardDescription>
      </CardHeader>
      <CardContent>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {costCenters.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((col) => (
                        <TableCell key={col}>{row[col]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
      </CardContent>
    </Card>
  );
}
