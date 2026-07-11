import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const snapshotSchema = z.object({
  snapshot_type: z.string().min(1, 'Type is required'),
  notes: z.string().optional(),
});

type SnapshotFormData = z.infer<typeof snapshotSchema>;

interface CreateSnapshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SnapshotFormData) => void;
  isLoading?: boolean;
}

const SNAPSHOT_TYPES = [
  { value: 'baseline', label: 'Baseline - Initial project baseline' },
  { value: 'monthly', label: 'Monthly - Regular monthly snapshot' },
  { value: 'milestone', label: 'Milestone - Project milestone reached' },
  { value: 'change_order', label: 'Change Order - After budget change' },
  { value: 'manual', label: 'Manual - Custom snapshot' },
];

export function CreateSnapshotDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateSnapshotDialogProps) {
  const form = useForm<SnapshotFormData>({
    resolver: zodResolver(snapshotSchema),
    defaultValues: {
      snapshot_type: 'manual',
      notes: '',
    },
  });

  const handleSubmit = (data: SnapshotFormData) => {
    onSubmit(data);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Budget Snapshot</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="snapshot_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Snapshot Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SNAPSHOT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add notes about this snapshot..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Snapshot'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
