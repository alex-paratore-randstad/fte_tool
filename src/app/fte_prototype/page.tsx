
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getFtePrototypeData } from '@/services/data';
import type { FtePrototypeData } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function FtePrototypePage() {
  const [data, setData] = useState<FtePrototypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    getFtePrototypeData().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  const handleAddData = () => {
    if (newName.trim() === '' || newValue.trim() === '') {
      // Basic validation to prevent empty entries
      return;
    }
    const newData: FtePrototypeData = {
      _id: new Date().toISOString(), // Use a simple unique ID for the prototype
      content: {
        name: newName,
        value: newValue,
      },
    };
    setData([...data, newData]);
    setNewName('');
    setNewValue('');
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="FTE Prototype Data"
        description="This page displays raw data fetched from the prototype data service."
      />
      <Card>
        <CardHeader>
          <CardTitle>Add New Data</CardTitle>
          <CardDescription>
            Use the form below to add a new key-value pair to the data list.
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
            This is the data being returned from the `getFtePrototypeData` service, including any new entries you add.
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
                  <TableRow key={item._id}>
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
