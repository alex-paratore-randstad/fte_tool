'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarClock,
  BarChart3,
  Users,
  Settings,
} from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
} from '@/components/ui/sidebar';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/allocation', label: 'Weekly Allocation', icon: CalendarClock },
  { href: '/reporting', label: 'Reporting', icon: BarChart3 },
  { href: '/team', label: 'Team Management', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {navItems.map((item, index) => (
          <SidebarMenuItem key={`${item.label}-${index}`}>
            <SidebarMenuButton
              asChild
              className="w-full"
              isActive={item.href !== '#' && pathname === item.href}
              tooltip={item.label}
            >
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
