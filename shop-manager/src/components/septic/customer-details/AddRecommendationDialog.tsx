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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
}

export default function AddRecommendationDialog({ open, onOpenChange, customerId }: Props) {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    recommendation_type: 'cost_saving',
    title: '',
    description: '',
    priority: 'medium',
    current_annual_cost: '',
    projected_annual_cost: '',
    implementation_cost: '',
    payback_period_months: '',
  });

  const estimatedSavings = form.current_annual_cost && form.projected_annual_cost
    ? Math.max(0, parseFloat(form.current_annual_cost) - parseFloat(form.projected_annual_cost))
    : 0;

  const mutation = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase.from('septic_cost_recommendations').insert({
        customer_id: customerId,
        shop_id: shopId!,
        recommendation_type: form.recommendation_type,
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        current_annual_cost: form.current_annual_cost ? parseFloat(form.current_annual_cost) : null,
        projected_annual_cost: form.projected_annual_cost ? parseFloat(form.projected_annual_cost) : null,
        estimated_savings: estimatedSavings || null,
        implementation_cost: form.implementation_cost ? parseFloat(form.implementation_cost) : null,
        payback_period_months: form.payback_period_months ? parseInt(form.payback_period_months) : null,
        created_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-cost-recommendations', customerId] });
      toast({ title: 'Recommendation added', description: 'Cost recommendation saved.' });
      setForm({ recommendation_type: 'cost_saving', title: '', description: '', priority: 'medium', current_annual_cost: '', projected_annual_cost: '', implementation_cost: '', payback_period_months: '' });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Cost Recommendation</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.recommendation_type} onValueChange={v => setForm(f => ({ ...f, recommendation_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cost_saving">Cost Saving</SelectItem>
                  <SelectItem value="upgrade">System Upgrade</SelectItem>
                  <SelectItem value="maintenance_plan">Maintenance Plan</SelectItem>
                  <SelectItem value="system_replacement">System Replacement</SelectItem>
                  <SelectItem value="environmental">Environmental</SelectItem>
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
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Switch to aerobic system..." />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Explain the recommendation and benefits..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Current Annual Cost ($)</Label>
              <Input type="number" value={form.current_annual_cost} onChange={e => setForm(f => ({ ...f, current_annual_cost: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <Label>Projected Annual Cost ($)</Label>
              <Input type="number" value={form.projected_annual_cost} onChange={e => setForm(f => ({ ...f, projected_annual_cost: e.target.value }))} placeholder="0.00" />
            </div>
          </div>
          {estimatedSavings > 0 && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Estimated Annual Savings</p>
              <p className="text-xl font-bold text-emerald-600">${estimatedSavings.toFixed(2)}/yr</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Implementation Cost ($)</Label>
              <Input type="number" value={form.implementation_cost} onChange={e => setForm(f => ({ ...f, implementation_cost: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <Label>Payback Period (months)</Label>
              <Input type="number" value={form.payback_period_months} onChange={e => setForm(f => ({ ...f, payback_period_months: e.target.value }))} placeholder="12" />
            </div>
          </div>
          <Button className="w-full" onClick={() => mutation.mutate()} disabled={!form.title || mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Add Recommendation'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
