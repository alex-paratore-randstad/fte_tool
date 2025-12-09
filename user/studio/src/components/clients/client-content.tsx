
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AiReportTable, AiReportData } from './ai-report-table';
import { Skeleton } from '../ui/skeleton';

export function ClientContent() {
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
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="h-6 w-1/3 mb-2" /></CardTitle>
              <CardDescription><Skeleton className="h-4 w-2/3" /></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            </CardContent>
          </Card>
      );
  }

  return (
    <div className="flex flex-col gap-8">
      <AiReportTable reportData={aiReportData} />
    </div>
  );
}

