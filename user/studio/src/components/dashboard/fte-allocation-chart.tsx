
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
import { format, isValid, parseISO } from 'date-fns';

type FteAllocationChartProps = {
  data: any[];
};

// BRAND PALETTE LOGIC
const getBrandPalette = (count: number) => {
  if (count <= 1) return ['#255CA9'];
  if (count <= 3) return ['#255CA9', '#BAD808', '#007C82'];
  if (count === 4) return ['#255CA9', '#BAD808', '#007C82', '#B2CFF2'];
  if (count === 5) return ['#255CA9', '#BAD808', '#00C4CA', '#007C82', '#B2CFF2'];
  if (count === 6) return ['#255CA9', '#BAD808', '#00C4CA', '#007C82', '#B2CFF2', '#83A0C2'];
  if (count === 7) return ['#5887D8', '#255CA9', '#BAD808', '#00C4CA', '#007C82', '#B2CFF2', '#83A0C2'];
  if (count === 8) return ['#5887D8', '#255CA9', '#BAD808', '#5A7A00', '#00C4CA', '#007C82', '#B2CFF2', '#83A0C2'];
  if (count === 9) return ['#ABCFFE', '#5887D8', '#255CA9', '#BAD808', '#5A7A00', '#00C4CA', '#007C82', '#B2CFF2', '#83A0C2'];
  // Default for 10-12+ items
  return ['#ABCFFE', '#5887D8', '#255CA9', '#BAD808', '#88A800', '#5A7A00', '#8FEEF4', '#00C4CA', '#007C82', '#B2CFF2', '#83A0C2', '#415E7D'];
};

// SAFE KEY GENERATOR
const toSafeKey = (key: string) => {
  if (!key) return 'c_unknown';
  return 'c_' + String(key).toLowerCase().replace(/[^a-z0-9]/g, '_');
};


export default function FteAllocationChart({ data }: FteAllocationChartProps) {
  const { chartConfig, costCenters } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartConfig: {}, costCenters: [] };
    }

    // 1. Extract all unique cost center names
    const ccKeys = new Set<string>();
    data.forEach(week => {
      if (week) {
        Object.keys(week).forEach(key => {
          if (key !== 'name' && key !== 'undefined' && key !== 'null') {
            ccKeys.add(key);
          }
        });
      }
    });
    const uniqueCostCenters = Array.from(ccKeys).sort();

    // 2. Get the correct palette based on count
    const palette = getBrandPalette(uniqueCostCenters.length);

    // 3. Build the config using SAFE keys
    const config: ChartConfig = {};
    uniqueCostCenters.forEach((ccName, index) => {
      const safeKey = toSafeKey(ccName);
      config[safeKey] = {
        label: ccName,
        color: palette[index % palette.length],
      };
    });

    return { chartConfig: config, costCenters: uniqueCostCenters };
  }, [data]);

  // 4. Transform data to use the same SAFE keys
  const formattedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map(item => {
      if (!item) return { name: 'Unknown' };
      
      const dateStr = item.name ? String(item.name) : '';
      const date = parseISO(dateStr);
      
      const newItem: Record<string, any> = {
        name: isValid(date) ? format(date, 'MMM d') : (dateStr || 'Unknown'),
      };
      
      costCenters.forEach(cc => {
        const safeKey = toSafeKey(cc);
        newItem[safeKey] = item[cc] || 0;
      });
      return newItem;
    });
  }, [data, costCenters]);


  if (!data || data.length === 0) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
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
          {costCenters.map((cc) => {
            const safeKey = toSafeKey(cc);
            const color = chartConfig[safeKey]?.color;

            if (!color) return null;
            
            return (
              <Bar
                key={safeKey}
                dataKey={safeKey}
                stackId="a"
                fill={color}
                radius={[4, 4, 0, 0]}
              />
            )
          })}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
