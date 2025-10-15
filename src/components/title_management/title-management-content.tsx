
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

type UpdatedTitle = {
  'Updated Market Facing Title': string;
};

export function TitleManagementContent() {
  const [employees, setEmployees] = useState<TeamMember[]>([]);
  const [titles, setTitles] = useState<UpdatedTitle[]>([]);
  
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [titleSearchTerm, setTitleSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empResponse, titleResponse] = await Promise.all([
        fetch(`/data/v1/gbs_ind_hr_fte_report`),
        fetch(`/data/v1/mst_fte_updated_titles`),
      ]);

      if (!empResponse.ok) {
        throw new Error('Failed to fetch employee list.');
      }
      if (!titleResponse.ok) {
        throw new Error('Failed to fetch title list.');
      }

      const empData: TeamMember[] = await empResponse.json();
      const titleData: UpdatedTitle[] = await titleResponse.json();
      
      setEmployees(empData.filter(e => e && e.Full_Name));
      setTitles(titleData.filter(t => t && t['Updated Market Facing Title']));

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to fetch data',
        description: 'Could not retrieve data from the server.'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearchTerm) {
      return employees;
    }
    return employees.filter(e => e.Full_Name.toLowerCase().includes(employeeSearchTerm.toLowerCase()));
  }, [employees, employeeSearchTerm]);
  
  const filteredTitles = useMemo(() => {
    if (!titleSearchTerm) {
      return titles;
    }
    return titles.filter(t => t['Updated Market Facing Title'].toLowerCase().includes(titleSearchTerm.toLowerCase()));
  }, [titles, titleSearchTerm]);


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
    
    const selectedEmployee = employees.find(emp => emp.Full_Name === selectedEmployeeName);
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
            employee_id: selectedEmployee.Person_Number, 
            updated_title: selectedTitle 
          }
        }),
      });

       if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: 'Success!',
        description: 'New title has been assigned.',
      });
      // Reset form
      setSelectedEmployeeName('');
      setSelectedTitle('');
    } catch (error) {
      console.error('Error submitting data:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Could not assign the new title.'
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
            Select an employee and choose their new market-facing title.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="employee">Employee</Label>
              <Select onValueChange={setSelectedEmployeeName} value={selectedEmployeeName} disabled={isSubmitting}>
                  <SelectTrigger id="employee">
                      <SelectValue placeholder="Select an employee..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectSearch placeholder="Search employee..." onChange={setEmployeeSearchTerm} />
                      {filteredEmployees.map(emp => (
                          <SelectItem key={emp.Person_Number} value={emp.Full_Name}>
                              {emp.Full_Name}
                          </SelectItem>
                      ))}
                      {filteredEmployees.length === 0 && (
                        <div className="p-4 text-sm text-center text-muted-foreground">
                            No employees found.
                        </div>
                      )}
                  </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">New Market-Facing Title</Label>
              <Select onValueChange={setSelectedTitle} value={selectedTitle} disabled={isSubmitting}>
                  <SelectTrigger id="title">
                      <SelectValue placeholder="Select a new title..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectSearch placeholder="Search title..." onChange={setTitleSearchTerm} />
                      {filteredTitles.map(t => (
                          <SelectItem key={t['Updated Market Facing Title']} value={t['Updated Market Facing Title']}>
                              {t['Updated Market Facing Title']}
                          </SelectItem>
                      ))}
                      {filteredTitles.length === 0 && (
                        <div className="p-4 text-sm text-center text-muted-foreground">
                            No titles found.
                        </div>
                      )}
                  </SelectContent>
              </Select>
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

