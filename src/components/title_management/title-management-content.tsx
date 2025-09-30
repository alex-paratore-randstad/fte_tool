
'use client';

import { useState, useEffect, useCallback } from 'react';
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
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

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
      
      setEmployees(empData.filter(e => e['Full_Name']));
      setTitles(titleData.filter(t => t['Updated Market Facing Title']));

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !selectedTitle) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please select an employee and a new title.',
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
            employee_id: selectedEmployeeId, 
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
      setSelectedEmployeeId('');
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

  const filteredEmployees = employees.filter(emp => emp['Full_Name'].toLowerCase().includes(searchTerm.toLowerCase()));

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
              <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId} disabled={isSubmitting}>
                  <SelectTrigger id="employee">
                      <SelectValue placeholder="Select an employee..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectSearch onChange={setSearchTerm} />
                      {filteredEmployees.map(emp => (
                          <SelectItem key={emp['Person_Number']} value={emp['Person_Number']}>
                              {emp['Full_Name']}
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
                      {titles.map(t => (
                          <SelectItem key={t['Updated Market Facing Title']} value={t['Updated Market Facing Title']}>
                              {t['Updated Market Facing Title']}
                          </SelectItem>
                      ))}
                  </SelectContent>
              </Select>
            </div>
        </CardContent>
        <CardFooter>
            <Button type="submit" disabled={isSubmitting || !selectedEmployeeId || !selectedTitle}>
              {isSubmitting ? 'Saving...' : 'Save Title Update'}
            </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
