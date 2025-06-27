'use client';

import { useState } from 'react';
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
import { employees } from '@/lib/mock-data';
import { PlusCircle, MoreHorizontal, ChevronDown, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BulkUploadDialog } from '@/components/team/bulk-upload-dialog';

export default function TeamPage() {
  const { currentUser, isManager } = useCurrentUser();
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Admins see all employees, managers see their direct reports.
  const displayedEmployees = isManager
    ? employees.filter((employee) => employee.manager === currentUser.name)
    : employees;

  return (
    <>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Team Management"
          description={
            isManager
              ? 'View and manage your direct reports.'
              : 'View and manage all GBS personnel.'
          }
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
        <Card>
          <CardHeader>
            <CardTitle>{isManager ? 'My Team' : 'All Personnel'}</CardTitle>
            <CardDescription>
              {isManager
                ? 'A list of your direct reports.'
                : 'A list of all employees in the GBS organization.'}
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
      </div>
      <BulkUploadDialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen} />
    </>
  );
}
