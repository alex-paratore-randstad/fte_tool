
'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AiReportTable, AiReportData } from './ai-report-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function CostCenterContent() {
  const [aiReportData, setAiReportData] = useState<AiReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/data/v1/ai_report`);

        if (!response.ok) {
          console.warn("Failed to fetch AI report data.");
        }
        
        const aiResult: AiReportData[] = response.ok ? await response.json() : [];
        setAiReportData(aiResult);

      } catch (error) {
        console.error("Failed to fetch client data:", error);
         toast({
          variant: 'destructive',
          title: 'Failed to fetch page data',
          description: 'Could not retrieve data from the server.'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  if (loading) {
      return (
        <div className="flex flex-col gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Client Data</CardTitle>
                    <CardDescription>
                        Data from the `ai_report` dataset used to populate client dropdowns.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
      )
  }

  return (
    <div className="flex flex-col gap-8">
      <AiReportTable reportData={aiReportData} />
    </div>
  );
}
