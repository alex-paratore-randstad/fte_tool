
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

type SavedAllocationDoc = {
  id: string;
  content: {
    allocation_date: string;
    allocation_name: string;
    cost_center_name: string;
    cost_center_number: string;
    allocation_amount: string;
  };
};

export function SavedFreshserviceAllocationsTable({ refreshKey }: { refreshKey: number }) {
  const [allocations, setAllocations] = useState<SavedAllocationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/domo/datastores/v1/collections/weekly_allocation/documents/');
      if (!response.ok) {
        console.warn('Failed to fetch saved ticket allocations');
        return;
      }
      const data: SavedAllocationDoc[] = await response.json();
      // Only show allocations saved from this flow (where cost_center_name and cost_center_number are the same)
      const filteredData = data.filter(d => d.content.cost_center_name === d.content.cost_center_number);
      setAllocations(filteredData.sort((a,b) => new Date(b.content.allocation_date).getTime() - new Date(a.content.allocation_date).getTime()));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to fetch saved allocations',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved Monthly Allocations</CardTitle>
          <CardDescription>History of all saved monthly Freshservice allocations.</CardDescription>
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
        <CardTitle>Saved Monthly Allocations</CardTitle>
        <CardDescription>History of all saved monthly Freshservice allocations.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Allocation Month</TableHead>
                <TableHead>Agent Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>FTE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No saved allocations found.
                  </TableCell>
                </TableRow>
              ) : (
                allocations.map((alloc) => (
                  <TableRow key={alloc.id}>
                    <TableCell>{new Date(alloc.content.allocation_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</TableCell>
                    <TableCell>{alloc.content.allocation_name}</TableCell>
                    <TableCell>{alloc.content.cost_center_name}</TableCell>
                    <TableCell>{Number(alloc.content.allocation_amount).toFixed(3)}</TableCell>
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
