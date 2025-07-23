
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
import { getFtePrototypeData } from '@/services/data';
import type { FtePrototypeData } from '@/types';

export default function GetDataPage() {
  const [prototypeData, setPrototypeData] = useState<FtePrototypeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      const fteData = await getFtePrototypeData();
      setPrototypeData(fteData);
      setLoading(false);
    };

    fetchAllData();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Get Data"
        description="Displaying sample data fetched from an endpoint."
      />
      
      <Card>
        <CardHeader>
          <CardTitle>FTE Prototype Documents</CardTitle>
          <CardDescription>
            This table displays data from the /domo/datastores/v1/collections/fte_prototype/documents/ endpoint.
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
                {prototypeData.map((row) => (
                  <TableRow key={row._id}>
                    <TableCell className="font-medium">{row.content.name}</TableCell>
                    <TableCell>{row.content.value}</TableCell>
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
