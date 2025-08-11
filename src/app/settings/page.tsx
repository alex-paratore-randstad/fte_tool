
'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  const { currentUser, loading } = useCurrentUser();

  return (
    <>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Settings"
          description="Manage your account settings and application preferences."
        />
        <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  This is how others will see you on the site.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {loading ? (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" defaultValue={currentUser.name} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue={`${currentUser.name.toLowerCase().replace(' ', '.')}@example.com`} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" defaultValue={currentUser.title} readOnly />
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="border-t pt-6">
                  <Button disabled={loading}>Save Profile</Button>
              </CardFooter>
            </Card>
        </div>
      </div>
    </>
  );
}
