
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
  FlaskConical,
  Database,
} from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
} from '@/components/ui/sidebar';
import { useCurrentUser } from '@/hooks/use-current-user';

const navItems = [
  { href: '/', label: 'Get Data', icon: Database, roles: ['admin', 'manager', 'vp'] },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'vp'] },
  { href: '/allocation', label: 'Weekly Allocation', icon: CalendarClock, roles: ['admin', 'manager', 'vp'] },
  { href: '/reporting', label: 'Reporting', icon: BarChart3, roles: ['admin', 'manager', 'vp'] },
  { href: '/team', label: 'Team Management', icon: Users, roles: ['admin', 'manager', 'vp'] },
  { href: '/cost-centers', label: 'Cost Centers', icon: Building, roles: ['admin'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'manager', 'vp'] },
  { href: '/admin', label: 'Admin', icon: Shield, roles: ['admin'] },
  { href: '/fte_prototype', label: 'FTE Prototype', icon: FlaskConical, roles: ['admin'] },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { currentUser } = useCurrentUser();

  const filteredNavItems = navItems.filter(item => {
    // Show 'Get Data' to everyone regardless of role, if it's the root page
    if (item.href === '/') return true;
    return item.roles.includes(currentUser.role)
  });

  const getHref = (href: string) => {
    // This logic ensures that links point directly to the index.html file,
    // bypassing the problematic server-side script.
    if (href === '/') return '/index.html';
    return `${href}/index.html`;
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {filteredNavItems.map((item, index) => (
          <SidebarMenuItem key={`${item.label}-${index}`}>
            <SidebarMenuButton
              asChild
              className="w-full"
              isActive={isActive(item.href)}
              tooltip={item.label}
            >
              <Link href={getHref(item.href)}>
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
