
'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '../ui/button';
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
    ]
  },
  {
    title: 'Targets',
    roles: ['admin', 'manager', 'vp'],
    items: [
      { href: '/weekly-targets', label: 'Quarterly Targets' },
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
  }
];

const getHref = (href: string) => {
    if (!href) return '/index.html';
    const cleanHref = typeof href === 'string' ? href : '/index.html';
    if (cleanHref === '/') return '/index.html';
    const base = cleanHref.endsWith('/') ? cleanHref : `${cleanHref}/`;
    return `${base}index.html`;
};

export function TopNav() {
  const pathname = usePathname();
  const { currentUser, loading } = useCurrentUser();

  const isActive = useCallback((href: string) => {
    if (!pathname) return false;
    
    const normalize = (p: any) => {
        if (!p || typeof p !== 'string') return '';
        let clean = p.split('?')[0].split('#')[0];
        clean = clean.replace(/\/index\.html$/, '');
        clean = clean.replace(/\/+$/, '');
        return clean || '/';
    };

    const currentPath = normalize(pathname);
    const targetPath = normalize(href);

    if (targetPath === '/') {
        return currentPath === '/' || currentPath === '';
    }

    return currentPath === targetPath;
  }, [pathname]);
  
  const userHasAccess = (roles?: string[]) => {
    if (loading || !currentUser || !currentUser.role) return false;
    if (!roles) return true;
    return roles.includes(currentUser.role);
  };
  
  const isGroupActive = (items: NavItem[]) => {
      if (!items || !Array.isArray(items)) return false;
      return items.some(item => item && isActive(item.href));
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
      
      {loading ? (
        <>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </>
      ) : navGroups.map((group, index) => (
          group && userHasAccess(group.roles) ? (
            <DropdownMenu key={index}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'p-0 text-sm font-medium h-auto hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0',
                    isGroupActive(group.items) ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {group.title}
                  <ChevronDown className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(group.items || []).filter(item => item && userHasAccess(item.roles)).map(item => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={getHref(item.href)} className={cn(isActive(item.href) && 'font-semibold')}>
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null
        ))}
    </>
  );
}
