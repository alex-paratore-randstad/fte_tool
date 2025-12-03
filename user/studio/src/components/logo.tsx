import { GanttChart } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <GanttChart className="h-6 w-6 text-primary" />
      <h1 className="text-lg font-bold tracking-tighter text-foreground whitespace-nowrap">
        Randstad FTE
      </h1>
    </div>
  );
}
