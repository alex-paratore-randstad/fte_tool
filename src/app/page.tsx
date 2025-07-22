
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getStoreExampleData } from '@/services/data';
import type { SalesData } from '@/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function GetDataPage() {
  const [data, setData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('Bill and Teds');
  const [value, setValue] = useState('Bill S. Preston, Esquire');
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const salesData = await getStoreExampleData();
      setData(salesData);
      setLoading(false);
    };
    fetchData();
  }, []);
  
  const handleSendData = async () => {
    try {
      const response = await fetch('/domo/datastores/v1/collections/fte_prototype/documents/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: {
            name: name,
            value: value,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      toast({
        title: 'Data Sent Successfully',
        description: `Document created with ID: ${result._id}`,
      });
    } catch (error) {
      console.error('Error sending data:', error);
      toast({
        variant: 'destructive',
        title: 'Error Sending Data',
        description: 'There was a problem with the request. See the console for more details.',
      });
    }
  };


  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Get Data"
        description="Displaying sample data fetched from an endpoint."
        actions={
          <div className="flex items-end gap-2">
            <div className="grid gap-2">
              <Label htmlFor="name-input">Name</Label>
              <Input 
                id="name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a name"
              />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="value-input">Value</Label>
              <Input 
                id="value-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter a value"
              />
            </div>
            <Button onClick={handleSendData}>
                <Upload className="mr-2 h-4 w-4" />
                Send Data
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Sales Data</CardTitle>
          <CardDescription>
            This table displays sample data from the /data/v1/store_example_data endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading data...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.date_ymd}</TableCell>
                    <TableCell className="font-medium">{row.sales_rep}</TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell>{row.state}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(row.revenue)}
                    </TableCell>
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
