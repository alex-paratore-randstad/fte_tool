
'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { WeeklyTarget } from '@/types';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { writeLog } from '@/lib/logger';

const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
const getQuarterStartDate = (year: number, quarter: string) => {
    const quarterMonth = (parseInt(quarter.substring(1)) - 1) * 3 + 1;
    return `${year}-${quarterMonth.toString().padStart(2, '0')}-01`;
}

type TargetValue = {
  hires: number;
  docId: string | null;
};

type TargetRow = {
  clientId: string;
  clientName: string;
  quarterlyTargets: { [quarterKey: string]: TargetValue };
};

type EmployeeTarget = {
  employeeName: string;
  targets: TargetRow[];
};

type QuarterlyTargetTableProps = {
  currentYear: number;
  refreshKey: number;
};

const parseEmployeeName = (compositeName: string): string => {
  if (compositeName.includes('] ')) return compositeName.split('] ')[1];
  return compositeName;
};

export function QuarterlyTargetTable({ currentYear, refreshKey }: QuarterlyTargetTableProps) {
  const [originalTargets, setOriginalTargets] = useState<EmployeeTarget[]>([]);
  const [editableTargets, setEditableTargets] = useState<EmployeeTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [hasMounted, setHasMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  const filteredTargets = useMemo(() => {
    if (!nameFilter) return editableTargets;
    return editableTargets.filter(alloc => 
      parseEmployeeName(alloc.employeeName).toLowerCase().includes(nameFilter.toLowerCase())
    );
  }, [editableTargets, nameFilter]);

  const fetchData = useCallback(async () => {
    if (!currentYear) return;
    setIsLoading(true);
    try {
      const quarterDates = quarters.map(q => getQuarterStartDate(currentYear, q));
      const requests = quarterDates.map(date => fetch(`/domo/datastores/v1/collections/weekly_targets/documents?q=content.targets_allocation_date='${date}'`));
      const responses = await Promise.all(requests);
      const allYearlyTargets: WeeklyTarget[] = (await Promise.all(responses.map(res => res.ok ? res.json() : []))).flat();
      
      const groupedByEmployee = allYearlyTargets.reduce((acc, current) => {
        const { targets_allocation_name, targets_cost_center_number, targets_cost_center_name, targets_allocation_date, targets_allocation_amount } = current.content;
        
        if (!acc[targets_allocation_name]) acc[targets_allocation_name] = {};
        if (!acc[targets_allocation_name][targets_cost_center_number]) {
            acc[targets_allocation_name][targets_cost_center_number] = { clientId: targets_cost_center_number, clientName: targets_cost_center_name, quarterlyTargets: {} };
        }
        
        const date = new Date(targets_allocation_date);
        const quarterIndex = Math.floor(date.getUTCMonth() / 3);
        const quarterKey = quarters[quarterIndex];
        
        acc[targets_allocation_name][targets_cost_center_number].quarterlyTargets[quarterKey] = {
          hires: parseInt(targets_allocation_amount, 10) || 0,
          docId: current.id,
        };
        return acc;
      }, {} as Record<string, Record<string, TargetRow>>);

      const structuredTargets: EmployeeTarget[] = Object.entries(groupedByEmployee).map(([employeeName, clientGroup]) => ({
        employeeName,
        targets: Object.values(clientGroup),
      }));

      setOriginalTargets(structuredTargets);
      setEditableTargets(JSON.parse(JSON.stringify(structuredTargets)));
    } catch (error) {
      writeLog('QuarterlyTargetTable', 'error', 'Error fetching target data', error);
      toast({ variant: 'destructive', title: 'Failed to fetch target data' });
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, toast]);
  
  useEffect(() => {
    fetchData();
  }, [currentYear, fetchData, refreshKey]);

  const handleTargetChange = (employeeName: string, clientId: string, quarter: string, value: string) => {
    const newTarget = parseInt(value, 10) || 0;
    setEditableTargets(prev => prev.map(emp => (emp.employeeName === employeeName ? {
      ...emp, targets: emp.targets.map(row => (row.clientId === clientId ? {
        ...row, quarterlyTargets: { ...row.quarterlyTargets, [quarter]: { ...row.quarterlyTargets[quarter], hires: newTarget } }
      } : row))
    } : emp)));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const updates = [];

    for (const emp of editableTargets) {
      for (const row of emp.targets) {
        for (const q of quarters) {
          const editable = row.quarterlyTargets[q];
          const originalEmp = originalTargets.find(e => e.employeeName === emp.employeeName);
          const originalRow = originalEmp?.targets.find(r => r.clientId === row.clientId);
          const original = originalRow?.quarterlyTargets[q];
          
          if (editable?.docId && original && editable.hires !== original.hires) {
            updates.push({ docId: editable.docId, content: {
              targets_allocation_date: getQuarterStartDate(currentYear, q),
              targets_allocation_name: emp.employeeName,
              targets_cost_center_name: row.clientName,
              targets_cost_center_number: row.clientId,
              targets_allocation_amount: (editable.hires || 0).toString(),
            }});
          }
        }
      }
    }

    if (updates.length === 0) { toast({ title: 'No changes to save.' }); setIsSaving(false); return; }

    try {
      await Promise.all(updates.map(update =>
        fetch(`/domo/datastores/v1/collections/weekly_targets/documents/${update.docId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: update.content }),
        }).then(res => { if (!res.ok) throw new Error(`Failed to update target for ${parseEmployeeName(update.content.targets_allocation_name)}`) })
      ));
      toast({ title: 'Success', description: `${updates.length} target(s) updated.` });
      writeLog('QuarterlyTargetTable', 'success', 'Saved target changes', { count: updates.length });
      fetchData();
    } catch (error: any) {
      writeLog('QuarterlyTargetTable', 'error', 'Failed to save target changes', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle>Saved Quarterly Targets for {currentYear}</CardTitle>
              <CardDescription>Records from the quarterly_targets collection. You can edit values and save.</CardDescription>
            </div>
            <Button onClick={handleSaveChanges} disabled={isSaving || isLoading}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
        </div>
         <div className="pt-4">
          <Input placeholder="Filter by employee name..." value={nameFilter} onChange={e => setNameFilter(e.target.value)} className="max-w-sm" disabled={isLoading} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="min-w-[200px] sticky left-0 bg-card z-10">Employee / Client</TableHead>
                    {quarters.map(q => <TableHead key={q} className="text-center min-w-[120px]">{q}</TableHead>)}
                </TableRow>
            </TableHeader>
            <TableBody>
                {!hasMounted || isLoading ? (
                  <TableRow><TableCell colSpan={5}><div className="space-y-4 py-8"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div></TableCell></TableRow>
                ) : filteredTargets.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">{nameFilter ? 'No matching employees.' : 'No saved target data for this year.'}</TableCell></TableRow>
                ) : (
                    filteredTargets.map(({ employeeName, targets: empTargets }) => (
                            <Fragment key={employeeName}>
                                <TableRow className="bg-muted/50 hover:bg-muted">
                                    <TableCell className="font-semibold sticky left-0 bg-muted/50 z-10">{parseEmployeeName(employeeName)}</TableCell>
                                    {quarters.map(q => <TableCell key={q} className="text-center font-semibold text-muted-foreground">{empTargets.reduce((total, row) => total + (row.quarterlyTargets[q]?.hires || 0), 0) || '-'}</TableCell>)}
                                </TableRow>
                                {empTargets.map(row => (
                                    <TableRow key={`${employeeName}-${row.clientId}`}>
                                        <TableCell className="sticky left-0 bg-card z-10 pl-8">{row.clientName}</TableCell>
                                        {quarters.map(q => (
                                            <TableCell key={q} className="text-center">
                                                {row.quarterlyTargets[q] ? (
                                                    <Input type="number" step="1" min="0" placeholder="0" className="w-20 text-center mx-auto"
                                                      value={row.quarterlyTargets[q]?.hires || ''}
                                                      onChange={e => handleTargetChange(employeeName, row.clientId, q, e.target.value)}
                                                      disabled={isSaving}
                                                    />
                                                ) : <div className="w-20 text-center mx-auto text-muted-foreground">-</div>}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </Fragment>
                        )))}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
