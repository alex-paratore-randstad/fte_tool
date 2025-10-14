
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TeamMember } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

type UpdatedTitle = {
  'Updated Market Facing Title': string;
};

type EmployeeTitleSelection = {
  [employeeId: string]: string;
};

export function TitleManagementContent() {
  const [employees, setEmployees] = useState<TeamMember[]>([]);
  const [titles, setTitles] = useState<UpdatedTitle[]>([]);
  const [selectedTitles, setSelectedTitles] = useState<EmployeeTitleSelection>({});
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null); // Track which employee is being saved
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
      
      setEmployees(empData.filter(e => typeof e['Full_Name'] === 'string' && e['Full_Name']));
      setTitles(titleData.filter(t => typeof t['Updated Market Facing Title'] === 'string' && t['Updated Market Facing Title']));

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

  const handleTitleSelectionChange = (employeeId: string, newTitle: string) => {
    setSelectedTitles(prev => ({
      ...prev,
      [employeeId]: newTitle,
    }));
  };

  const handleSave = async (employeeId: string) => {
    const selectedTitle = selectedTitles[employeeId];
    if (!selectedTitle) {
      toast({
        variant: 'destructive',
        title: 'Missing Title',
        description: 'Please select a new title for the employee before saving.',
      });
      return;
    }
    setIsSubmitting(employeeId);
    try {
      const response = await fetch('/domo/datastores/v1/collections/title_management/documents/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: { 
            employee_id: employeeId, 
            updated_title: selectedTitle 
          }
        }),
      });

       if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: 'Success!',
        description: `New title has been assigned.`,
      });
      
    } catch (error) {
      console.error('Error submitting data:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Could not assign the new title.'
      });
    } finally {
      setIsSubmitting(null);
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
                <Skeleton className="h-64 w-full" />
            </CardContent>
        </Card>
     )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Employee Titles</CardTitle>
        <CardDescription>
          Assign a new market-facing title to an employee from the list below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Current Title</TableHead>
                <TableHead className="w-[300px]">New Market-Facing Title</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee['Person_Number']}>
                  <TableCell className="font-medium">{employee['Full_Name']}</TableCell>
                  <TableCell>{employee['Market_Facing_Title']}</TableCell>
                  <TableCell>
                    <Select 
                      onValueChange={(newTitle) => handleTitleSelectionChange(employee['Person_Number'], newTitle)}
                      value={selectedTitles[employee['Person_Number']] || ''}
                      disabled={isSubmitting === employee['Person_Number']}
                    >
                      <SelectTrigger>
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
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm"
                      onClick={() => handleSave(employee['Person_Number'])}
                      disabled={!selectedTitles[employee['Person_Number']] || isSubmitting === employee['Person_Number']}
                    >
                      {isSubmitting === employee['Person_Number'] ? 'Saving...' : 'Save'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
