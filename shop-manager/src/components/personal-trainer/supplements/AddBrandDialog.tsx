import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AddBrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBrandDialog({ open, onOpenChange }: AddBrandDialogProps) {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    website: '',
    country: '',
    category: 'supplements',
    description: '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('pt_supplement_brands').insert({
        name: form.name,
        website: form.website || null,
        country: form.country || null,
        category: form.category,
        description: form.description || null,
        shop_id: shopId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-brands'] });
      toast({ title: 'Brand added', description: `${form.name} has been added.` });
      setForm({ name: '', website: '', country: '', category: 'supplements', description: '' });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Brand</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Brand Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. doTERRA" />
          </div>
          <div>
            <Label>Website</Label>
            <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Country</Label>
              <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="USA" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplements">Supplements</SelectItem>
                  <SelectItem value="essential_oils">Essential Oils</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.name || mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Add Brand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
