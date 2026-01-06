
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AiReportTable, type AiReportData } from '../cost-centers/ai-report-table';
import { ClientGroupingsTable, type GroupedData, type TicketData } from './client-groupings-table';

export function ClientContent() {
  const [aiReportData, setAiReportData] = useState<AiReportData[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedData>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [aiResponse, ticketsResponse] = await Promise.all([
          fetch(`/data/v1/ai_report`),
          fetch('/data/v1/fte_tickets_grouped_monthly')
        ]);

        // Process AI Report data
        if (!aiResponse.ok) {
          console.warn("Failed to fetch AI report data.");
        }
        const aiResult: AiReportData[] = aiResponse.ok ? await aiResponse.json() : [];
        setAiReportData(aiResult);
        
        // Process Ticket Groupings data
        if (!ticketsResponse.ok) {
            throw new Error('Failed to fetch ticket data');
        }
        const ticketResult: TicketData[] = await ticketsResponse.json();
        const processedData = ticketResult.reduce((acc: GroupedData, item) => {
            const client = item.client_name || 'N/A';
            const department = item.department_name || 'N/A';
            const agentGroup = item.agent_group_name || 'N/A';
            const agent = item.agent_name;

            if (!acc[client]) acc[client] = {};
            if (!acc[client][department]) acc[client][department] = {};
            if (!acc[client][department][agentGroup]) {
            acc[client][department][agentGroup] = new Set();
            }
            acc[client][department][agentGroup].add(agent);

            return acc;
        }, {});
        setGroupedData(processedData);


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
      <AiReportTable reportData={aiReportData} loading={loading} />
      <ClientGroupingsTable groupedData={groupedData} loading={loading} />
    </div>
  );
}
