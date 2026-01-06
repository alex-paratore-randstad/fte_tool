
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', roles: ['admin', 'manager', 'vp'] },
  { href: '/allocation', label: 'Weekly Allocation', roles: ['admin', 'manager', 'vp'] },
  { href: '/weekly-forecast', label: 'Weekly Forecast', roles: ['admin', 'manager', 'vp'] },
  { href: '/bulk-allocation', label: 'Bulk Allocation', roles: ['admin', 'manager', 'vp'] },
  { href: '/monthly-freshservice-allocation', label: 'Monthly Freshservice Allocation', roles: ['admin', 'manager', 'vp'] },
  { href: '/monthly-ratio-allocation', label: 'Monthly Client Ratio Allocation', roles: ['admin', 'manager', 'vp'] },
  { href: '/team', label: 'Team Management', roles: ['admin', 'manager', 'vp'] },
  { href: '/cost-centers', label: 'Client Management', roles: ['admin'] },
  { href: '/title_management', label: 'Title Management', roles: ['admin', 'manager'] },
];

export function TopNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
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
  
  const filteredNavItems = navItems.filter(item => {
    if (loading || !currentUser || !currentUser.role) return false;
    return item.roles.includes(currentUser.role);
  });

  if (loading) {
    return (
       <nav className={cn('flex items-center space-x-4 lg:space-x-6', className)} {...props}>
         {Array.from({ length: 4 }).map((_, index) => (
           <div key={index} className="h-4 w-24 bg-muted rounded animate-pulse" />
         ))}
       </nav>
    )
  }

  return (
    <nav className={cn('flex items-center space-x-4 lg:space-x-6', className)} {...props}>
      {filteredNavItems.map(item => (
        <Link
          key={item.href}
          href={getHref(item.href)}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            isActive(item.href) ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
