import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useProjectDetails } from '@/hooks/useProjectBudgets';
import { formatCurrency } from '@/lib/utils';

const formSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  description: z.string().optional(),
  amount_change: z.number(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateChangeOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentBudget: number;
}

export function CreateChangeOrderDialog({ 
  open, 
  onOpenChange, 
  projectId, 
  currentBudget 
}: CreateChangeOrderDialogProps) {
  const { createChangeOrder } = useProjectDetails(projectId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: '',
      description: '',
      amount_change: 0,
    },
  });

  const watchedAmount = form.watch('amount_change');
  const newBudget = currentBudget + (watchedAmount || 0);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await createChangeOrder.mutateAsync(data);
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Change Order</DialogTitle>
          <DialogDescription>
            Request a budget amendment for this project
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Scope change, unforeseen repairs" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detailed explanation of the change..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount_change"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Change</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Enter positive for increase, negative for decrease"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Positive = budget increase, Negative = budget decrease
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Budget Preview */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Budget</span>
                <span>{formatCurrency(currentBudget)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Change</span>
                <span className={watchedAmount >= 0 ? 'text-red-500' : 'text-green-500'}>
                  {watchedAmount >= 0 ? '+' : ''}{formatCurrency(watchedAmount || 0)}
                </span>
              </div>
              <div className="flex justify-between font-medium border-t pt-2">
                <span>New Budget</span>
                <span>{formatCurrency(newBudget)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !watchedAmount}>
                {isSubmitting ? 'Submitting...' : 'Submit Change Order'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
