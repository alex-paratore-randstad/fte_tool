
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
import { Copy, Trash2, PlusCircle, X, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SelectSearch } from '../ui/select-search';
import type { TeamMember, SummaryEntry, EmployeeEntry } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type AiReportData = {
    Code: string;
    Name: string;
    DisplayName: string;
    RollsUpTo: string;
    Region?: string;
    Country?: string;
};

type FteDoc = {
  id: string;
  content: { 
    bulk_allocation_id: string; 
    employee_id: string;
    employee_name: string; 
    allocation_monthyear?: string;
    bulk_allocation_date: string;
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
    allocation_group?: string;
  };
};

type ProcessedAllocation = {
  id: string; 
  allocationDate: string;
  allocationMonthYear?: string;
  allocationGroup?: string;
  employees: EmployeeEntry[];
  summaries: SummaryEntry[];
};

type SavedBulkAllocationsTableProps = {
  refreshKey: number;
  onCopyTemplate: (summaries: SummaryEntry[]) => void;
};

const ClientSelect = ({
  clients,
  value,
  onValueChange,
  disabled,
}: {
  clients: AiReportData[],
  value: string,
  onValueChange: (value: string) => void,
  disabled?: boolean;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredClients = useMemo(() => {
    const sorted = [...(clients || [])].sort((a, b) => (a.DisplayName || '').localeCompare(b.DisplayName || ''));
    if (!searchTerm) return sorted;
    return sorted.filter(c => c.DisplayName?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [clients, searchTerm]);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger><SelectValue placeholder="Select Client..." /></SelectTrigger>
      <SelectContent>
          <SelectSearch placeholder="Search client..." onChange={setSearchTerm} />
          <ScrollArea className="h-64">
            {filteredClients.map(c => <SelectItem key={c.Code} value={c.DisplayName}>{c.DisplayName}</SelectItem>)}
          </ScrollArea>
      </SelectContent>
    </Select>
  );
};

const EmployeeSelect = ({
    employees,
    onValueChange,
    disabled
}: {
    employees: TeamMember[],
    onValueChange: (id: string) => void,
    disabled?: boolean
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filtered = useMemo(() => {
        const sorted = [...(employees || [])].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
        if (!searchTerm) return sorted;
        return sorted.filter(e => e.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [employees, searchTerm]);

    return (
        <Select onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Add employee..." />
            </SelectTrigger>
            <SelectContent>
                <SelectSearch placeholder="Search name..." onChange={setSearchTerm} />
                <ScrollArea className="h-64">
                    {filtered.map(e => <SelectItem key={e.person_id} value={e.person_id}>{e.full_name}</SelectItem>)}
                </ScrollArea>
            </SelectContent>
        </Select>
    );
};

export function SavedBulkAllocationsTable({ refreshKey, onCopyTemplate }: SavedBulkAllocationsTableProps) {
  const [originalAllocations, setOriginalAllocations] = useState<ProcessedAllocation[]>([]);
  const [editableAllocations, setEditableAllocations] = useState<ProcessedAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  
  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);
  const [allClients, setAllClients] = useState<AiReportData[]>([]);

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [fteResponse, summaryResponse, metaEmpResponse, metaClientResponse] = await Promise.all([
        fetch('/domo/datastores/v1/collections/bulk_allocation_fte/documents/'),
        fetch('/domo/datastores/v1/collections/bulk_allocation_summary/documents/'),
        fetch('/data/v1/consolidated_hr_fte_report_view'),
        fetch('/data/v1/ai_report'),
      ]);

      const ftes: FteDoc[] = fteResponse.ok ? await fteResponse.json() : [];
      const summaries: SummaryDoc[] = summaryResponse.ok ? await summaryResponse.json() : [];
      const emps: TeamMember[] = metaEmpResponse.ok ? await metaEmpResponse.json() : [];
      const clients: AiReportData[] = metaClientResponse.ok ? await metaClientResponse.json() : [];

      setAllEmployees(Array.isArray(emps) ? emps.filter(e => e && e.full_name) : []);
      const staticClients: AiReportData[] = [
        { Code: 'UNALLOCATED', Name: 'Unallocated', DisplayName: 'Unallocated', RollsUpTo: '', Region: '', Country: '' },
        { Code: 'PTO', Name: 'PTO', DisplayName: 'PTO', RollsUpTo: '', Region: '', Country: '' },
      ];
      setAllClients([...staticClients, ...(Array.isArray(clients) ? clients.filter(c => c && c.DisplayName) : [])]);

      const grouped = (Array.isArray(summaries) ? summaries : []).reduce((acc, summary) => {
        if (!summary?.content) return acc;
        const { bulk_allocation_id, cost_center_name, cost_center_number, allocation_percentage, bulk_allocation_date, allocation_group } = summary.content;
        
        if (!bulk_allocation_id) return acc;

        if (!acc[bulk_allocation_id]) {
          acc[bulk_allocation_id] = {
            id: bulk_allocation_id,
            allocationDate: bulk_allocation_date || new Date().toISOString(),
            employees: [],
            summaries: [],
            allocationGroup: allocation_group,
          };
        }
        
        const percNumber = Number(allocation_percentage) || 0;
        acc[bulk_allocation_id].summaries.push({
          id: summary.id,
          name: cost_center_name || 'Unknown',
          number: cost_center_number || 'Unknown',
          percentage: percNumber,
        });

        return acc;
      }, {} as Record<string, ProcessedAllocation>);

      (Array.isArray(ftes) ? ftes : []).forEach(fte => {
        if (!fte?.content) return;
        const { bulk_allocation_id, employee_id, employee_name, allocation_monthyear } = fte.content;
        if (bulk_allocation_id && grouped[bulk_allocation_id]) {
          grouped[bulk_allocation_id].employees.push({
              id: fte.id,
              employeeId: employee_id,
              name: employee_name || 'Unknown'
          });
          if (allocation_monthyear && !grouped[bulk_allocation_id].allocationMonthYear) {
            grouped[bulk_allocation_id].allocationMonthYear = allocation_monthyear;
          }
        }
      });
      
      const processed = Object.values(grouped).sort((a, b) => {
          const timeA = a.allocationDate ? new Date(a.allocationDate).getTime() : 0;
          const timeB = b.allocationDate ? new Date(b.allocationDate).getTime() : 0;
          return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });
      
      setOriginalAllocations(processed);
      setEditableAllocations(JSON.parse(JSON.stringify(processed)));

    } catch (error) {
      console.error('Error fetching bulk allocation data:', error);
      toast({ variant: 'destructive', title: 'Failed to fetch saved allocations' });
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
        const updatedSummaries = alloc.summaries.map(s => s.id === summaryId ? { ...s, percentage: Number(newPercentage) } : s);
        return { ...alloc, summaries: updatedSummaries };
      }
      return alloc;
    }));
  };

  const handleClientChange = (allocId: string, summaryId: string, newClientName: string) => {
    const client = allClients.find(c => c.DisplayName === newClientName);
    setEditableAllocations(prev => prev.map(alloc => {
        if (alloc.id === allocId) {
            const updatedSummaries = alloc.summaries.map(s => s.id === summaryId ? { 
                ...s, 
                name: newClientName, 
                number: client?.Code || 'Unknown' 
            } : s);
            return { ...alloc, summaries: updatedSummaries };
        }
        return alloc;
    }));
  };

  const handleRemoveSummary = (allocId: string, summaryId: string) => {
    setEditableAllocations(prev => prev.map(alloc => {
        if (alloc.id === allocId) {
            return { ...alloc, summaries: alloc.summaries.filter(s => s.id !== summaryId) };
        }
        return alloc;
    }));
  };

  const handleAddSummary = (allocId: string) => {
    setEditableAllocations(prev => prev.map(alloc => {
        if (alloc.id === allocId) {
            const newSummary: SummaryEntry = {
                id: `new-${uuidv4()}`,
                name: '',
                number: '',
                percentage: 0,
                isNew: true
            };
            return { ...alloc, summaries: [...alloc.summaries, newSummary] };
        }
        return alloc;
    }));
  };

  const handleAddEmployee = (allocId: string, employeeId: string) => {
    const employee = allEmployees.find(e => e.person_id === employeeId);
    if (!employee) return;

    setEditableAllocations(prev => prev.map(alloc => {
        if (alloc.id === allocId) {
            if (alloc.employees.some(e => e.employeeId === employeeId)) {
                toast({ variant: 'destructive', title: 'Employee already added' });
                return alloc;
            }
            const newEntry: EmployeeEntry = {
                id: `new-${uuidv4()}`,
                employeeId: employeeId,
                name: employee.full_name,
                isNew: true
            };
            return { ...alloc, employees: [...alloc.employees, newEntry] };
        }
        return alloc;
    }));
  };

  const handleRemoveEmployee = (allocId: string, docId: string) => {
    setEditableAllocations(prev => prev.map(alloc => {
        if (alloc.id === allocId) {
            return { ...alloc, employees: alloc.employees.filter(e => e.id !== docId) };
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

    const totalAllocation = editableAlloc.summaries.reduce((sum, s) => sum + s.percentage, 0);
    // Use floating point margin for validation
    if (Math.abs(totalAllocation - 1.0) > 0.01) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Total allocation must be exactly 1.00.' });
      setIsSaving(prev => ({...prev, [allocId]: false}));
      return;
    }

    if (editableAlloc.employees.length === 0) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Profile must have at least one employee.' });
        setIsSaving(prev => ({...prev, [allocId]: false}));
        return;
    }

    try {
        const operations: Promise<any>[] = [];

        originalAlloc.summaries.forEach(orig => {
            if (!editableAlloc.summaries.some(edit => edit.id === orig.id)) {
                operations.push(fetch(`/domo/datastores/v1/collections/bulk_allocation_summary/documents/${orig.id}`, { method: 'DELETE' }));
            }
        });
        
        editableAlloc.summaries.forEach(edit => {
            const content = {
                bulk_allocation_id: allocId,
                cost_center_number: edit.number,
                cost_center_name: edit.name,
                allocation_percentage: edit.percentage.toString(),
                bulk_allocation_date: editableAlloc.allocationDate,
                allocation_group: editableAlloc.allocationGroup,
            };

            if (edit.isNew) {
                operations.push(fetch(`/domo/datastores/v1/collections/bulk_allocation_summary/documents/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content }),
                }));
            } else {
                const original = originalAlloc.summaries.find(o => o.id === edit.id);
                if (original && (original.percentage !== edit.percentage || original.number !== edit.number)) {
                    operations.push(fetch(`/domo/datastores/v1/collections/bulk_allocation_summary/documents/${edit.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content }),
                    }));
                }
            }
        });

        originalAlloc.employees.forEach(orig => {
            if (!editableAlloc.employees.some(edit => edit.id === orig.id)) {
                operations.push(fetch(`/domo/datastores/v1/collections/bulk_allocation_fte/documents/${orig.id}`, { method: 'DELETE' }));
            }
        });
        
        editableAlloc.employees.forEach(edit => {
            if (edit.isNew) {
                const content = {
                    bulk_allocation_id: allocId,
                    employee_id: edit.employeeId,
                    employee_name: edit.name,
                    bulk_allocation_date: editableAlloc.allocationDate,
                    allocation_monthyear: editableAlloc.allocationMonthYear || '',
                };
                operations.push(fetch(`/domo/datastores/v1/collections/bulk_allocation_fte/documents/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content }),
                }));
            }
        });

        if (operations.length === 0) {
            toast({ title: 'No changes to save.' });
            setIsSaving(prev => ({...prev, [allocId]: false}));
            return;
        }

        const results = await Promise.all(operations);
        if (results.some(res => !res.ok)) throw new Error('One or more save operations failed.');

        toast({ title: 'Success', description: `Profile updated successfully.` });
        fetchData(); 
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
        setIsSaving(prev => ({...prev, [allocId]: false}));
    }
  };

  const handleDeleteProfile = async (allocId: string) => {
    setIsDeleting(prev => ({...prev, [allocId]: true}));
    
    const profile = originalAllocations.find(a => a.id === allocId);
    if (!profile) {
        setIsDeleting(prev => ({...prev, [allocId]: false}));
        return;
    }

    try {
        const operations: Promise<any>[] = [];
        profile.employees.forEach(emp => {
            operations.push(fetch(`/domo/datastores/v1/collections/bulk_allocation_fte/documents/${emp.id}`, { method: 'DELETE' }));
        });
        profile.summaries.forEach(sum => {
            operations.push(fetch(`/domo/datastores/v1/collections/bulk_allocation_summary/documents/${sum.id}`, { method: 'DELETE' }));
        });

        const results = await Promise.all(operations);
        if (results.some(res => !res.ok)) throw new Error('Failed to delete some records associated with this profile.');

        toast({ title: 'Profile Deleted', description: 'The bulk allocation profile and all its associated records have been removed.' });
        fetchData();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    } finally {
        setIsDeleting(prev => ({...prev, [allocId]: false}));
    }
  };


  if (loading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-1/3 mb-2" /><Skeleton className="h-4 w-2/3" /></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Bulk Allocation Profiles</CardTitle>
        <CardDescription>History of all saved bulk allocation profiles. You can fully edit employees and client mixes here.</CardDescription>
      </CardHeader>
      <CardContent>
        {editableAllocations.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">No bulk allocation profiles found.</div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {editableAllocations.map(alloc => {
                const totalAllocation = (alloc.summaries || []).reduce((sum, s) => sum + s.percentage, 0);
                const isProfileSaving = isSaving[alloc.id];
                const isProfileDeleting = isDeleting[alloc.id];
                const displayId = alloc.id ? alloc.id.substring(0, 8) : 'unknown';
                
                const clientSummary = (alloc.summaries || []).map(s => `${s.name} (${(Number(s.percentage) || 0).toFixed(2)})`).join(', ');
                
              return (
              <AccordionItem value={alloc.id} key={alloc.id}>
                <AccordionTrigger>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-left w-full">
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-sm text-primary">{displayId}...</span>
                            {alloc.allocationGroup && <Badge variant="outline">{alloc.allocationGroup}</Badge>}
                            {alloc.allocationMonthYear && <Badge>{alloc.allocationMonthYear}</Badge>}
                            <Badge variant="secondary">{(alloc.employees || []).length} Employees</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate flex-1 max-w-[350px] hidden md:block">
                            {clientSummary}
                        </div>
                        <span className="text-sm text-muted-foreground hidden sm:inline ml-auto pr-4">
                            Created: {alloc.allocationDate ? new Date(alloc.allocationDate).toLocaleDateString() : 'N/A'}
                        </span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/50 rounded-md">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold">Assigned Employees</h4>
                                <div className="w-48">
                                    <EmployeeSelect 
                                        employees={allEmployees} 
                                        onValueChange={(id) => handleAddEmployee(alloc.id, id)}
                                        disabled={isProfileSaving || isProfileDeleting}
                                    />
                                </div>
                            </div>
                            <ScrollArea className="h-64 border rounded-md bg-background">
                                <div className="p-2 space-y-1">
                                    {(alloc.employees || []).map((emp) => (
                                        <div key={emp.id} className="flex items-center justify-between p-2 rounded hover:bg-muted group text-sm">
                                            <span>{emp.name}</span>
                                            <button 
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded hover:bg-destructive/10 text-destructive disabled:opacity-50" 
                                                onClick={() => handleRemoveEmployee(alloc.id, emp.id)}
                                                disabled={isProfileSaving || isProfileDeleting}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {(!alloc.employees || alloc.employees.length === 0) && <p className="text-center py-4 text-muted-foreground">No employees assigned.</p>}
                                </div>
                            </ScrollArea>
                        </div>
                        <div>
                             <h4 className="font-semibold mb-2">Client Allocation</h4>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Client</TableHead>
                                        <TableHead className="text-right w-24">Allocation</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(alloc.summaries || []).map(s => (
                                        <TableRow key={s.id}>
                                            <TableCell>
                                                <ClientSelect 
                                                    clients={allClients} 
                                                    value={s.name} 
                                                    onValueChange={(val) => handleClientChange(alloc.id, s.id, val)}
                                                    disabled={isProfileSaving || isProfileDeleting}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <Input 
                                                type="number" min="0" max="1" step="0.01"
                                                value={(Number(s.percentage) || 0).toFixed(2)}
                                                onChange={(e) => handlePercentageChange(alloc.id, s.id, e.target.value)}
                                                className="w-20 text-center ml-auto"
                                                disabled={isProfileSaving || isProfileDeleting}
                                              />
                                            </TableCell>
                                            <TableCell>
                                                <Button 
                                                    variant="ghost" size="icon" className="h-8 w-8"
                                                    onClick={() => handleRemoveSummary(alloc.id, s.id)}
                                                    disabled={isProfileSaving || isProfileDeleting || (alloc.summaries || []).length === 1}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                             </Table>
                             <div className="mt-4 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <Button variant="outline" size="sm" onClick={() => handleAddSummary(alloc.id)} disabled={isProfileSaving || isProfileDeleting}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Client
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => onCopyTemplate(alloc.summaries)} disabled={isProfileSaving || isProfileDeleting}>
                                            <Copy className="mr-2 h-4 w-4" /> Copy
                                        </Button>
                                        <Button size="sm" onClick={() => handleSaveChanges(alloc.id)} disabled={isProfileSaving || isProfileDeleting || Math.abs(totalAllocation - 1.0) > 0.01}>
                                            {isProfileSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                            {isProfileSaving ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    </div>
                                </div>
                                <Alert variant={Math.abs(totalAllocation - 1.0) > 0.01 ? 'destructive' : 'default'}>
                                    <AlertDescription>
                                    Total Allocation: <span className="font-bold">{totalAllocation.toFixed(2)}</span>
                                    {Math.abs(totalAllocation - 1.0) > 0.01 && " (Must equal 1.00)"}
                                    </AlertDescription>
                                </Alert>
                                <div className="border-t pt-4 mt-2">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm" className="w-full" disabled={isProfileSaving || isProfileDeleting}>
                                                {isProfileDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                                {isProfileDeleting ? 'Deleting...' : 'Delete Profile Entirely'}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete this bulk allocation profile and all associated employee assignments. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteProfile(alloc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                    Delete Profile
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
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
