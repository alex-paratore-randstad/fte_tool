'use client';

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
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';

const chartData = [
  { month: 'Jan', 'Project Alpha': 150, 'Project Bravo': 120, 'Project Charlie': 80 },
  { month: 'Feb', 'Project Alpha': 160, 'Project Bravo': 130, 'Project Charlie': 85 },
  { month: 'Mar', 'Project Alpha': 170, 'Project Bravo': 135, 'Project Charlie': 90 },
  { month: 'Apr', 'Project Alpha': 165, 'Project Bravo': 140, 'Project Charlie': 95 },
  { month: 'May', 'Project Alpha': 180, 'Project Bravo': 145, 'Project Charlie': 100 },
  { month: 'Jun', 'Project Alpha': 185, 'Project Bravo': 150, 'Project Charlie': 105 },
];

const chartConfig = {
  'Project Alpha': {
    label: 'Project Alpha',
    color: 'hsl(var(--chart-1))',
  },
  'Project Bravo': {
    label: 'Project Bravo',
    color: 'hsl(var(--chart-2))',
  },
  'Project Charlie': {
    label: 'Project Charlie',
    color: 'hsl(var(--chart-3))',
  },
};

export default function FteAllocationChart() {
  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
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
            dataKey="Project Alpha"
            stackId="a"
            fill="var(--color-Project Alpha)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="Project Bravo"
            stackId="a"
            fill="var(--color-Project Bravo)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="Project Charlie"
            stackId="a"
            fill="var(--color-Project Charlie)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
