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
  { month: 'Jan', projectAlpha: 150, projectBravo: 120, projectCharlie: 80 },
  { month: 'Feb', projectAlpha: 160, projectBravo: 130, projectCharlie: 85 },
  { month: 'Mar', projectAlpha: 170, projectBravo: 135, projectCharlie: 90 },
  { month: 'Apr', projectAlpha: 165, projectBravo: 140, projectCharlie: 95 },
  { month: 'May', projectAlpha: 180, projectBravo: 145, projectCharlie: 100 },
  { month: 'Jun', projectAlpha: 185, projectBravo: 150, projectCharlie: 105 },
];

const chartConfig = {
  projectAlpha: {
    label: 'Project Alpha',
    color: 'hsl(var(--chart-1))',
  },
  projectBravo: {
    label: 'Project Bravo',
    color: 'hsl(var(--chart-2))',
  },
  projectCharlie: {
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
            dataKey="projectAlpha"
            stackId="a"
            fill="var(--color-projectAlpha)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="projectBravo"
            stackId="a"
            fill="var(--color-projectBravo)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="projectCharlie"
            stackId="a"
            fill="var(--color-projectCharlie)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
