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

export default function AddEnvironmentalRecordDialog({ open, onOpenChange, customerId }: Props) {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    record_type: 'concern',
    severity: 'low',
    title: '',
    description: '',
    regulatory_body: '',
    citation_number: '',
    date_identified: '',
    remediation_plan: '',
    remediation_cost: '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase.from('septic_environmental_records').insert({
        customer_id: customerId,
        shop_id: shopId!,
        record_type: form.record_type,
        severity: form.severity,
        title: form.title,
        description: form.description || null,
        regulatory_body: form.regulatory_body || null,
        citation_number: form.citation_number || null,
        date_identified: form.date_identified || null,
        remediation_plan: form.remediation_plan || null,
        remediation_cost: form.remediation_cost ? parseFloat(form.remediation_cost) : null,
        created_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-environmental-records', customerId] });
      toast({ title: 'Record added', description: 'Environmental record saved.' });
      setForm({ record_type: 'concern', severity: 'low', title: '', description: '', regulatory_body: '', citation_number: '', date_identified: '', remediation_plan: '', remediation_cost: '' });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Environmental Record</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Record Type</Label>
              <Select value={form.record_type} onValueChange={v => setForm(f => ({ ...f, record_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="concern">Concern</SelectItem>
                  <SelectItem value="violation">Violation</SelectItem>
                  <SelectItem value="compliance_check">Compliance Check</SelectItem>
                  <SelectItem value="remediation">Remediation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Issue title..." />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div>
            <Label>Date Identified</Label>
            <Input type="date" value={form.date_identified} onChange={e => setForm(f => ({ ...f, date_identified: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Regulatory Body</Label>
              <Input value={form.regulatory_body} onChange={e => setForm(f => ({ ...f, regulatory_body: e.target.value }))} placeholder="EPA, County Health..." />
            </div>
            <div>
              <Label>Citation #</Label>
              <Input value={form.citation_number} onChange={e => setForm(f => ({ ...f, citation_number: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Remediation Plan</Label>
            <Textarea value={form.remediation_plan} onChange={e => setForm(f => ({ ...f, remediation_plan: e.target.value }))} rows={2} />
          </div>
          <div>
            <Label>Remediation Cost ($)</Label>
            <Input type="number" value={form.remediation_cost} onChange={e => setForm(f => ({ ...f, remediation_cost: e.target.value }))} placeholder="0.00" />
          </div>
          <Button className="w-full" onClick={() => mutation.mutate()} disabled={!form.title || mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Add Record'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
