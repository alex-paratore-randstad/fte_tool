'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { UserNav } from './user-nav';
import { SidebarNav } from './sidebar-nav';
import { Logo } from '../logo';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { LifeBuoy, LogOut } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter>
          <Separator className="my-2" />
           <div className="p-2 flex flex-col gap-1">
             <a href="#" className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-sidebar-accent">
                <LifeBuoy className="w-4 h-4" />
                <span>Support</span>
             </a>
             <a href="#" className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-sidebar-accent">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
             </a>
           </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6">
          <SidebarTrigger />
          <UserNav />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
