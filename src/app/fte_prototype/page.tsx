
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getFtePrototypeData } from '@/services/data';
import type { FtePrototypeData } from '@/types';

export default function FtePrototypePage() {
  const [data, setData] = useState<FtePrototypeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFtePrototypeData().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="FTE Prototype Data"
        description="This page displays raw data fetched from the prototype data service."
      />
      <Card>
        <CardHeader>
          <CardTitle>Live Data</CardTitle>
          <CardDescription>
            This is the data being returned from the `getFtePrototypeData` service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading data...</p>
          ) : (
            <ul className="list-disc list-inside space-y-2 pl-4 font-mono text-sm">
              {data.map((item) => (
                <li key={item._id}>
                  <span className="font-semibold">{item.content.name}:</span> {item.content.value}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
