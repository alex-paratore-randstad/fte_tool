
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
} from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
} from '@/components/ui/sidebar';
import { useCurrentUser } from '@/hooks/use-current-user';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'vp'] },
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
  const { currentUser, loading } = useCurrentUser();

  if (loading) {
    return (
      <SidebarGroup>
          <SidebarMenu>
            {Array.from({ length: 5 }).map((_, index) => (
                <SidebarMenuItem key={index}>
                    <SidebarMenuButton tooltip="Loading..." asChild>
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                            <span className="bg-muted h-4 w-24 rounded animate-pulse" />
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
          </SidebarMenu>
      </SidebarGroup>
    )
  }

  const filteredNavItems = navItems.filter(item => {
    if (!currentUser || !currentUser.role) return false;
    return item.roles.includes(currentUser.role)
  });

  const getHref = (href: string) => {
    if (href === '/') return '/index.html';
    return `${href.endsWith('/') ? href : `${href}/`}index.html`;
  }

  const isActive = (href: string) => {
    if (href === '/') {
        return pathname === '/index.html' || pathname === '/';
    }
    const cleanedPathname = pathname.endsWith('/index.html') ? pathname.slice(0, -11) : pathname;
    return cleanedPathname === href;
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
