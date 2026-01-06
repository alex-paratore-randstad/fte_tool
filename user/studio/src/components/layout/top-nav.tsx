
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '../ui/button';
import { ChevronDown } from 'lucide-react';
import type { NavGroup } from './app-shell-client';


export function TopNav({ className, navGroups, ...props }: React.HTMLAttributes<HTMLElement> & { navGroups: NavGroup[] }) {
  const pathname = usePathname();
  const { currentUser, loading } = useCurrentUser();

  const getHref = (href: string) => {
    if (href === '/') return '/index.html';
    return `${href.endsWith('/') ? href : `${href}/`}index.html`;
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/index.html' || pathname === '/';
    }
    const cleanedPathname = pathname.endsWith('/index.html') ? pathname.slice(0, -11) : pathname;
    return cleanedPathname === href;
  };
  
  const userHasAccess = (roles?: string[]) => {
    if (loading || !currentUser.role) return false;
    if (!roles) return true; // No roles defined means public
    return roles.includes(currentUser.role);
  };
  
  const isGroupActive = (items: { href: string }[]) => {
      return items.some(item => isActive(item.href));
  }

  if (loading) {
    return (
       <nav className={cn('flex items-center space-x-2 lg:space-x-4', className)} {...props}>
         {Array.from({ length: 4 }).map((_, index) => (
           <div key={index} className="h-4 w-24 bg-muted rounded animate-pulse" />
         ))}
       </nav>
    )
  }

  return (
    <nav className={cn('flex items-center space-x-2 lg:space-x-4', className)} {...props}>
        <Link
          href={getHref('/')}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            isActive('/') ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          Dashboard
        </Link>
      
      {navGroups.filter(group => userHasAccess(group.roles)).map(group => (
        <DropdownMenu key={group.title}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={cn(
                    "text-sm font-medium h-auto p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0",
                    isGroupActive(group.items) ? "text-primary" : "text-muted-foreground"
                )}>
                    {group.title}
                    <ChevronDown className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                {group.items.filter(item => userHasAccess(item.roles)).map(item => (
                    <DropdownMenuItem key={item.href} asChild>
                        <Link href={getHref(item.href)} className={cn(isActive(item.href) && "font-semibold")}>
                          {item.label}
                        </Link>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
      ))}
    </nav>
  );
}
