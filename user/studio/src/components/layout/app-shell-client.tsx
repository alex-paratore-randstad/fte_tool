
'use client';

import { UserNav } from './user-nav';
import { TopNav } from './top-nav';
import { Logo } from '../logo';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '../ui/button';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export type NavItem = {
  href: string;
  label: string;
  roles?: ('admin' | 'manager' | 'vp')[];
};

export type NavGroup = {
  title: string;
  roles: ('admin' | 'manager' | 'vp')[];
  items: NavItem[];
};


const navGroups: NavGroup[] = [
  {
    title: 'Allocations',
    roles: ['admin', 'manager', 'vp'],
    items: [
      { href: '/allocation', label: 'Weekly Allocation' },
      { href: '/bulk-allocation', label: 'Bulk Allocation' },
      { href: '/monthly-freshservice-allocation', label: 'Monthly Freshservice Allocation' },
      { href: '/monthly-ratio-allocation', label: 'Monthly Client Ratio Allocation' },
    ]
  },
  {
    title: 'Forecasts',
    roles: ['admin', 'manager', 'vp'],
    items: [
      { href: '/weekly-forecast', label: 'Weekly Forecast' },
      { href: '/bulk-forecast', label: 'Bulk Forecast' },
    ]
  },
  {
    title: 'Management',
    roles: ['admin', 'manager', 'vp'],
    items: [
      { href: '/team', label: 'Team Management', roles: ['admin', 'manager', 'vp'] },
      { href: '/cost-centers', label: 'Client Management', roles: ['admin'] },
      { href: '/title_management', label: 'Title Management', roles: ['admin', 'manager'] },
    ]
  }
];

const getHref = (href: string) => {
    if (href === '/') return '/index.html';
    return `${href.endsWith('/') ? href : `${href}/`}index.html`;
};

export function AppShellClient({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useCurrentUser();
  const pathname = usePathname();

  const userHasAccess = (roles?: string[]) => {
    if (loading || !currentUser.role) return false;
    if (!roles) return true; // No roles defined means public
    return roles.includes(currentUser.role);
  };
  
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/index.html' || pathname === '/';
    }
    const cleanedPathname = pathname.endsWith('/index.html') ? pathname.slice(0, -11) : pathname;
    return cleanedPathname === href;
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link href={getHref('/')} className="flex items-center gap-2 text-lg font-semibold md:text-base">
            <Logo />
          </Link>
          <TopNav navGroups={navGroups} />
        </nav>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <div className="flex h-full flex-col">
              <div className="p-6">
                 <Link href={getHref('/')} className="flex items-center gap-2 text-lg font-semibold">
                   <Logo />
                </Link>
              </div>
              <div className="flex-1 overflow-y-auto px-6">
                <nav className="grid gap-2 text-lg font-medium">
                  <Link href={getHref('/')} className={cn("flex items-center gap-4 rounded-xl px-3 py-2 text-base", isActive('/') ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                      Dashboard
                  </Link>
                  <Accordion type="multiple" className="w-full">
                    {navGroups.map(group => (
                      <AccordionItem value={group.title} key={group.title} className="border-b-0">
                        <AccordionTrigger className="py-2 text-base hover:no-underline text-muted-foreground hover:text-foreground [&[data-state=open]]:text-foreground">
                          {group.title}
                        </AccordionTrigger>
                        <AccordionContent className="pl-4 pb-0">
                          <div className="flex flex-col gap-1">
                            {!loading && group.items.filter(item => userHasAccess(item.roles)).map(item => (
                              <Link key={item.href} href={getHref(item.href)} className={cn("block rounded-lg p-3 text-sm", isActive(item.href) ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </nav>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
            <div className="ml-auto flex-1 sm:flex-initial" />
          <UserNav />
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
    </div>
  );
}
