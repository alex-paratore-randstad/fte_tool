
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
import type { NavGroup, NavItem } from '@/types/navigation';
import { Skeleton } from '../ui/skeleton';

const navGroups: NavGroup[] = [
  {
    title: 'Allocations',
    roles: ['admin', 'manager', 'vp'],
    items: [
      { href: '/allocation', label: 'Weekly Allocation' },
      { href: '/bulk-allocation', label: 'Bulk Allocation' },
      { href: '/monthly-freshservice-allocation', label: 'Monthly Freshservice Allocation' },
      { href: '/monthly-ratio-allocation', label: 'Monthly Client Ratio Allocation' },
      { href: '/weekly-targets', label: 'Weekly Targets' },
      { href: '/bulk-targets', label: 'Bulk Targets' },
    ]
  },
  {
    title: 'Management',
    roles: ['admin', 'manager', 'vp'],
    items: [
      { href: '/team', label: 'Team Management' },
      { href: '/cost-centers', label: 'Client Management', roles: ['admin'] },
      { href: '/title_management', label: 'Title Management', roles: ['admin', 'manager'] },
    ]
  },
  {
    title: 'User Resources',
    roles: ['admin', 'manager', 'vp'],
    items: [
      { 
        href: 'https://docs.google.com/presentation/d/1wtHy8p1X_fJkA6zQcadK330emwfL9SGIzNtnWYu3I4w/edit', 
        label: 'Knowledge Base' 
      },
    ]
  }
];

export function TopNav() {
  const pathname = usePathname();
  const { currentUser, loading } = useCurrentUser();

  const getHref = (href: string) => {
    if (!href) return '/index.html';
    if (href.startsWith('http')) return href;
    const cleanHref = typeof href === 'string' ? href : '/index.html';
    if (cleanHref === '/') return '/index.html';
    return `${cleanHref.endsWith('/') ? cleanHref : `${cleanHref}/`}index.html`;
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href.startsWith('http')) return false;
    
    const normalize = (p: any) => {
        if (!p || typeof p !== 'string') return '';
        let clean = p.replace(/\/index\.html$/, '');
        clean = clean.replace(/\/+$/, '');
        return clean || '/';
    };

    const currentPath = normalize(pathname);
    const targetPath = normalize(href);

    if (targetPath === '/') {
        return currentPath === '/' || currentPath === '';
    }

    return currentPath === targetPath;
  };
  
  const userHasAccess = (roles?: string[]) => {
    if (loading || !currentUser || !currentUser.role) return false;
    if (!roles) return true; // No roles defined means public
    return roles.includes(currentUser.role);
  };
  
  const isGroupActive = (items: NavItem[]) => {
      if (!items || !Array.isArray(items)) return false;
      return items.some(item => item && isActive(item.href));
  }

  if (loading) {
    return (
       <div className='flex items-center space-x-4 lg:space-x-6'>
         <Skeleton className="h-4 w-24 bg-muted rounded" />
         <Skeleton className="h-4 w-24 bg-muted rounded" />
         <Skeleton className="h-4 w-24 bg-muted rounded" />
         <Skeleton className="h-4 w-24 bg-muted rounded" />
       </div>
    );
  }

  return (
    <>
        <Link
          href={getHref('/')}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            isActive('/') ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          Dashboard
        </Link>
      
      {navGroups.map(group => (
        group && userHasAccess(group.roles) ? (
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
                    {(group.items || []).filter(item => item && userHasAccess(item.roles)).map(item => (
                        <DropdownMenuItem key={item.href} asChild>
                            {item.href.startsWith('http') ? (
                              <a 
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                              >
                                {item.label}
                              </a>
                            ) : (
                              <Link 
                                  href={getHref(item.href)} 
                                  className={cn(isActive(item.href) && "font-semibold")}
                              >
                                {item.label}
                              </Link>
                            )}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        ) : null
      ))}
    </>
  );
}
