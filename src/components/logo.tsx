
import { GanttChart } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <GanttChart className="h-6 w-6 text-primary" />
      <span className="font-bold tracking-tight text-foreground whitespace-nowrap">
        Randstad FTE
      </span>
    </div>
  );
}
