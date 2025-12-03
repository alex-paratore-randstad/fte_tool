
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AiReportTable, AiReportData } from './ai-report-table';
import { Input } from '../ui/input';

type CostCenterData = { [key: string]: string };

export function CostCenterContent() {
  const [costCenters, setCostCenters] = useState<CostCenterData[]>([]);
  const [costCenterColumns, setCostCenterColumns] = useState<string[]>([]);
  const [aiReportData, setAiReportData] = useState<AiReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [costCenterFilter, setCostCenterFilter] = useState('');
  const { toast } = useToast();
  
  const filteredCostCenters = useMemo(() => {
    if (!costCenterFilter) return costCenters;
    const lowercasedFilter = costCenterFilter.toLowerCase();
    return costCenters.filter(cc => 
      Object.values(cc).some(val => val && val.toLowerCase().includes(lowercasedFilter))
    );
  }, [costCenters, costCenterFilter]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ccResponse, aiResponse] = await Promise.all([
          fetch(`/data/v1/gbs_ind_finance_cc_report`),
          fetch(`/data/v1/ai_report`),
        ]);

        if (!ccResponse.ok) {
          console.warn("Failed to fetch cost center data.");
        }
        if (!aiResponse.ok) {
          console.warn("Failed to fetch AI report data.");
        }
        
        const ccResult: CostCenterData[] = ccResponse.ok ? await ccResponse.json() : [];
        setCostCenters(ccResult);
        if (ccResult.length > 0) {
          setCostCenterColumns(Object.keys(ccResult[0]));
        }

        const aiResult: AiReportData[] = aiResponse.ok ? await aiResponse.json() : [];
        setAiReportData(aiResult);

      } catch (error) {
        console.error("Failed to fetch cost center data:", error);
         toast({
          variant: 'destructive',
          title: 'Failed to fetch page data',
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
        <div className="flex flex-col gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>All Cost Centers</CardTitle>
                    <CardDescription>
                        View all available cost centers from the live dataset.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Client Data</CardTitle>
                    <CardDescription>
                        Data from the `ai_report` dataset used to populate client dropdowns.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
      )
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>All Cost Centers</CardTitle>
          <CardDescription>
              View all available cost centers from the live dataset.
          </CardDescription>
          <div className="pt-2">
            <Input
              placeholder="Filter cost centers..."
              value={costCenterFilter}
              onChange={(e) => setCostCenterFilter(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    {costCenterColumns.map((column) => (
                      <TableHead key={column}>{column}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCostCenters.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {costCenterColumns.map((col) => (
                          <TableCell key={col}>{row[col]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                   {filteredCostCenters.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={costCenterColumns.length} className="h-24 text-center">
                            No results found.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
        </CardContent>
      </Card>
      <AiReportTable reportData={aiReportData} />
    </div>
  );
}
