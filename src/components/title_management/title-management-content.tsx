
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TeamMember } from '@/types';
import { SelectSearch } from '../ui/select-search';
import { ScrollArea } from '../ui/scroll-area';
import { writeLog } from '@/lib/logger';

type UpdatedTitle = {
  updated_titles: string;
};

type TitleManagementContentProps = {
  onSaveSuccess: () => void;
};

const EmployeeSelect = ({ employees, value, onValueChange, disabled }: { employees: TeamMember[], value: string, onValueChange: (value: string) => void, disabled?: boolean }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredEmployees = useMemo(() => {
        const sorted = [...employees].sort((a,b) => {
            const nameA = a.full_name || a.Full_Name || '';
            const nameB = b.full_name || b.Full_Name || '';
            return nameA.localeCompare(nameB);
        });
        if (!searchTerm) return sorted;
        return sorted.filter(e => {
            const name = (e.full_name || e.Full_Name || '').toLowerCase();
            return name.includes(searchTerm.toLowerCase());
        });
    }, [employees, searchTerm]);

    return (
        <Select onValueChange={onValueChange} value={value} disabled={disabled}>
            <SelectTrigger id="employee">
                <SelectValue placeholder="Select an employee..." />
            </SelectTrigger>
            <SelectContent>
                <SelectSearch placeholder="Search employee..." onChange={setSearchTerm} />
                <ScrollArea className="h-64">
                    {filteredEmployees.map(emp => (
                        <SelectItem key={emp.person_id || emp.Person_Number} value={emp.full_name || emp.Full_Name || ''}>
                            {emp.full_name || emp.Full_Name}
                        </SelectItem>
                    ))}
                    {filteredEmployees.length === 0 && (
                    <div className="p-4 text-sm text-center text-muted-foreground">
                        No employees found.
                    </div>
                    )}
                </ScrollArea>
            </SelectContent>
        </Select>
    );
};

const TitleSelect = ({ titles, value, onValueChange, disabled }: { titles: UpdatedTitle[], value: string, onValueChange: (value: string) => void, disabled?: boolean }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredTitles = useMemo(() => {
        const sortedTitles = [...titles].sort((a,b) => (a.updated_titles || '').localeCompare(b.updated_titles || ''));
        if (!searchTerm) return sortedTitles;
        return sortedTitles.filter(t => t.updated_titles && t.updated_titles.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [titles, searchTerm]);

    return (
        <Select onValueChange={onValueChange} value={value} disabled={disabled}>
            <SelectTrigger id="title">
                <SelectValue placeholder="Select a new title..." />
            </SelectTrigger>
            <SelectContent>
                <SelectSearch placeholder="Search title..." onChange={setSearchTerm} />
                <ScrollArea className="h-64">
                    {filteredTitles.map(t => (
                        <SelectItem key={t.updated_titles} value={t.updated_titles}>
                            {t.updated_titles}
                        </SelectItem>
                    ))}
                    {filteredTitles.length === 0 && (
                    <div className="p-4 text-sm text-center text-muted-foreground">
                        No titles found.
                    </div>
                    )}
                </ScrollArea>
            </SelectContent>
        </Select>
    );
};


export function TitleManagementContent({ onSaveSuccess }: TitleManagementContentProps) {
  const [employees, setEmployees] = useState<TeamMember[]>([]);
  const [titles, setTitles] = useState<UpdatedTitle[]>([]);
  
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');
  const [selectedTitle, setSelectedTitle] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empResponse, titleResponse] = await Promise.all([
        fetch(`/data/v1/consolidated_hr_fte_report_view`),
        fetch(`/data/v1/mst_fte_updated_titles_view`),
      ]);

      if (!empResponse.ok) {
        writeLog('TitleManagement', 'error', 'Failed to fetch employee list', { status: empResponse.status });
      }

      let titleData: any[] = [];
      if (titleResponse.ok) {
        titleData = await titleResponse.json();
      } else {
        writeLog('TitleManagement', 'warning', `Dataset 'mst_fte_updated_titles_view' returned ${titleResponse.status}.`, { statusText: titleResponse.statusText });
      }

      const empData: TeamMember[] = empResponse.ok ? await empResponse.json() : [];
      
      const safeEmps = (Array.isArray(empData) ? empData : []).filter(e => e && (e.full_name || e.Full_Name));
      
      // Map variations of Title column name
      const safeTitles = (Array.isArray(titleData) ? titleData : [])
        .map(t => {
            if (!t) return null;
            const val = t['updated_titles'] || t['Updated_Titles'] || t['Updated Titles'] || t['updated titles'] || t['Job_Title'] || t['Job Title'] || t['Title'];
            return val ? { updated_titles: String(val).trim() } : null;
        })
        .filter((t): t is UpdatedTitle => !!t);
      
      setEmployees(safeEmps.sort((a,b) => {
          const nameA = a.full_name || a.Full_Name || '';
          const nameB = b.full_name || b.Full_Name || '';
          return nameA.localeCompare(nameB);
      }));
      setTitles(safeTitles);

    } catch (error: any) {
      writeLog('TitleManagement', 'error', 'Critical error in title management fetch', error);
      toast({
        variant: 'destructive',
        title: 'Data Fetch Error',
        description: 'Could not retrieve data from the server.'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeName || !selectedTitle) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please select an employee and a new title.',
      });
      return;
    }
    
    const selectedEmployee = employees.find(emp => (emp.full_name || emp.Full_Name) === selectedEmployeeName);
    if (!selectedEmployee) {
      toast({
        variant: 'destructive',
        title: 'Invalid Employee',
        description: 'The selected employee could not be found.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/domo/datastores/v1/collections/title_management/documents/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: { 
            employee_id: selectedEmployee.person_id || selectedEmployee.Person_Number, 
            updated_title: selectedTitle 
          }
        }),
      });

       if (!response.ok) {
        throw new Error(`Submission failed with status: ${response.status}`);
      }

      toast({
        title: 'Success!',
        description: 'New title has been assigned.',
      });
      setSelectedEmployeeName('');
      setSelectedTitle('');
      onSaveSuccess();
    } catch (error: any) {
      writeLog('TitleManagement', 'error', 'Failed to save title update', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'Could not assign the new title.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
     return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                </div>
                 <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </CardContent>
            <CardFooter>
                 <Skeleton className="h-10 w-24" />
            </CardFooter>
        </Card>
     )
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Update Employee Title</CardTitle>
          <CardDescription>
            Select an employee and choose their new market-facing title. This change is permanent.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="employee">Employee</Label>
              <EmployeeSelect
                employees={employees}
                value={selectedEmployeeName}
                onValueChange={setSelectedEmployeeName}
                disabled={isSubmitting}
               />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">New Market-Facing Title</Label>
              <TitleSelect 
                titles={titles}
                value={selectedTitle}
                onValueChange={setSelectedTitle}
                disabled={isSubmitting}
              />
            </div>
        </CardContent>
        <CardFooter>
            <Button type="submit" disabled={isSubmitting || !selectedEmployeeName || !selectedTitle}>
              {isSubmitting ? 'Saving...' : 'Save Title Update'}
            </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
