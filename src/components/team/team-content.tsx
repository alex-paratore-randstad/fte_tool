
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TeamMember } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

declare var domo: any;

export function TeamContent() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (typeof domo !== 'undefined') {
          const data = await domo.get(`/domo/data/v1/7228fd02-b6c5-4896-81d2-9753bab5fde0`);
          setTeamMembers(data);
          if (data.length > 0) {
            setColumns(Object.keys(data[0]));
          }
        } else {
            console.warn('Domo object not found. Skipping data fetch for local development.');
        }
      } catch (error) {
        console.error("Failed to fetch team members:", error);
        toast({
          variant: 'destructive',
          title: 'Failed to fetch team data',
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
           <CardTitle><Skeleton className="h-6 w-1/4" /></CardTitle>
           <CardDescription>
              <Skeleton className="h-4 w-1/2" />
           </CardDescription>
         </CardHeader>
         <CardContent>
          <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
          </div>
         </CardContent>
       </Card>
    )
  }

  return (
      <Card>
        <CardHeader>
          <CardTitle>Team Roster</CardTitle>
          <CardDescription>
            This page displays the current team roster from the live dataset.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="w-full h-[60vh] whitespace-nowrap">
                <Table>
                    <TableHeader>
                    <TableRow>
                        {columns.map((column) => (
                            <TableHead key={column}>{column}</TableHead>
                        ))}
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {teamMembers.map((member, rowIndex) => (
                        <TableRow key={member['Person Number'] || rowIndex}>
                            {columns.map((column) => (
                                <TableCell key={column}>{member[column as keyof TeamMember]}</TableCell>
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
