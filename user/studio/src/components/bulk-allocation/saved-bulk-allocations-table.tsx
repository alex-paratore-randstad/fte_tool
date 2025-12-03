
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
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';

type FteDoc = {
  id: string;
  content: { 
    bulk_allocation_id: string; 
    employee_name: string; 
    allocation_monthyear?: string;
  };
};

type SummaryDoc = {
  id: string;
  content: {
    bulk_allocation_id: string;
    cost_center_number: string;
    cost_center_name: string;
    allocation_percentage: string;
    bulk_allocation_date: string;
  };
};

type SummaryEntry = { 
  id: string;
  name: string;
  number: string;
  percentage: number;
};

type ProcessedAllocation = {
  id: string;
  allocationDate: string;
  allocationMonthYear?: string;
  employees: string[];
  summaries: SummaryEntry[];
};

type SavedBulkAllocationsTableProps = {
  refreshKey: number;
};

export function SavedBulkAllocationsTable({ refreshKey }: SavedBulkAllocationsTableProps) {
  const [originalAllocations, setOriginalAllocations] = useState<ProcessedAllocation[]>([]);
  const [editableAllocations, setEditableAllocations] = useState<ProcessedAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
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
        const { bulk_allocation_id, cost_center_name, cost_center_number, allocation_percentage, bulk_allocation_date } = summary.content;
        
        if (!acc[bulk_allocation_id]) {
          acc[bulk_allocation_id] = {
            id: bulk_allocation_id,
            allocationDate: bulk_allocation_date,
            employees: [],
            summaries: [],
          };
        }
        acc[bulk_allocation_id].summaries.push({
          id: summary.id,
          name: cost_center_name,
          number: cost_center_number,
          percentage: Number(allocation_percentage) || 0,
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
      
      setOriginalAllocations(processed);
      setEditableAllocations(JSON.parse(JSON.stringify(processed)));

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
  
  const handlePercentageChange = (allocId: string, summaryId: string, newPercentage: string) => {
    setEditableAllocations(prev => prev.map(alloc => {
      if (alloc.id === allocId) {
        const updatedSummaries = alloc.summaries.map(summary => {
          if (summary.id === summaryId) {
            return { ...summary, percentage: Number(newPercentage) };
          }
          return summary;
        });
        return { ...alloc, summaries: updatedSummaries };
      }
      return alloc;
    }));
  };

  const handleSaveChanges = async (allocId: string) => {
    setIsSaving(prev => ({...prev, [allocId]: true}));

    const editableAlloc = editableAllocations.find(a => a.id === allocId);
    const originalAlloc = originalAllocations.find(a => a.id === allocId);

    if (!editableAlloc || !originalAlloc) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find allocation to save.' });
      setIsSaving(prev => ({...prev, [allocId]: false}));
      return;
    }

    const totalPercentage = editableAlloc.summaries.reduce((sum, s) => sum + s.percentage, 0);
    const roundedTotal = Math.round(totalPercentage);

    if (roundedTotal !== 100) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Total allocation must be exactly 100%.' });
      setIsSaving(prev => ({...prev, [allocId]: false}));
      return;
    }

    const updates = editableAlloc.summaries
      .filter((summary) => {
        const originalSummary = originalAlloc.summaries.find(s => s.id === summary.id);
        return originalSummary && summary.percentage !== originalSummary.percentage;
      })
      .map(summary => ({
          docId: summary.id,
          content: {
              bulk_allocation_id: allocId,
              cost_center_number: summary.number,
              cost_center_name: summary.name,
              allocation_percentage: summary.percentage.toString(),
              bulk_allocation_date: editableAlloc.allocationDate,
          }
      }));

    if (updates.length === 0) {
        toast({ title: 'No changes to save.' });
        setIsSaving(prev => ({...prev, [allocId]: false}));
        return;
    }

    try {
        await Promise.all(updates.map(update =>
            fetch(`/domo/datastores/v1/collections/bulk_allocation_summary/documents/${update.docId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: update.content }),
            }).then(res => {
                if (!res.ok) throw new Error(`Failed to update allocation for ${update.content.cost_center_name}`);
                return res.json();
            })
        ));
        toast({ title: 'Success', description: `${updates.length} allocation(s) updated for profile ${allocId.substring(0,8)}.` });
        fetchData(); // Refresh data
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
        setIsSaving(prev => ({...prev, [allocId]: false}));
    }
  };


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
        <CardDescription>History of all saved bulk allocation profiles. You can edit percentages here.</CardDescription>
      </CardHeader>
      <CardContent>
        {editableAllocations.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            No bulk allocation profiles found.
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {editableAllocations.map(alloc => {
                const totalPercentage = alloc.summaries.reduce((sum, s) => sum + s.percentage, 0);
                const isProfileSaving = isSaving[alloc.id];
              return (
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
                             <h4 className="font-semibold mb-2">Client Allocation</h4>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Client</TableHead>
                                        <TableHead className="text-right w-32">Percentage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {alloc.summaries.map(s => (
                                        <TableRow key={s.id}>
                                            <TableCell>{s.name}</TableCell>
                                            <TableCell className="text-right">
                                              <Input 
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={s.percentage}
                                                onChange={(e) => handlePercentageChange(alloc.id, s.id, e.target.value)}
                                                className="w-24 text-center ml-auto"
                                                placeholder="%"
                                                disabled={isProfileSaving}
                                              />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                             </Table>
                             <div className="mt-4 space-y-2">
                                <Alert variant={Math.round(totalPercentage) !== 100 ? 'destructive' : 'default'}>
                                    <AlertDescription>
                                    Total Allocation: <span className="font-bold">{totalPercentage}%</span>
                                    {Math.round(totalPercentage) !== 100 && " (Must equal 100%)"}
                                    </AlertDescription>
                                </Alert>
                                <Button onClick={() => handleSaveChanges(alloc.id)} disabled={isProfileSaving || Math.round(totalPercentage) !== 100}>
                                    {isProfileSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                             </div>
                        </div>
                    </div>
                </AccordionContent>
              </AccordionItem>
            )})}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
