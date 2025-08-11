
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, ChevronDown, Upload } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BulkUploadDialog } from '@/components/team/bulk-upload-dialog';
import { TeamContent } from '@/components/team/team-content';


export default function TeamPage() {
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  
  return (
    <>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Team Management"
          description="View and manage your team."
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <span>Add Employee</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <PlusCircle className="h-4 w-4" />
                  <span>Add Single Employee</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsBulkUploadOpen(true)}>
                  <Upload className="h-4 w-4" />
                  <span>Bulk Upload</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
        <TeamContent />
      </div>
      <BulkUploadDialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen} />
    </>
  );
}
