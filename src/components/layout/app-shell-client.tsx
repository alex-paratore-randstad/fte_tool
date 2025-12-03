
'use client';

import { UserNav } from './user-nav';
import { TopNav } from './top-nav';
import { Logo } from '../logo';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '../ui/button';
import { Menu } from 'lucide-react';
import Link from 'next/link';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/allocation', label: 'Weekly Allocation' },
  { href: '/bulk-allocation', label: 'Bulk Allocation' },
  { href: '/ticket-allocation', label: 'Ticket Allocation' },
  { href: '/team', label: 'Team Management' },
  { href: '/cost-centers', label: 'Cost Centers' },
  { href: '/title_management', label: 'Title Management' },
];

const getHref = (href: string) => {
    if (href === '/') return '/index.html';
    return `${href.endsWith('/') ? href : `${href}/`}index.html`;
};

export function AppShellClient({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link href={getHref('/')} className="flex items-center gap-2 text-lg font-semibold md:text-base">
            <Logo />
            <span className="sr-only">Randstad FTE</span>
          </Link>
          <TopNav />
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
          <SheetContent side="left">
            <nav className="grid gap-6 text-lg font-medium">
              <Link href={getHref('/')} className="flex items-center gap-2 text-lg font-semibold">
                 <Logo />
                 <span className="sr-only">Randstad FTE</span>
              </Link>
              {navItems.map(item => (
                 <Link key={item.href} href={getHref(item.href)} className="text-muted-foreground hover:text-foreground">
                    {item.label}
                 </Link>
              ))}
            </nav>
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
