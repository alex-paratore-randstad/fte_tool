
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { TeamMember } from '@/types';
import { ScrollArea } from '../ui/scroll-area';

type SavedUpdateDoc = {
  id: string;
  content: {
    employee_id: string;
    updated_title: string;
  }
};

type SavedUpdate = {
  id: string;
  employeeName: string;
  updatedTitle: string;
};

type SavedTitleUpdatesTableProps = {
  refreshKey: number;
};

export function SavedTitleUpdatesTable({ refreshKey }: SavedTitleUpdatesTableProps) {
  const [updates, setUpdates] = useState<SavedUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [updatesResponse, employeesResponse] = await Promise.all([
        fetch(`/domo/datastores/v1/collections/title_management/documents/`),
        fetch(`/data/v1/consolidated_hr_fte_report_view`)
      ]);

      if (!updatesResponse.ok) {
        console.warn(`Failed to fetch saved title updates.`);
      }
       if (!employeesResponse.ok) {
        throw new Error('Failed to fetch employee list for mapping.');
      }

      const savedUpdates: SavedUpdateDoc[] = updatesResponse.ok ? await updatesResponse.json() : [];
      const employees: TeamMember[] = await employeesResponse.json();
      
      const employeeMap = new Map(employees.map(emp => [emp.person_id, emp.full_name]));

      const structuredUpdates: SavedUpdate[] = savedUpdates.map(update => ({
        id: update.id,
        employeeName: employeeMap.get(update.content.employee_id) || `ID: ${update.content.employee_id}`,
        updatedTitle: update.content.updated_title,
      }));

      setUpdates(structuredUpdates.reverse()); // Show most recent first
    } catch (error) {
      console.error('Error fetching title update data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to fetch saved title updates',
        description: 'Could not retrieve data from the server.'
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
          <CardTitle>Saved Title Updates</CardTitle>
          <CardDescription>History of all title management changes.</CardDescription>
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
        <CardTitle>Saved Title Updates</CardTitle>
        <CardDescription>History of all title management changes.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>New Market-Facing Title</TableHead>
                    <TableHead>Update ID</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {updates.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                            No saved title updates found.
                        </TableCell>
                    </TableRow>
                ) : (
                    updates.map(update => (
                        <TableRow key={update.id}>
                            <TableCell className="font-medium">{update.employeeName}</TableCell>
                            <TableCell>{update.updatedTitle}</TableCell>
                            <TableCell className="text-muted-foreground">{update.id}</TableCell>
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
