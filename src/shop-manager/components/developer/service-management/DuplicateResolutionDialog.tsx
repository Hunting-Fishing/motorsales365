
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@sm/components/ui/dialog';
import { Button } from '@sm/components/ui/button';
import { Badge } from '@sm/components/ui/badge';
import { Textarea } from '@sm/components/ui/textarea';
import { Label } from '@sm/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sm/components/ui/select';
import { ServiceMainCategory } from '@sm/types/service';
import { AlertTriangle, Merge, Trash2, Edit } from 'lucide-react';

interface DuplicateResolutionDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  categories: ServiceMainCategory[];
  onResolve: () => void;
}

export function DuplicateResolutionDialog({
  open,
  setOpen,
  categories,
  onResolve
}: DuplicateResolutionDialogProps) {
  const [action, setAction] = useState<'merge' | 'delete' | 'rename'>('merge');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Resolve Duplicates
          </DialogTitle>
          <DialogDescription>
            Select how you want to resolve duplicate services found in your data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Resolution Action</Label>
            <Select value={action} onValueChange={(value) => setAction(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="merge">
                  <div className="flex items-center gap-2">
                    <Merge className="h-4 w-4" />
                    Merge duplicates
                  </div>
                </SelectItem>
                <SelectItem value="delete">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete duplicates
                  </div>
                </SelectItem>
                <SelectItem value="rename">
                  <div className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Rename duplicates
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={onResolve}>
            Apply Resolution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
