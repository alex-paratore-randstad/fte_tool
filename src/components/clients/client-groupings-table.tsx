
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

export type TicketData = {
  agent_name: string;
  agent_group_name: string;
  department_name: string;
  client_name: string;
};

export type GroupedData = {
  [clientName: string]: {
    [departmentName: string]: {
      [agentGroupName: string]: Set<string>; // Set of agent names
    };
  };
};

type ClientGroupingsTableProps = {
  groupedData: GroupedData;
  loading: boolean;
};

export function ClientGroupingsTable({ groupedData, loading }: ClientGroupingsTableProps) {
  const [filter, setFilter] = useState('');

  const filteredClients = useMemo(() => {
    if (!filter) return Object.keys(groupedData).sort();
    const lowercasedFilter = filter.toLowerCase();
    return Object.keys(groupedData)
      .filter(clientName => clientName.toLowerCase().includes(lowercasedFilter))
      .sort();
  }, [groupedData, filter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Groupings</CardTitle>
        <CardDescription>Distinct groupings from the `fte_tickets_grouped_monthly` dataset.</CardDescription>
        <div className="pt-2">
            <Input
              placeholder="Filter by Client Name..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm"
              disabled={loading}
            />
          </div>
      </CardHeader>
      <CardContent>
        {loading ? (
           <Skeleton className="h-40 w-full" />
        ) : (
          <Accordion type="multiple" className="w-full">
              {filteredClients.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">
                      No client groupings found or matching filters.
                  </div>
              ) : filteredClients.map(clientName => (
                  <AccordionItem value={clientName} key={clientName}>
                      <AccordionTrigger>
                          <span className="font-semibold">{clientName}</span>
                      </AccordionTrigger>
                      <AccordionContent>
                          <div className="pl-4">
                          {Object.entries(groupedData[clientName]).map(([deptName, agentGroups]) => (
                              <div key={deptName} className="mb-4">
                                  <h4 className="font-medium text-base mb-2">{deptName}</h4>
                                  <div className="pl-4 border-l-2 border-muted">
                                      {Object.entries(agentGroups).map(([agentGroupName, agents]) => (
                                          <div key={agentGroupName} className="py-2">
                                              <div className="flex items-center gap-2">
                                                  <h5 className="font-normal text-sm">{agentGroupName}</h5>
                                                  <Badge variant="secondary">{agents.size} Agents</Badge>
                                              </div>
                                              <ul className="list-disc pl-8 mt-1 text-xs text-muted-foreground">
                                                  {Array.from(agents).sort().map(agent => (
                                                      <li key={agent}>{agent}</li>
                                                  ))}
                                              </ul>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))}
                          </div>
                      </AccordionContent>
                  </AccordionItem>
              ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
