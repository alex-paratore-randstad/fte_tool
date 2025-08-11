
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { Employee, CostCenter, Allocation } from '@/types';

declare var domo: any;

type ProcessedCostCenter = CostCenter & {
    totalFte: number;
    employeeCount: number;
    variance: number;
};

type ProcessedLeader = {
    name: string;
    team: string;
    teamSize: number;
    totalFte: number;
    avgFte: number;
}

type ProcessedRegion = {
    name: string;
    totalEmployees: number;
    allocatedFte: number;
    unallocatedFte: number;
}

type ProcessedIndividual = Employee & {
    totalFte: number;
}

const fteTrendData = [
  { month: 'Jan', projectAlpha: 150, projectBravo: 120, projectCharlie: 80 },
  { month: 'Feb', projectAlpha: 160, projectBravo: 130, projectCharlie: 85 },
  { month: 'Mar', projectAlpha: 170, projectBravo: 135, projectCharlie: 90 },
  { month: 'Apr', projectAlpha: 165, projectBravo: 140, projectCharlie: 95 },
  { month: 'May', projectAlpha: 180, projectBravo: 145, projectCharlie: 100 },
  { month: 'Jun', projectAlpha: 185, projectBravo: 150, projectCharlie: 105 },
];

const trendChartConfig = {
  projectAlpha: { label: 'Project Alpha', color: 'hsl(var(--chart-1))' },
  projectBravo: { label: 'Project Bravo', color: 'hsl(var(--chart-2))' },
  projectCharlie: { label: 'Project Charlie', color: 'hsl(var(--chart-3))' },
} satisfies ChartConfig;


export default function ReportingPage() {
  const [costCenterData, setCostCenterData] = useState<ProcessedCostCenter[]>([]);
  const [leaderData, setLeaderData] = useState<ProcessedLeader[]>([]);
  const [regionData, setRegionData] = useState<ProcessedRegion[]>([]);
  const [individualData, setIndividualData] = useState<ProcessedIndividual[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ccResult, empResult, allocResult] = await Promise.all([
          domo.get(`/domo/datastores/v1/collections/cost-centers/documents/`),
          domo.get(`/domo/datastores/v1/collections/employees/documents/`),
          domo.get(`/domo/datastores/v1/collections/allocations/documents/`),
        ]);

        const ccData: CostCenter[] = ccResult.map((r: any) => ({ ...r.content, id: r.id }));
        const empData: Employee[] = empResult.map((r: any) => ({ ...r.content, id: r.id }));
        const allocData: Allocation[] = allocResult.map((r: any) => ({ ...r.content, id: r.id }));


        // Process cost center data
        const processedCostCenters = ccData.map((costCenter) => {
          const ccAllocations = allocData.flatMap((a) =>
            a.allocations.filter((alloc) => alloc.costCenterId === costCenter.id)
          );
          const totalFte = ccAllocations.reduce((sum, alloc) => sum + alloc.fte, 0);
          const employeeIds = new Set(
            allocData
              .filter((a) => a.allocations.some((alloc) => alloc.costCenterId === costCenter.id))
              .map((a) => a.employeeId)
          );
          const variance = (Math.random() * 2 - 1); 
          return {
            ...costCenter,
            totalFte: totalFte,
            employeeCount: employeeIds.size,
            variance: variance,
          };
        });
        setCostCenterData(processedCostCenters);

        // Process leader data
        const managers = [...new Set(empData.map((e) => e.manager))].filter(m => m !== 'N/A' && m);
        const processedLeaders = managers.map((manager) => {
          const reports = empData.filter((e) => e.manager === manager);
          const reportIds = new Set(reports.map((r) => r.id));
          let totalFte = 0;
          allocData.forEach((alloc) => {
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
        setLeaderData(processedLeaders);

        // Process region data
        const regionNames = [...new Set(empData.map(e => e.region))];
        const processedRegions = regionNames.map((region) => {
          const employeesInRegion = empData.filter((e) => e.region === region);
          const employeeIdsInRegion = new Set(employeesInRegion.map((e) => e.id));
          let allocatedFte = 0;
          allocData.forEach((alloc) => {
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
        setRegionData(processedRegions);

        // Process individual data
        const processedIndividuals = empData.map((employee) => {
          const allocation = allocData.find((a) => a.employeeId === employee.id);
          const totalFte = allocation
            ? allocation.allocations.reduce((sum, alloc) => sum + alloc.fte, 0)
            : 0;
          return {
            ...employee,
            totalFte: totalFte,
          };
        });
        setIndividualData(processedIndividuals);

      } catch (error) {
        console.error("Failed to fetch reporting data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (typeof domo !== 'undefined') {
        fetchData();
    } else {
        setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          title="FTE Reports"
          description="Analyze FTE utilization across different dimensions."
        />
        <Card>
            <CardHeader>
                <CardTitle>Loading Reports</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Please wait while we fetch the latest data...</p>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
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

        <Tabs defaultValue="cost-center">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="cost-center">By Cost Center</TabsTrigger>
            <TabsTrigger value="leader">By Leader</TabsTrigger>
            <TabsTrigger value="region">By Region</TabsTrigger>
            <TabsTrigger value="individual">By Individual</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="cost-center" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>FTE Utilization by Cost Center</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cost Center</TableHead>
                      <TableHead className="text-right">Allocated FTEs</TableHead>
                      <TableHead className="text-right">Employee Count</TableHead>
                      <TableHead className="text-right">Variance vs. Forecast</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costCenterData.map((cc) => (
                      <TableRow key={cc.id}>
                        <TableCell className="font-medium">{cc.name}</TableCell>
                        <TableCell className="text-right">{cc.totalFte.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{cc.employeeCount}</TableCell>
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={cn({
                                  'text-green-600': cc.variance > 0,
                                  'text-destructive': cc.variance < 0,
                                })}
                              >
                                {cc.variance.toFixed(2)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {cc.variance > 0
                                  ? 'Allocations are over forecast.'
                                  : 'Allocations are under forecast.'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
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
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={cn({
                                  'text-destructive': region.unallocatedFte > 0.1,
                                  'text-green-600': region.unallocatedFte < -0.1,
                                })}
                              >
                                {region.unallocatedFte.toFixed(2)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {region.unallocatedFte > 0
                                  ? 'Potential FTE is unallocated for this region.'
                                  : 'Region is over-allocated.'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
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
                        <TableCell className="text-right">
                          {employee.totalFte !== 1 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    'flex items-center justify-end gap-2 font-semibold',
                                    'text-destructive'
                                  )}
                                >
                                  <AlertCircle className="h-4 w-4" />
                                  {employee.totalFte.toFixed(2)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {employee.totalFte > 1
                                    ? 'Total FTE is over-allocated.'
                                    : 'Total FTE is under-allocated.'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div
                              className={cn(
                                'flex items-center justify-end gap-2 font-semibold',
                                'text-green-600'
                              )}
                            >
                              <CheckCircle className="h-4 w-4" />
                              {employee.totalFte.toFixed(2)}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="trends" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>FTE Trends by Cost Center</CardTitle>
                <CardDescription>Monthly FTE allocation trends for top cost centers.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={trendChartConfig} className="h-[400px] w-full">
                  <ResponsiveContainer>
                    <BarChart data={fteTrendData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                      <XAxis
                        dataKey="month"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                      />
                      <RechartsTooltip
                        cursor={{ fill: 'hsl(var(--secondary))' }}
                        content={<ChartTooltipContent />}
                      />
                      <Legend content={<ChartLegendContent />} />
                      {Object.keys(trendChartConfig).map((key) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          stackId="a"
                          fill={`var(--color-${key})`}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
