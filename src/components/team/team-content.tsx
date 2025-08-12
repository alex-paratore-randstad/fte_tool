
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

declare var domo: any;

export function TeamContent() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (typeof domo !== 'undefined') {
          const data = await domo.get(`/domo/data/v1/7228fd02-b6c5-4896-81d2-9753bab5fde0`);
          setTeamMembers(data);
        } else {
          // Fallback for local development if needed
           toast({
            variant: 'destructive',
            title: 'Domo SDK not available',
            description: 'Cannot fetch live data. Displaying empty table.',
          });
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Market Facing Title</TableHead>
                <TableHead>Team Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Employment Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member['Person Number']}>
                  <TableCell className="font-medium">{member['Full Name']}</TableCell>
                  <TableCell>{member['Market Facing Title']}</TableCell>
                  <TableCell>{member['Team Name']}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{member.Region}</Badge>
                  </TableCell>
                  <TableCell>{member['Employment Status']}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
  );
}
