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
import { accounts, employees } from '@/lib/mock-data';
import { Download } from 'lucide-react';

export default function ReportingPage() {
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
        <TabsList>
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
                    <TableHead>Allocated FTEs</TableHead>
                    <TableHead>Employee Count</TableHead>
                    <TableHead>Variance vs. Forecast</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell>12.50</TableCell>
                      <TableCell>15</TableCell>
                      <TableCell className="text-green-600">+1.25</TableCell>
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
                    <TableHead>Total FTEs</TableHead>
                    <TableHead>Allocated FTEs</TableHead>
                    <TableHead>Unallocated FTEs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {['NAM', 'EMEA', 'HYD', 'Central'].map((region) => (
                     <TableRow key={region}>
                      <TableCell className="font-medium">{region}</TableCell>
                      <TableCell>350</TableCell>
                      <TableCell>340</TableCell>
                      <TableCell className="text-destructive">10</TableCell>
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
