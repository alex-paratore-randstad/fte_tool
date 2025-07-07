'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const changeTextVariants = cva(
  'text-xs',
  {
    variants: {
      variant: {
        default: 'text-muted-foreground',
        destructive: 'text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface SummaryCardProps extends VariantProps<typeof changeTextVariants> {
  title: string;
  value: string;
  icon: LucideIcon;
  change?: string;
};

export default function SummaryCard({
  title,
  value,
  icon: Icon,
  change,
  variant,
}: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={cn(changeTextVariants({ variant }))}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
