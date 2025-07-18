
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

export default function GetDataPage() {
  const [data, setData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const salesData = await getStoreExampleData();
      setData(salesData);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Get Data"
        description="Displaying sample data fetched from an endpoint."
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
