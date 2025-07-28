
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function AdminPage() {
  const { isAdmin } = useCurrentUser();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Admin"
                description="Application configuration and management."
            />
            <Card>
                <CardHeader>
                    <CardTitle>Loading...</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Verifying permissions...</p>
                </CardContent>
            </Card>
        </div>
    )
  }

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
                <CardTitle>Application Status</CardTitle>
                <CardDescription>
                    All systems are operational.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>This page is reserved for future administrative functions.</p>
            </CardContent>
        </Card>
    </div>
  );
}
