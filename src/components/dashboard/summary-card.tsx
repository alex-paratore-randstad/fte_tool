import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type SummaryCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  change?: string;
  variant?: 'default' | 'destructive';
};

export default function SummaryCard({
  title,
  value,
  icon: Icon,
  change,
  variant = 'default',
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
          <p
            className={cn(
              'text-xs text-muted-foreground',
              variant === 'destructive' && 'text-destructive'
            )}
          >
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
