
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { appDb } from '@/services/data';
import type { FtePrototypeData } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const COLLECTION_NAME = 'fte_prototype';

export default function FtePrototypePage() {
  const [data, setData] = useState<FtePrototypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await appDb.list<FtePrototypeData>(COLLECTION_NAME);
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch data from the database.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddData = async () => {
    if (newName.trim() === '' || newValue.trim() === '') {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Name and Value fields cannot be empty.',
      });
      return;
    }

    try {
      await appDb.create(COLLECTION_NAME, { name: newName, value: newValue });
      toast({
        title: 'Success',
        description: 'New data has been saved.',
      });
      setNewName('');
      setNewValue('');
      // Refresh the data to show the new entry
      fetchData();
    } catch (error) {
      console.error('Error saving data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save the new data.',
      });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="FTE Prototype Data"
        description="This page displays raw data from the AppDB collection."
      />
      <Card>
        <CardHeader>
          <CardTitle>Add New Data</CardTitle>
          <CardDescription>
            Use the form below to add a new key-value pair to the AppDB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="grid gap-2 flex-1">
              <Label htmlFor="name-input">Name</Label>
              <Input
                id="name-input"
                placeholder="e.g., New Metric"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="grid gap-2 flex-1">
              <Label htmlFor="value-input">Value</Label>
              <Input
                id="value-input"
                placeholder="e.g., 42"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddData} className="w-full sm:w-auto">
                Add Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Data</CardTitle>
          <CardDescription>
            This is the live data being returned from the AppDB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading data...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.content.name}</TableCell>
                    <TableCell>{item.content.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
