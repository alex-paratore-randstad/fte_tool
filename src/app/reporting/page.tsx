import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { accounts, employees, allocations } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ReportingPage() {
  // Data processing for "By Account" tab
  const accountData = accounts.map((account) => {
    const accountAllocations = allocations.flatMap((a) =>
      a.allocations.filter((alloc) => alloc.accountId === account.id)
    );
    const totalFte = accountAllocations.reduce((sum, alloc) => sum + alloc.fte, 0);
    const employeeIds = new Set(
      allocations
        .filter((a) => a.allocations.some((alloc) => alloc.accountId === account.id))
        .map((a) => a.employeeId)
    );
    // Placeholder for variance calculation
    const variance = (Math.random() * 2 - 1); 
    return {
      ...account,
      totalFte: totalFte,
      employeeCount: employeeIds.size,
      variance: variance,
    };
  });

  // Data processing for "By Leader" tab
  const managers = [...new Set(employees.map((e) => e.manager))].filter(m => m !== 'N/A' && m);
  const leaderData = managers.map((manager) => {
    const reports = employees.filter((e) => e.manager === manager);
    const reportIds = new Set(reports.map((r) => r.id));
    let totalFte = 0;
    allocations.forEach((alloc) => {
      if (reportIds.has(alloc.employeeId)) {
        totalFte += alloc.allocations.reduce((sum, item) => sum + item.fte, 0);
      }
    });
    return {
      name: manager,
      team: reports[0]?.team || 'N/A',
      teamSize: reports.length,
      totalFte: totalFte,
      avgFte: reports.length > 0 ? totalFte / reports.length : 0,
    };
  });

  // Data processing for "By Region" tab
  const regionNames = [...new Set(employees.map(e => e.region))];
  const regionData = regionNames.map((region) => {
    const employeesInRegion = employees.filter((e) => e.region === region);
    const employeeIdsInRegion = new Set(employeesInRegion.map((e) => e.id));
    let allocatedFte = 0;
    allocations.forEach((alloc) => {
      if (employeeIdsInRegion.has(alloc.employeeId)) {
        allocatedFte += alloc.allocations.reduce((sum, item) => sum + item.fte, 0);
      }
    });
    const totalPossibleFte = employeesInRegion.length;
    return {
      name: region,
      totalEmployees: employeesInRegion.length,
      allocatedFte: allocatedFte,
      unallocatedFte: totalPossibleFte - allocatedFte,
    };
  });

  // Data processing for "By Individual" tab
  const individualData = employees.map((employee) => {
    const allocation = allocations.find((a) => a.employeeId === employee.id);
    const totalFte = allocation
      ? allocation.allocations.reduce((sum, alloc) => sum + alloc.fte, 0)
      : 0;
    return {
      ...employee,
      totalFte: totalFte,
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="FTE Reports"
        description="Analyze FTE utilization across different dimensions."
        actions={
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export All
          </Button>
        }
      />

      <Tabs defaultValue="account">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="account">By Account</TabsTrigger>
          <TabsTrigger value="leader">By Leader</TabsTrigger>
          <TabsTrigger value="region">By Region</TabsTrigger>
          <TabsTrigger value="individual">By Individual</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>FTE Utilization by Account</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Allocated FTEs</TableHead>
                    <TableHead className="text-right">Employee Count</TableHead>
                    <TableHead className="text-right">Variance vs. Forecast</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountData.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell className="text-right">{account.totalFte.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{account.employeeCount}</TableCell>
                      <TableCell
                        className={cn('text-right', {
                          'text-green-600': account.variance > 0,
                          'text-destructive': account.variance < 0,
                        })}
                      >
                        {account.variance.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leader" className="mt-4">
           <Card>
            <CardHeader>
              <CardTitle>FTE Utilization by Leader</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leader</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Team Size</TableHead>
                    <TableHead className="text-right">Total Allocated FTE</TableHead>
                    <TableHead className="text-right">Avg. Allocation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderData.map((leader) => (
                     <TableRow key={leader.name}>
                      <TableCell className="font-medium">{leader.name}</TableCell>
                      <TableCell>{leader.team}</TableCell>
                      <TableCell className="text-right">{leader.teamSize}</TableCell>
                      <TableCell className="text-right">{leader.totalFte.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{leader.avgFte.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="region" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>FTE Utilization by Region</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead className="text-right">Total Employees</TableHead>
                    <TableHead className="text-right">Allocated FTEs</TableHead>
                    <TableHead className="text-right">Unallocated Potential FTE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regionData.map((region) => (
                    <TableRow key={region.name}>
                      <TableCell className="font-medium">{region.name}</TableCell>
                      <TableCell className="text-right">{region.totalEmployees}</TableCell>
                      <TableCell className="text-right">{region.allocatedFte.toFixed(2)}</TableCell>
                      <TableCell
                        className={cn('text-right', {
                          'text-destructive': region.unallocatedFte > 0.1,
                          'text-green-600': region.unallocatedFte < -0.1,
                        })}
                      >
                        {/* A positive number means unallocated, negative means over-allocated */}
                        {region.unallocatedFte.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="mt-4">
           <Card>
            <CardHeader>
              <CardTitle>FTE Utilization by Individual</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead className="text-right">Total Allocated FTE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {individualData.map((employee) => (
                     <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.title}</TableCell>
                      <TableCell>{employee.team}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.region}</Badge>
                      </TableCell>
                      <TableCell
                        className={cn('text-right font-semibold', {
                          'text-green-600': employee.totalFte === 1,
                          'text-destructive': employee.totalFte !== 1,
                        })}
                      >
                        {employee.totalFte.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
