
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { FtePrototypeData } from '@/types';

declare var domo: any;

export default function FtePrototypePage() {
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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="FTE Prototype Data"
        description="This page fetches live data from the fte_prototype AppDB collection."
      />
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
          ) : data.length > 0 ? (
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
    </div>
  );
}
