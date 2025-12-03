
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarClock,
  Users,
  Building,
  FlaskConical,
  CaseUpper,
  Layers,
  Ticket,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'vp'] },
  { href: '/allocation', label: 'Weekly Allocation', icon: CalendarClock, roles: ['admin', 'manager', 'vp'] },
  { href: '/bulk-allocation', label: 'Bulk Allocation', icon: Layers, roles: ['admin', 'manager', 'vp'] },
  { href: '/ticket-allocation', label: 'Ticket Allocation', icon: Ticket, roles: ['admin', 'manager', 'vp'] },
  { href: '/team', label: 'Team Management', icon: Users, roles: ['admin', 'manager', 'vp'] },
  { href: '/cost-centers', label: 'Cost Centers', icon: Building, roles: ['admin'] },
  { href: '/title_management', label: 'Title Management', icon: FlaskConical, roles: ['admin', 'manager'] },
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
    if (!currentUser || !currentUser.role) return false;
    return item.roles.includes(currentUser.role);
  });

  return (
    <nav className={cn('flex items-center space-x-4 lg:space-x-6 mx-6', className)} {...props}>
      {loading ? null : filteredNavItems.map(item => (
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
