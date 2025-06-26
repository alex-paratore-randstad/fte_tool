'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarClock,
  BarChart3,
  TrendingUp,
  Users,
  Settings,
} from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/allocation', label: 'Weekly Allocation', icon: CalendarClock },
  { href: '/reporting', label: 'Reporting', icon: BarChart3 },
  { href: '/forecasting', label: 'Forecasting', icon: TrendingUp },
  { href: '/team', label: 'Team Management', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} legacyBehavior passHref>
            <SidebarMenuButton
              asChild
              className="w-full"
              isActive={pathname === item.href}
              tooltip={item.label}
            >
              <a className={cn(pathname === item.href && 'bg-sidebar-accent text-sidebar-accent-foreground')}>
                <item.icon className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </a>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
