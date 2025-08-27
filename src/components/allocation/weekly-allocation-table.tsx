
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';

type WeeklyAllocationDoc = {
  id: string;
  content: {
    allocation_date: string;
    allocation_name: string;
    cost_center_name: string;
    cost_center_number: string;
    allocation_amount: string;
  }
}

// Initialize a local domo object to handle data fetching, following the working pattern.
const baseUrl = 'https://c5899a60-de1d-42af-b19b-99f8dff54fad.domoapps.prod10.domo.com';
const domo = {
  get: async (url: string) => {
    const rUrl = `${baseUrl}${url}`;
    const response = await fetch(rUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
};

export function WeeklyAllocationTable() {
  const [allocations, setAllocations] = useState<WeeklyAllocationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch data only on the client-side within useEffect
        const result = await domo.get(`/domo/datastores/v1/collections/weekly_allocation/documents/`);
        setAllocations(result);
      } catch (error) {
        console.error('Error fetching allocation data:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to fetch allocation data',
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
          <CardTitle>Weekly Allocation Data</CardTitle>
          <CardDescription>All records from the weekly_allocation collection.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Allocation Data</CardTitle>
        <CardDescription>All records from the weekly_allocation collection.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Allocation Date</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>Cost Center</TableHead>
                <TableHead>Allocation Amount</TableHead>
                <TableHead>Document ID</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {allocations.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                            No allocation data found.
                        </TableCell>
                    </TableRow>
                ) : (
                    allocations.map((alloc) => (
                        <TableRow key={alloc.id}>
                        <TableCell>{alloc.content.allocation_date}</TableCell>
                        <TableCell>{alloc.content.allocation_name}</TableCell>
                        <TableCell>{alloc.content.cost_center_name} ({alloc.content.cost_center_number})</TableCell>
                        <TableCell>{alloc.content.allocation_amount}</TableCell>
                        <TableCell className="font-mono text-xs">{alloc.id}</TableCell>
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
