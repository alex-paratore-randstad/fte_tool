
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { accounts, allocations } from '@/lib/mock-data';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';

type Forecast = {
  month: string;
  fte: number;
};

const chartConfig = {
  fte: {
    label: 'Forecasted FTE',
    color: 'hsl(var(--chart-1))',
  },
};


export default function ForecastingPage() {
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [forecastData, setForecastData] = useState<Forecast[] | null>(null);

  const handleGenerateForecast = () => {
    if (!selectedAccount) return;

    // 1. Calculate the base FTE from existing allocations for the selected account.
    // This simulates using "prior reported periods" from the mock data.
    const accountAllocations = allocations.flatMap((a) =>
      a.allocations.filter((alloc) => alloc.accountId === selectedAccount)
    );
    const baseFte = accountAllocations.reduce((sum, alloc) => sum + alloc.fte, 0);
    
    // If no data, use a default to ensure a chart is still generated
    const fteForProjection = baseFte > 0 ? baseFte : 10; 

    // 2. Generate forecast for the rest of the year.
    const currentMonthIndex = new Date().getMonth();
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const generatedForecast: Forecast[] = [];
    for (let i = currentMonthIndex; i < 12; i++) {
      // Simple projection with slight random variation (+/- 10%)
      const variation = (Math.random() * 0.2) - 0.1;
      const forecastedFte = fteForProjection * (1 + variation);
      generatedForecast.push({
        month: months[i].substring(0, 3), // Use short month names for chart
        fte: parseFloat(forecastedFte.toFixed(2)),
      });
    }

    setForecastData(generatedForecast);
  };
  
  const selectedAccountName = accounts.find(a => a.id === selectedAccount)?.name || '';

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="FTE Forecasting"
        description="Generate a 12-month FTE forecast for an account using historical data."
      />
      <Card>
        <CardHeader>
          <CardTitle>Generate Forecast</CardTitle>
          <CardDescription>
            Select an account to generate a forecast for the remainder of the current year based on past allocation data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Select an account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerateForecast} disabled={!selectedAccount}>
            Generate Forecast
          </Button>
        </CardFooter>
      </Card>

      {forecastData && (
        <Card>
          <CardHeader>
            <CardTitle>Forecast for {selectedAccountName}</CardTitle>
            <CardDescription>
              This is an estimated FTE demand for the rest of the year. You can review and adjust as needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer>
                <BarChart data={forecastData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--secondary))' }}
                    content={<ChartTooltipContent />}
                  />
                  <Legend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="fte"
                    fill="var(--color-fte)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col items-start gap-4">
            <p className="text-sm text-muted-foreground">This is a system-generated forecast. To improve accuracy for future projections, ensure weekly allocations are always up-to-date.</p>
            <div className='flex gap-2'>
              <Button>Accept & Save Forecast</Button>
              <Button variant="outline">Edit Forecast</Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
