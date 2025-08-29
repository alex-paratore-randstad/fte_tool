
'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

type SelectSearchProps = Omit<React.ComponentPropsWithoutRef<typeof Input>, 'onChange'> & {
  onChange: (value: string) => void;
};

export const SelectSearch = React.forwardRef<HTMLInputElement, SelectSearchProps>(
  ({ className, onChange, ...props }, ref) => {
    return (
      <div className="relative p-2">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={ref}
          placeholder="Search..."
          className={cn('w-full pl-8', className)}
          onChange={(e) => onChange(e.target.value)}
          // Stop propagation to prevent the dropdown from closing when clicking on the input
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          {...props}
        />
      </div>
    );
  }
);

SelectSearch.displayName = 'SelectSearch';
