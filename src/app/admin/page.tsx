
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { TeamMember } from '@/types';

type Manager = {
    id: string;
    name: string;
}

export default function AdminPage() {
  const { isAdmin, loading } = useCurrentUser();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [impersonatedId, setImpersonatedId] = useState<string | null>(null);
  const [fetchingManagers, setFetchingManagers] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // This local domo object MUST be defined inside a client-side hook or event handler
    // to prevent server-side execution during build, which causes deployment to fail.
    const baseUrl = 'https://c5899a60-de1d-42af-b19b-99f8dff54fad.domoapps.prod10.domo.com';
    const domo = {
      get: async (url: string) => {
        const rUrl = `${baseUrl}${url}`;
        const response = await fetch(rUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      }
    };
    
    async function getManagers() {
        if (!isAdmin) return;
        try {
            const allEmployees: TeamMember[] = await domo.get(`/data/v1/gbs_ind_hr_fte_report`);
            const managerMap = new Map<string, string>();
            allEmployees.forEach(emp => {
                if(emp.First_Reviewer_Code && emp.First_Reviewer_Name) {
                    managerMap.set(emp.First_Reviewer_Code, emp.First_Reviewer_Name);
                }
            });
            const uniqueManagers = Array.from(managerMap, ([id, name]) => ({ id, name }));
            setManagers(uniqueManagers);
        } catch (error) {
            console.error("Failed to fetch managers", error);
            toast({ variant: 'destructive', title: "Failed to fetch manager list."});
        } finally {
            setFetchingManagers(false);
        }
    }

    if (!loading) {
        getManagers();
        setImpersonatedId(localStorage.getItem('impersonated_user_id'));
    }
  }, [isAdmin, loading, toast]);
  
  const handleImpersonate = (userId: string) => {
    if(!userId) return;
    localStorage.setItem('impersonated_user_id', userId);
    window.location.reload();
  }

  const handleClearImpersonation = () => {
    localStorage.removeItem('impersonated_user_id');
    window.location.reload();
  }


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
        <div className="grid gap-6 md:grid-cols-2">
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
            <Card>
                <CardHeader>
                    <CardTitle>Impersonation</CardTitle>
                    <CardDescription>
                        Select a manager to view the application as them. This is for development and testing only.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   {impersonatedId && (
                     <Alert>
                        <Users className="h-4 w-4" />
                        <AlertTitle>You are impersonating a user</AlertTitle>
                        <AlertDescription>
                            All actions will be performed as the selected user. Clear impersonation to return to your own account.
                        </AlertDescription>
                    </Alert>
                   )}
                    <div className="space-y-2">
                        <Label>Select Manager to Impersonate</Label>
                        <div className='flex gap-2'>
                            <Select onValueChange={handleImpersonate} disabled={fetchingManagers}>
                                <SelectTrigger>
                                    <SelectValue placeholder={fetchingManagers ? "Loading managers..." : "Select a manager"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {managers.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={handleClearImpersonation} variant="outline" disabled={!impersonatedId}>
                                Clear
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
