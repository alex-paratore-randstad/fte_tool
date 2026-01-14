

'use client';

import { useState, useEffect, useCallback } from 'react';
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
    bulk_targets_id: string; 
    employee_name: string; 
    targets_monthyear?: string;
  };
};

type SummaryDoc = {
  id: string;
  content: {
    bulk_targets_id: string;
    cost_center_number: string;
    cost_center_name: string;
    targets_percentage: string;
    bulk_targets_date: string;
  };
};

type SummaryEntry = { 
  id: string;
  name: string;
  number: string;
  percentage: number;
};

type ProcessedTarget = {
  id: string;
  targetDate: string;
  targetMonthYear?: string;
  employees: string[];
  summaries: SummaryEntry[];
};

type SavedBulkTargetsTableProps = {
  refreshKey: number;
};

const parseEmployeeName = (compositeName: string): string => {
  if (compositeName.includes('] ')) {
    return compositeName.split('] ')[1];
  }
  return compositeName;
};

export function SavedBulkTargetsTable({ refreshKey }: SavedBulkTargetsTableProps) {
  const [originalTargets, setOriginalTargets] = useState<ProcessedTarget[]>([]);
  const [editableTargets, setEditableTargets] = useState<ProcessedTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [fteResponse, summaryResponse] = await Promise.all([
        fetch('/domo/datastores/v1/collections/bulk_targets_fte/documents/'),
        fetch('/domo/datastores/v1/collections/bulk_targets_summary/documents/'),
      ]);

      if (!fteResponse.ok || !summaryResponse.ok) {
        console.warn('Could not fetch bulk target data.');
      }

      const ftes: FteDoc[] = fteResponse.ok ? await fteResponse.json() : [];
      const summaries: SummaryDoc[] = summaryResponse.ok ? await summaryResponse.json() : [];

      const grouped = summaries.reduce((acc, summary) => {
        const { bulk_targets_id, cost_center_name, cost_center_number, targets_percentage, bulk_targets_date } = summary.content;
        
        if (!acc[bulk_targets_id]) {
          acc[bulk_targets_id] = {
            id: bulk_targets_id,
            targetDate: bulk_targets_date,
            employees: [],
            summaries: [],
          };
        }
        acc[bulk_targets_id].summaries.push({
          id: summary.id,
          name: cost_center_name,
          number: cost_center_number,
          percentage: Number(targets_percentage) || 0,
        });

        return acc;
      }, {} as Record<string, ProcessedTarget>);

      ftes.forEach(fte => {
        const { bulk_targets_id, employee_name, targets_monthyear } = fte.content;
        if (grouped[bulk_targets_id]) {
          grouped[bulk_targets_id].employees.push(employee_name);
          if (targets_monthyear && !grouped[bulk_targets_id].targetMonthYear) {
            grouped[bulk_targets_id].targetMonthYear = targets_monthyear;
          }
        }
      });
      
      const processed = Object.values(grouped).sort((a, b) => new Date(b.targetDate).getTime() - new Date(a.targetDate).getTime());
      
      setOriginalTargets(processed);
      setEditableTargets(JSON.parse(JSON.stringify(processed)));

    } catch (error) {
      console.error('Error fetching bulk target data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to fetch saved targets',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);
  
  const handlePercentageChange = (targetId: string, summaryId: string, newPercentage: string) => {
    setEditableTargets(prev => prev.map(target => {
      if (target.id === targetId) {
        const updatedSummaries = target.summaries.map(summary => {
          if (summary.id === summaryId) {
            return { ...summary, percentage: Number(newPercentage) };
          }
          return summary;
        });
        return { ...target, summaries: updatedSummaries };
      }
      return target;
    }));
  };

  const handleSaveChanges = async (targetId: string) => {
    setIsSaving(prev => ({...prev, [targetId]: true}));

    const editableTarget = editableTargets.find(a => a.id === targetId);
    const originalTarget = originalTargets.find(a => a.id === targetId);

    if (!editableTarget || !originalTarget) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find target to save.' });
      setIsSaving(prev => ({...prev, [targetId]: false}));
      return;
    }

    const totalPercentage = editableTarget.summaries.reduce((sum, s) => sum + s.percentage, 0);
    if (Math.round(totalPercentage) !== 100) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Total target must be exactly 100%.' });
      setIsSaving(prev => ({...prev, [targetId]: false}));
      return;
    }

    const updates = editableTarget.summaries
      .filter((summary) => {
        const originalSummary = originalTarget.summaries.find(s => s.id === summary.id);
        return originalSummary && summary.percentage !== originalSummary.percentage;
      })
      .map(summary => ({
          docId: summary.id,
          content: {
              bulk_targets_id: targetId,
              cost_center_number: summary.number,
              cost_center_name: summary.name,
              targets_percentage: summary.percentage.toString(),
              bulk_targets_date: editableTarget.targetDate
          }
      }));

    if (updates.length === 0) {
        toast({ title: 'No changes to save.' });
        setIsSaving(prev => ({...prev, [targetId]: false}));
        return;
    }

    try {
        await Promise.all(updates.map(update =>
            fetch(`/domo/datastores/v1/collections/bulk_targets_summary/documents/${update.docId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: update.content }),
            }).then(res => {
                if (!res.ok) throw new Error(`Failed to update target for ${update.content.cost_center_name}`);
                return res.json();
            })
        ));
        toast({ title: 'Success', description: `${updates.length} target(s) updated for profile ${targetId.substring(0,8)}.` });
        fetchData(); // Refresh data
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
        setIsSaving(prev => ({...prev, [targetId]: false}));
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
        <CardTitle>Saved Bulk Target Profiles</CardTitle>
        <CardDescription>History of all saved bulk target profiles. You can edit percentages here.</CardDescription>
      </CardHeader>
      <CardContent>
        {editableTargets.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            No bulk target profiles found.
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {editableTargets.map(target => {
                const totalPercentage = target.summaries.reduce((sum, s) => sum + s.percentage, 0);
                const isProfileSaving = isSaving[target.id];
              return (
              <AccordionItem value={target.id} key={target.id}>
                <AccordionTrigger>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="font-mono text-sm text-primary">{target.id.substring(0,8)}...</span>
                        {target.targetMonthYear && <Badge>{target.targetMonthYear}</Badge>}
                        <Badge variant="secondary">{target.employees.length} Employees</Badge>
                        <span className="text-sm text-muted-foreground hidden sm:inline">
                            Created: {new Date(target.targetDate).toLocaleDateString()}
                        </span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/50 rounded-md">
                        <div>
                            <h4 className="font-semibold mb-2">Assigned Employees</h4>
                            <ScrollArea className="h-48">
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                {target.employees.map((emp, i) => <li key={i}>{parseEmployeeName(emp)}</li>)}
                                </ul>
                            </ScrollArea>
                        </div>
                        <div>
                             <h4 className="font-semibold mb-2">Client Target</h4>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Client</TableHead>
                                        <TableHead className="text-right w-32">Percentage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {target.summaries.map(s => (
                                        <TableRow key={s.id}>
                                            <TableCell>{s.name}</TableCell>
                                            <TableCell className="text-right">
                                              <Input 
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={s.percentage}
                                                onChange={(e) => handlePercentageChange(target.id, s.id, e.target.value)}
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
                                    Total Target: <span className="font-bold">{totalPercentage}%</span>
                                    {Math.round(totalPercentage) !== 100 && " (Must equal 100%)"}
                                    </AlertDescription>
                                </Alert>
                                <Button onClick={() => handleSaveChanges(target.id)} disabled={isProfileSaving || Math.round(totalPercentage) !== 100}>
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
