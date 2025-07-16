
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload } from 'lucide-react';

type BulkCostCenterUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const csvTemplate = 'code,name\nP-DELTA,Project Delta\nP-ECHO,Project Echo';
const csvDataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplate)}`;

export function BulkCostCenterUploadDialog({ open, onOpenChange }: BulkCostCenterUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;

    // In a real application, you would parse the CSV and create new cost centers.
    // The logic should check for existing codes and only add new ones.
    toast({
      title: 'Upload Successful',
      description: `${file.name} has been processed. New cost centers have been added.`,
    });

    setFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Cost Centers</DialogTitle>
          <DialogDescription>
            Upload a CSV file to add multiple cost centers. The upload will not
            update existing cost centers.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="flex items-center justify-center">
            <a
              href={csvDataUri}
              download="cost_center_template.csv"
              className="inline-flex items-center justify-center text-sm font-medium text-primary hover:underline"
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV Template
            </a>
          </div>
          <div className="grid w-full items-center gap-2">
            <Label htmlFor="csv-upload">Upload CSV File</Label>
            <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} />
             {file && <p className="text-sm text-muted-foreground">Selected file: {file.name}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file}>
            <Upload className="mr-2 h-4 w-4" />
            Upload and Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
