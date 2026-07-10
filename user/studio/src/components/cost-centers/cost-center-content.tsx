
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ClientDataTable, type AiReportData } from './client-data-table';


export function CostCenterContent() {
  const [aiReportData, setAiReportData] = useState<AiReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/data/v1/fte_tool_cost_center_guidance_view`);

        if (!response.ok) {
          console.warn("Failed to fetch AI report data.");
        }
        
        const aiResult: AiReportData[] = response.ok ? await response.json() : [];
        setAiReportData(Array.isArray(aiResult) ? aiResult : []);

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

  return (
    <div className="flex flex-col gap-8">
      <ClientDataTable reportData={aiReportData} loading={loading} />
    </div>
  );
}
