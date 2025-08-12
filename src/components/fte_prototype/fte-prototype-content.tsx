
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { FtePrototypeData } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Initialize a local domo object to handle data fetching.
// Replace '[your-domo-instance-subdomain]' with your actual Domo subdomain.
const baseUrl = 'https://[your-domo-instance-subdomain].domoapps.prod10.domo.com';
const domo = {
  get: async (url: string) => {
    var rUrl = `${baseUrl}${url}`.replace('[your-domo-instance-subdomain]','c5899a60-de1d-42af-b19b-99f8dff54fad');
    console.log(`GET: ${rUrl}`);
    console.log(`${URL.toString}`);
    const response = await fetch(rUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  post: async (url: string, body: { content: { name: string, value: string }}) => {
    var rUrl = `${baseUrl}${url}`.replace('[your-domo-instance-subdomain]','c5899a60-de1d-42af-b19b-99f8dff54fad');
    console.log(`POST: ${rUrl}`);
    const response = await fetch(rUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
};

export function FtePrototypeContent() {
  const [data, setData] = useState<FtePrototypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await domo.get(`/domo/datastores/v1/collections/fte_prototype/documents/`);
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to fetch data',
        description: 'Could not retrieve data from the server.'
      });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newValue) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out both Name and Value.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await domo.post('/domo/datastores/v1/collections/fte_prototype/documents/', {
        content: { name: newName, value: newValue }
      });
      toast({
        title: 'Success!',
        description: 'New entry has been added.',
      });
      setNewName('');
      setNewValue('');
      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Error submitting data:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Could not add the new entry.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
        </div>
      )
    }

    if (data.length === 0) {
      return (
        <p>
            No data was returned from the endpoint. This may be expected if the
            data source is empty or if you are in a local development environment.
        </p>
      )
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Document ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.content.name}</TableCell>
              <TableCell>{item.content.value}</TableCell>
              <TableCell className="font-mono text-xs">{item.id}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="flex flex-col gap-8">
       <Card>
        <CardHeader>
          <CardTitle>Add New Entry</CardTitle>
          <CardDescription>
            Enter a name and value to add a new document to the fte_prototype collection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
            <div className="grid gap-2 flex-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter a name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2 flex-1">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                placeholder="Enter a value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex items-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
            </div>
          </form>
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
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
