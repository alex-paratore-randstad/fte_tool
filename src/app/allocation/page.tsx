import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { Calendar, ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';

export default function AllocationPage() {
  const weekEnding = 'Sunday, July 28, 2024';

  const getEmployeeAllocation = (employeeId: string) => {
    return allocations.find((a) => a.employeeId === employeeId) || { allocations: [] };
  };

  const calculateTotalFte = (employeeId: string) => {
    const allocation = getEmployeeAllocation(employeeId);
    return allocation.allocations.reduce((sum, alloc) => sum + alloc.fte, 0);
  };
  
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Weekly Allocation"
        description={`Enter FTE allocations for the week ending ${weekEnding}.`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span>{weekEnding}</span>
            </Button>
            <Button variant="outline" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button>Save Allocations</Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Core Platform Team</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                {accounts.map((acc) => (
                  <TableHead key={acc.id} className="text-center">
                    {acc.name}
                  </TableHead>
                ))}
                <TableHead className="text-right">Total FTE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.filter(e => e.team === 'Core Platform').map((emp) => {
                const totalFte = calculateTotalFte(emp.id);
                return (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-sm text-muted-foreground">{emp.title}</div>
                    </TableCell>
                    {accounts.map((acc) => {
                      const allocation = getEmployeeAllocation(emp.id).allocations.find(a => a.accountId === acc.id);
                      return (
                        <TableCell key={acc.id} className="w-32">
                          <Input
                            type="number"
                            step="0.05"
                            min="0"
                            max="1"
                            defaultValue={allocation?.fte || 0}
                            className="text-center"
                          />
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right">
                      <div className={cn(
                        "flex items-center justify-end gap-2 font-semibold",
                        totalFte === 1 ? "text-green-600" : "text-destructive"
                      )}>
                        {totalFte === 1 ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {totalFte.toFixed(2)}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
