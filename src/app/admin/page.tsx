
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminPage() {
  const { isAdmin, loading } = useCurrentUser();

  if (loading) {
    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Admin"
                description="Application configuration and management."
            />
            <Card>
                <CardHeader>
                    <CardTitle><Skeleton className="h-6 w-1/4" /></CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-4 w-1/2" />
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
