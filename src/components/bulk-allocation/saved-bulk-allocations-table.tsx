
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

type FteDoc = {
  content: { 
    bulk_allocation_id: string; 
    employee_name: string; 
    allocation_monthyear?: string;
  };
};

type SummaryDoc = {
  content: {
    bulk_allocation_id: string;
    cost_center_name: string;
    allocation_percentage: string;
    bulk_allocation_date: string;
  };
};

type ProcessedAllocation = {
  id: string;
  allocationDate: string;
  allocationMonthYear?: string;
  employees: string[];
  summaries: { name: string; percentage: string }[];
};

type SavedBulkAllocationsTableProps = {
  refreshKey: number;
};

export function SavedBulkAllocationsTable({ refreshKey }: SavedBulkAllocationsTableProps) {
  const [allocations, setAllocations] = useState<ProcessedAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [fteResponse, summaryResponse] = await Promise.all([
        fetch('/domo/datastores/v1/collections/bulk_allocation_fte/documents/'),
        fetch('/domo/datastores/v1/collections/bulk_allocation_summary/documents/'),
      ]);

      if (!fteResponse.ok || !summaryResponse.ok) {
        console.warn('Could not fetch bulk allocation data.');
      }

      const ftes: FteDoc[] = fteResponse.ok ? await fteResponse.json() : [];
      const summaries: SummaryDoc[] = summaryResponse.ok ? await summaryResponse.json() : [];

      const grouped = summaries.reduce((acc, summary) => {
        const { bulk_allocation_id, cost_center_name, allocation_percentage, bulk_allocation_date } = summary.content;
        
        if (!acc[bulk_allocation_id]) {
          acc[bulk_allocation_id] = {
            id: bulk_allocation_id,
            allocationDate: bulk_allocation_date,
            employees: [],
            summaries: [],
          };
        }
        acc[bulk_allocation_id].summaries.push({
          name: cost_center_name,
          percentage: allocation_percentage,
        });

        return acc;
      }, {} as Record<string, ProcessedAllocation>);

      ftes.forEach(fte => {
        const { bulk_allocation_id, employee_name, allocation_monthyear } = fte.content;
        if (grouped[bulk_allocation_id]) {
          grouped[bulk_allocation_id].employees.push(employee_name);
          if (allocation_monthyear && !grouped[bulk_allocation_id].allocationMonthYear) {
            grouped[bulk_allocation_id].allocationMonthYear = allocation_monthyear;
          }
        }
      });
      
      const processed = Object.values(grouped).sort((a, b) => new Date(b.allocationDate).getTime() - new Date(a.allocationDate).getTime());
      setAllocations(processed);

    } catch (error) {
      console.error('Error fetching bulk allocation data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to fetch saved allocations',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3 mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Bulk Allocation Profiles</CardTitle>
        <CardDescription>History of all saved bulk allocation profiles.</CardDescription>
      </CardHeader>
      <CardContent>
        {allocations.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            No bulk allocation profiles found.
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {allocations.map(alloc => (
              <AccordionItem value={alloc.id} key={alloc.id}>
                <AccordionTrigger>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="font-mono text-sm text-primary">{alloc.id.substring(0,8)}...</span>
                        {alloc.allocationMonthYear && <Badge>{alloc.allocationMonthYear}</Badge>}
                        <Badge variant="secondary">{alloc.employees.length} Employees</Badge>
                        <span className="text-sm text-muted-foreground hidden sm:inline">
                            Created: {new Date(alloc.allocationDate).toLocaleDateString()}
                        </span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/50 rounded-md">
                        <div>
                            <h4 className="font-semibold mb-2">Assigned Employees</h4>
                            <ScrollArea className="h-48">
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                {alloc.employees.map((emp, i) => <li key={i}>{emp}</li>)}
                                </ul>
                            </ScrollArea>
                        </div>
                        <div>
                             <h4 className="font-semibold mb-2">Cost Center Allocation</h4>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Cost Center</TableHead>
                                        <TableHead className="text-right">Percentage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {alloc.summaries.map((s, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{s.name}</TableCell>
                                            <TableCell className="text-right">{s.percentage}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                             </Table>
                        </div>
                    </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
