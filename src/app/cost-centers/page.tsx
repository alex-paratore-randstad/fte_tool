
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { getCostCenters } from '@/services/data';
import type { CostCenter } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BulkCostCenterUploadDialog } from '@/components/cost-centers/bulk-cost-center-upload-dialog';

export default function CostCenterPage() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCostCenters().then(data => {
        setCostCenters(data);
        setLoading(false);
    });
  }, []);

  return (
    <>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Cost Center Management"
          description="View and manage all cost centers."
          actions={
            <Button onClick={() => setIsBulkUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV
            </Button>
          }
        />
        <Card>
          <CardHeader>
            <CardTitle>All Cost Centers</CardTitle>
            <CardDescription>
                View and add new cost centers via CSV upload.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading cost centers...</p>
            ) : (
              <ScrollArea className="h-96">
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
            )}
          </CardContent>
        </Card>
      </div>
      <BulkCostCenterUploadDialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen} />
    </>
  );
}
