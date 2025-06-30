
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { getAccounts, getAllocations } from '@/services/domo';
import type { Account, Allocation } from '@/types';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Download } from 'lucide-react';

const ALL_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
];

export default function ForecastingPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [chartData, setChartData] = useState<any[] | null>(null);
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  const [forecastMonths, setForecastMonths] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [accData, allocData] = await Promise.all([getAccounts(), getAllocations()]);
      setAccounts(accData);
      setAllocations(allocData);
      if (accData.length > 0) {
        setSelectedAccount(accData[0].id);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleGenerateForecast = useCallback(() => {
    if (!selectedAccount || !allocations.length) return;
  
    const accountAllocations = allocations.flatMap((a) =>
      a.allocations.filter((alloc) => alloc.accountId === selectedAccount)
    );
    const baseFte = accountAllocations.reduce((sum, alloc) => sum + alloc.fte, 0);
    const fteForProjection = baseFte > 0 ? baseFte : 10;
  
    const newChartData = ALL_MONTHS.map(m => ({ month: m }));
    const newChartConfig: ChartConfig = {};
    
    // Generate 5 forecast lines, one for each month from Jan to May.
    const forecastsToGenerate = 5;
  
    for (let i = 0; i < forecastsToGenerate; i++) {
      const forecastLabel = `Forecast from ${ALL_MONTHS[i]}`;
      const solidDataKey = `solid-${i}`;
      const dottedDataKey = `dotted-${i}`;
  
      newChartConfig[solidDataKey] = {
        label: forecastLabel,
        color: COLORS[i],
      };
      
      const monthBaseFte = fteForProjection * (1 + (i * 0.05));
      let lastValue = 0;
  
      for (let j = 0; j < 12; j++) {
        if (j <= i) {
          // This is "actual" data.
          const value = monthBaseFte * (1 + (j * 0.02));
          lastValue = parseFloat(value.toFixed(2));
          newChartData[j][solidDataKey] = lastValue;
          newChartData[j][dottedDataKey] = null;
        } else {
          // This is projected data, based on the previous month's value.
          const variation = (Math.random() * 0.1) - 0.05;
          const projectedValue = lastValue * (1 + variation);
          lastValue = parseFloat(projectedValue.toFixed(2));
          newChartData[j][solidDataKey] = null;
          newChartData[j][dottedDataKey] = lastValue;
        }
  
        // Create the connecting point where solid turns to dotted.
        if (j === i) {
          newChartData[j][dottedDataKey] = newChartData[j][solidDataKey];
        }
      }
    }
    
    setChartData(newChartData);
    setChartConfig(newChartConfig);
    setForecastMonths(forecastsToGenerate);
  }, [selectedAccount, allocations]);
  
  // Automatically generate forecast on initial load for demo purposes
  useEffect(() => {
    if (selectedAccount && allocations.length > 0) {
      handleGenerateForecast();
    }
  }, [selectedAccount, allocations, handleGenerateForecast]);

  const handleExport = () => {
    if (!chartData || !chartConfig) return;

    // 1. Get headers from chartConfig
    const headers = ['Month'];
    const forecastLabels = Object.values(chartConfig).map(config => config.label as string);
    headers.push(...forecastLabels);

    // 2. Build CSV rows
    const rows = chartData.map(dataPoint => {
        const row = [dataPoint.month];
        for (let i = 0; i < forecastLabels.length; i++) {
            const solidKey = `solid-${i}`;
            const dottedKey = `dotted-${i}`;
            const value = dataPoint[solidKey] ?? dataPoint[dottedKey] ?? '';
            row.push(value);
        }
        return row.join(',');
    });

    // 3. Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');

    // 4. Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8,' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const accountName = accounts.find(a => a.id === selectedAccount)?.name || 'forecast';
    link.setAttribute('href', url);
    link.setAttribute('download', `${accountName.replace(/\s+/g, '_')}_forecast.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedAccountName = accounts.find(a => a.id === selectedAccount)?.name || '';

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="FTE Forecasting"
        description="Generate FTE forecast projections based on trends from prior months."
      />
      <Card>
        <CardHeader>
          <CardTitle>Generate Forecast</CardTitle>
          <CardDescription>
            Select an account to generate forecast projections for the year. Each line represents a forecast based on the trend up to that month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading accounts...</p>
          ) : (
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
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerateForecast} disabled={!selectedAccount || loading}>
            Generate Forecast
          </Button>
        </CardFooter>
      </Card>

      {chartData && chartConfig && (
        <Card>
          <CardHeader>
            <CardTitle>Forecast for {selectedAccountName}</CardTitle>
            <CardDescription>
              Solid lines represent historical data; dotted lines represent projections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
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
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <Tooltip
                    cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
                    content={<ChartTooltipContent />}
                  />
                  <Legend content={<ChartLegendContent />} />
                  
                  {Array.from({ length: forecastMonths }).map((_, i) => (
                    <React.Fragment key={`forecast-series-${i}`}>
                      <Line
                        dataKey={`solid-${i}`}
                        type="monotone"
                        stroke={`var(--color-solid-${i})`}
                        strokeWidth={2}
                        dot={false}
                        name={chartConfig[`solid-${i}`]?.label as string}
                        connectNulls={false}
                      />
                      <Line
                        dataKey={`dotted-${i}`}
                        type="monotone"
                        stroke={`var(--color-solid-${i})`}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name={chartConfig[`solid-${i}`]?.label as string}
                        connectNulls={false}
                        legendType="none"
                      />
                    </React.Fragment>
                  ))}

                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">This is a system-generated forecast. To improve accuracy for future projections, ensure weekly allocations are always up-to-date.</p>
            <Button onClick={handleExport} disabled={!chartData} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Forecast
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
