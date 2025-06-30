
'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Link as LinkIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useCurrentUser } from '@/hooks/use-current-user';

export default function SettingsPage() {
  const { toast } = useToast();
  const { currentUser } = useCurrentUser();

  const handleDomoConnect = () => {
    toast({
      title: 'Connecting to DOMO',
      description: 'In a real DOMO environment, this would initiate the authentication process. The next step is to deploy this app as a DOMO app.',
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Settings"
        description="Manage your account settings and application preferences."
      />
      <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                This is how others will see you on the site.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
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
            </CardContent>
            <CardFooter className="border-t pt-6">
                <Button>Save Profile</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>DOMO Integration</CardTitle>
              <CardDescription>
                Connect your FTE Vision app to your DOMO environment to sync data and enable integrated features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                By connecting to DOMO, you can pull live employee and account data directly from your DOMO datasets, replacing the current mock data.
              </p>
            </Content>
            <CardFooter className="border-t pt-6">
              <Button onClick={handleDomoConnect}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Connect to DOMO
              </Button>
            </CardFooter>
          </Card>
      </div>
    </div>
  );
}
