
'use client';

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
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
import type { Employee } from '@/types';
import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

declare var domo: any;

export function TeamContent() {
  const { currentUser, isManager, isVp, loading: userLoading } = useCurrentUser();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayedEmployees, setDisplayedEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (typeof domo !== 'undefined') {
            const result = await domo.get(`/domo/datastores/v1/collections/employees/documents/`);
            const mappedData = result.map((r: any) => ({ ...r.content, id: r.id }));
            setEmployees(mappedData);
        }
      } catch (error) {
        console.error("Failed to fetch employees:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (employees.length > 0 && !userLoading) {
      const getDisplayedEmployees = () => {
          if (isManager) {
              return employees.filter((employee) => employee.manager === currentUser.name);
          }
          if (isVp) {
              const managersUnderVp = employees
                  .filter((e) => e.manager === currentUser.name)
                  .map((m) => m.name);
              return employees.filter(
                  (e) => e.manager === currentUser.name || managersUnderVp.includes(e.manager)
              );
          }
          return employees;
      };
      setDisplayedEmployees(getDisplayedEmployees());
      setLoading(false);
    }
  }, [employees, currentUser, userLoading, isManager, isVp]);
    
  const getPageTitle = () => {
    if (isManager) return 'My Team';
    if (isVp) return 'My Organization';
    return 'All Personnel'
  }

  const getPageDescription = () => {
    if (isManager) return 'View and manage your direct reports.';
    if (isVp) return "View your direct reports and their teams.";
    return 'View and manage all GBS personnel.'
  }

  const renderContent = () => {
    if (loading || userLoading) {
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
            <CardTitle>{getPageTitle()}</CardTitle>
            <CardDescription>
              This page reflects the current organizational structure. Manager changes made here will apply to the current and future weeks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{employee.region}</Badge>
                    </TableCell>
                    <TableCell>{employee.manager}</TableCell>
                    <TableCell>{employee.team}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>View Allocations</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    );
  };

  return renderContent();
}
