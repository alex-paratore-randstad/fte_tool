
'use client';

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
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
import { PlusCircle, MoreHorizontal, ChevronDown, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BulkUploadDialog } from '@/components/team/bulk-upload-dialog';
import { appDb } from '@/services/data';

export default function TeamPage() {
  const { currentUser, isManager, isVp } = useCurrentUser();
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayedEmployees, setDisplayedEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    appDb.list<Employee>('employees').then((data) => {
      setEmployees(data);
    });
  }, []);

  useEffect(() => {
    if (employees.length > 0 && currentUser.id !== 'placeholder-user') {
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
  }, [employees, currentUser, isManager, isVp]);
    
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
    if (loading) {
      return (
         <Card>
           <CardHeader>
             <CardTitle>{getPageTitle()}</CardTitle>
             <CardDescription>
               Loading employee data...
             </CardDescription>
           </CardHeader>
           <CardContent>
             <p>Please wait...</p>
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

  return (
    <>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Team Management"
          description={getPageDescription()}
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <span>Add Employee</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <PlusCircle className="h-4 w-4" />
                  <span>Add Single Employee</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsBulkUploadOpen(true)}>
                  <Upload className="h-4 w-4" />
                  <span>Bulk Upload</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
        {renderContent()}
      </div>
      <BulkUploadDialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen} />
    </>
  );
}
