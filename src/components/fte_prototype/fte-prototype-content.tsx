
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { FtePrototypeData } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

// Initialize a local domo object to handle data fetching.
// Replace '[your-domo-instance-subdomain]' with your actual Domo subdomain.
const baseUrl = 'https://[your-domo-instance-subdomain].domoapps.prod10.domo.com';
const domo = {
  get: async (url: string) => {
    const response = await fetch(`${baseUrl}${url}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
};

export function FtePrototypeContent() {
  const [data, setData] = useState<FtePrototypeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await domo.get(`/domo/datastores/v1/collections/fte_prototype/documents/`);
        setData(result);
      } catch (error) {
        console.error('Error fetching data:', error);
        // Set data to empty array on error to prevent crashes
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
        <Card>
          <CardHeader>
            <CardTitle>Live Data</CardTitle>
            <CardDescription>
              This is the live data being returned from the AppDB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Data</CardTitle>
        <CardDescription>
          This is the live data being returned from the AppDB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
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
        ) : (
          <p>
            No data was returned from the endpoint. This may be expected if the
            data source is empty or if you are in a local development environment.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
