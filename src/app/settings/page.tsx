
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Link as LinkIcon, Upload } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getCostCenters } from '@/services/domo';
import type { CostCenter } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BulkCostCenterUploadDialog } from '@/components/settings/bulk-cost-center-upload-dialog';

export default function SettingsPage() {
  const { toast } = useToast();
  const { currentUser } = useCurrentUser();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  useEffect(() => {
    getCostCenters().then(setCostCenters);
  }, []);

  const handleDomoConnect = () => {
    toast({
      title: 'Connecting to DOMO',
      description: 'In a real DOMO environment, this would initiate the authentication process. The next step is to deploy this app as a DOMO app.',
    });
  };

  return (
    <>
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
                  Connect your Randstad FTE app to your DOMO environment to sync data and enable integrated features.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  By connecting to DOMO, you can pull live employee and account data directly from your DOMO datasets, replacing the current mock data.
                </p>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button onClick={handleDomoConnect}>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Connect to DOMO
                </Button>
              </CardFooter>
            </Card>
        </div>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Cost Center Management</CardTitle>
              <CardDescription>
                View and add new cost centers via CSV upload.
              </CardDescription>
            </div>
            <Button onClick={() => setIsBulkUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costCenters.map(cc => (
                    <TableRow key={cc.id}>
                      <TableCell className="font-mono">{cc.code}</TableCell>
                      <TableCell className="font-medium">{cc.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      <BulkCostCenterUploadDialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen} />
    </>
  );
}
