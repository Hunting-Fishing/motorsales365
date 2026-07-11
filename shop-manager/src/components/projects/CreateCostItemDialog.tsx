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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjectDetails } from '@/hooks/useProjectBudgets';
import { COST_CATEGORIES } from '@/types/projectBudget';
import type { ProjectPhase } from '@/types/projectBudget';

const formSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  phase_id: z.string().optional(),
  budgeted_amount: z.number().min(0, 'Amount must be positive'),
  committed_amount: z.number().min(0).default(0),
  actual_spent: z.number().min(0).default(0),
  purchase_order_number: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateCostItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  phases: ProjectPhase[];
}

export function CreateCostItemDialog({ open, onOpenChange, projectId, phases }: CreateCostItemDialogProps) {
  const { createCostItem } = useProjectDetails(projectId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: '',
      description: '',
      phase_id: '',
      budgeted_amount: 0,
      committed_amount: 0,
      actual_spent: 0,
      purchase_order_number: '',
      notes: '',
    },
  });

  const formatCategory = (category: string) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await createCostItem.mutateAsync({
        ...data,
        phase_id: data.phase_id || null,
      });
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
          <DialogTitle>Add Cost Item</DialogTitle>
          <DialogDescription>
            Track a new cost item for this project
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COST_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {formatCategory(cat)}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Engine parts from vendor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {phases.length > 0 && (
              <FormField
                control={form.control}
                name="phase_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phase (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="General / No phase" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">General / No phase</SelectItem>
                        {phases.map(phase => (
                          <SelectItem key={phase.id} value={phase.id}>
                            {phase.phase_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="budgeted_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budgeted</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="committed_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Committed</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actual_spent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spent</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="purchase_order_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PO Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., PO-2024-001" {...field} />
                  </FormControl>
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
                    <Textarea placeholder="Additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Cost Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
