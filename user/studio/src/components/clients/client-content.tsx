
'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AiReportTable, AiReportData } from './ai-report-table';

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
        <div className="flex flex-col gap-8">
            <AiReportTable reportData={[]} />
        </div>
      )
  }

  return (
    <div className="flex flex-col gap-8">
      <AiReportTable reportData={aiReportData} />
    </div>
  );
}
