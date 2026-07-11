import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from '@/hooks/use-toast';

interface AddNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
}

export default function AddNoteDialog({ open, onOpenChange, customerId }: AddNoteDialogProps) {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    note_type: 'general',
    title: '',
    content: '',
    priority: 'low',
    estimated_cost: '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase.from('septic_customer_notes').insert({
        customer_id: customerId,
        shop_id: shopId!,
        note_type: form.note_type,
        title: form.title || null,
        content: form.content,
        priority: form.priority,
        estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
        created_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-customer-notes', customerId] });
      toast({ title: 'Note added', description: 'The note has been saved successfully.' });
      setForm({ note_type: 'general', title: '', content: '', priority: 'low', estimated_cost: '' });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Note</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.note_type} onValueChange={v => setForm(f => ({ ...f, note_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="customer_request">Customer Request</SelectItem>
                  <SelectItem value="employee_suggestion">Employee Suggestion</SelectItem>
                  <SelectItem value="recommendation">Recommendation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Title (optional)</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief title..." />
          </div>
          <div>
            <Label>Content *</Label>
            <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Write your note..." rows={4} />
          </div>
          <div>
            <Label>Estimated Cost ($)</Label>
            <Input type="number" value={form.estimated_cost} onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))} placeholder="0.00" />
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={!form.content || mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : 'Add Note'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
