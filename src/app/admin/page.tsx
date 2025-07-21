
'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

const domoConfig = {
  clientId: process.env.NEXT_PUBLIC_DOMO_CLIENT_ID || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  clientSecret: '**********', // Should be stored securely, not in code
  apiHost: 'api.domo.com',
  scope: 'data user',
};

const datasets = [
    { name: 'FTE Allocations', guid: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' },
    { name: 'Cost Center Master', guid: 'b2c3d4e5-f6a7-8901-2345-67890abcdef0' },
    { name: 'Employee Roster', guid: 'c3d4e5f6-a7b8-9012-3456-7890abcdef01' },
    { name: 'Store Example Data', guid: 'd4e5f6a7-b8c9-0123-4567-890abcdef012' },
]

export default function AdminPage() {
  const { isAdmin } = useCurrentUser();

  if (!isAdmin) {
    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Admin"
                description="Application configuration and management."
            />
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                    You do not have permission to view this page. Please contact an administrator.
                </AlertDescription>
            </Alert>
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
        <PageHeader
            title="Admin"
            description="Application configuration and management."
        />
        <Card>
            <CardHeader>
                <CardTitle>Application Configuration</CardTitle>
                <CardDescription>
                    Connection details and GUIDs for data integration. These values are placeholders.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
               <div className="grid gap-2">
                    <h3 className="font-semibold">API Credentials</h3>
                    <div className="text-sm text-muted-foreground grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                            <span className="font-mono bg-muted p-1 rounded-md">Client ID:</span> {domoConfig.clientId}
                        </div>
                         <div>
                            <span className="font-mono bg-muted p-1 rounded-md">API Host:</span> {domoConfig.apiHost}
                        </div>
                        <div>
                            <span className="font-mono bg-muted p-1 rounded-md">Client Secret:</span> {domoConfig.clientSecret}
                        </div>
                        <div>
                           <span className="font-mono bg-muted p-1 rounded-md">Scope:</span> {domoConfig.scope}
                        </div>
                    </div>
               </div>
                <div className="grid gap-2">
                    <h3 className="font-semibold">Dataset GUIDs</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                       {datasets.map(ds => (
                           <li key={ds.guid}>
                               <span>{ds.name}: </span>
                               <span className="font-mono bg-muted p-1 rounded-md">{ds.guid}</span>
                           </li>
                       ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
