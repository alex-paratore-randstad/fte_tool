
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarClock,
  BarChart3,
  Users,
  Settings,
  Building,
  Shield,
} from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
} from '@/components/ui/sidebar';
import { useCurrentUser } from '@/hooks/use-current-user';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'vp'] },
  { href: '/allocation', label: 'Weekly Allocation', icon: CalendarClock, roles: ['admin', 'manager', 'vp'] },
  { href: '/reporting', label: 'Reporting', icon: BarChart3, roles: ['admin', 'manager', 'vp'] },
  { href: '/team', label: 'Team Management', icon: Users, roles: ['admin', 'manager', 'vp'] },
  { href: '/cost-centers', label: 'Cost Centers', icon: Building, roles: ['admin'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'manager', 'vp'] },
  { href: '/admin', label: 'Admin', icon: Shield, roles: ['admin'] },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { currentUser } = useCurrentUser();

  const filteredNavItems = navItems.filter(item => item.roles.includes(currentUser.role));

  return (
    <SidebarGroup>
      <SidebarMenu>
        {filteredNavItems.map((item, index) => (
          <SidebarMenuItem key={`${item.label}-${index}`}>
            <SidebarMenuButton
              asChild
              className="w-full"
              isActive={item.href === '/' ? pathname === '/dashboard' : pathname.startsWith(item.href)}
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
