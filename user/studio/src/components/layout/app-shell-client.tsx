
'use client';

import { UserNav } from './user-nav';
import { TopNav } from './top-nav';
import { Logo } from '../logo';

export function AppShellClient({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
        <div className="flex items-center gap-2">
            <Logo />
        </div>
        <TopNav className="hidden md:flex" />
        <div className="flex-1" />
        <UserNav />
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
    </div>
  );
}
