
import { AppShellClient } from './app-shell-client';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return <AppShellClient>{children}</AppShellClient>;
}
