
'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,
  ChartConfig,
} from '@/components/ui/chart';
import { Skeleton } from '../ui/skeleton';
import { format } from 'date-fns';

type FteAllocationChartProps = {
  data: any[];
};

const chartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

// Helper to create a CSS-friendly key from a string
const toCssKey = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '-');

export default function FteAllocationChart({ data }: FteAllocationChartProps) {
  const { chartConfig, costCenters } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartConfig: {}, costCenters: [] };
    }

    const ccKeys = new Set<string>();
    data.forEach(week => {
      Object.keys(week).forEach(key => {
        if (key !== 'name') {
          ccKeys.add(key);
        }
      });
    });

    const uniqueCostCenters = Array.from(ccKeys).sort();
    const config: ChartConfig = {};
    
    uniqueCostCenters.forEach((cc, index) => {
      const key = toCssKey(cc);
      config[key] = {
        label: cc,
        color: chartColors[index % chartColors.length],
      };
    });

    return { chartConfig: config, costCenters: uniqueCostCenters };
  }, [data]);

  const formattedData = useMemo(() => {
    if (!data.length) return [];
    
    // Rename data keys to match sanitized chartConfig keys
    return data.map(item => {
      const newItem: Record<string, any> = {
        name: item.name ? format(new Date(item.name), 'MMM d') : 'Unknown Date',
      };
      for (const key in item) {
        if (key !== 'name') {
          newItem[toCssKey(key)] = item[key];
        }
      }
      return newItem;
    });
  }, [data]);

  if (!data || data.length === 0) {
    return <Skeleton className="h-[300px] w-full" />;
  }
  
  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <ResponsiveContainer>
        <BarChart data={formattedData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
          <XAxis
            dataKey="name"
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
          {costCenters.map(cc => {
            const cssKey = toCssKey(cc);
            return (
             <Bar
                key={cssKey}
                dataKey={cssKey}
                stackId="a"
                fill={`var(--color-${cssKey})`}
                radius={[4, 4, 0, 0]}
            />
          )})}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
