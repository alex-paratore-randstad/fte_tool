
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getFtePrototypeData } from '@/services/data';
import type { FtePrototypeData } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function GetDataPage() {
  const [data, setData] = useState<FtePrototypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const fteData = await getFtePrototypeData();
        setData(fteData);
      } catch (error) {
        console.error("Failed to fetch FTE data", error);
        toast({
            title: 'Error Fetching Data',
            description: 'Could not retrieve data from the backend.',
            variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const handleSave = () => {
    // This is a mock save function. In a real application, this would
    // send the data to a backend endpoint.
    if (!name || !value) {
        toast({
            title: 'Missing Information',
            description: 'Please provide both a name and a value.',
            variant: 'destructive',
        });
        return;
    }
    
    toast({
        title: 'Data Saved (Mock)',
        description: `Name: ${name}, Value: ${value}`,
    });

    // Clear the input fields after saving
    setName('');
    setValue('');
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Get Data"
        description="Interact with the DOMO dataset."
      />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle>Add New Entry</CardTitle>
                    <CardDescription>Add a new name/value pair to the dataset.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input 
                            id="name" 
                            placeholder="Enter a name" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="value">Value</Label>
                        <Input 
                            id="value" 
                            placeholder="Enter a value"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave}>Save Data</Button>
                </CardFooter>
            </Card>
        </div>
        <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Dataset Records</CardTitle>
                <CardDescription>
                  This table displays the records from your DOMO dataset.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="text-right">ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">Loading data...</TableCell>
                      </TableRow>
                    ) : data.length > 0 ? (
                      data.map((item) => (
                        <TableRow key={item._id}>
                          <TableCell className="font-medium">{item.content.name}</TableCell>
                          <TableCell>{item.content.value}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{item._id}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                       <TableRow>
                        <TableCell colSpan={3} className="text-center">No data found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
