
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// This is the AppDB API wrapper
declare var domo: any;

type StoreData = {
  date_ymd: string;
  revenue: number;
  sales_rep: string;
  department: string;
  state: string;
};

export default function GetDataPage() {
  const [data, setData] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isDomo = typeof domo !== 'undefined';
    if (!isDomo) {
      console.log('Not in a Domo environment, skipping data fetch.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await domo.get(`/data/v1/store_example_data`);
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
        title="Get Data Example"
        description="This page fetches live data from an endpoint and displays it."
      />
      <Card>
        <CardHeader>
          <CardTitle>Store Sales Data</CardTitle>
          <CardDescription>
            Live data from the /data/v1/store_example_data endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading data...</p>
          ) : data.length > 0 ? (
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
                {data.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.date_ymd}</TableCell>
                    <TableCell className="font-medium">{item.sales_rep}</TableCell>
                    <TableCell>{item.department}</TableCell>
                    <TableCell>{item.state}</TableCell>
                    <TableCell className="text-right">
                      {item.revenue.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <p>No data was returned from the endpoint. This is expected in local development.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
