import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRightLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGunsmithFirearms } from '@/hooks/useGunsmith';
import { useToast } from '@/hooks/use-toast';

const TRANSFER_TYPES = ['Incoming', 'Outgoing'];

export default function GunsmithTransferForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedFromCustomer, setSelectedFromCustomer] = useState('');
  
  const [formData, setFormData] = useState({
    transfer_type: 'Incoming',
    from_customer_id: '',
    to_customer_id: '',
    firearm_id: '',
    transfer_date: new Date().toISOString().split('T')[0],
    cfo_reference: '',
    att_number: '',
    notes: ''
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone')
        .order('first_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: customerFirearms } = useGunsmithFirearms(selectedFromCustomer || undefined);

  const createTransfer = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase as any)
        .from('gunsmith_transfers')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-transfers'] });
      toast({ title: 'Transfer created' });
      navigate('/gunsmith/transfers');
    },
    onError: () => {
      toast({ title: 'Failed to create transfer', variant: 'destructive' });
    }
  });

  const handleFromCustomerChange = (customerId: string) => {
    setSelectedFromCustomer(customerId);
    setFormData({ ...formData, from_customer_id: customerId, firearm_id: '' });
  };

  const handleSubmit = () => {
    const transferNumber = `TRF-${Date.now().toString(36).toUpperCase()}`;
    
    createTransfer.mutate({
      transfer_number: transferNumber,
      transfer_type: formData.transfer_type,
      from_customer_id: formData.from_customer_id || null,
      to_customer_id: formData.to_customer_id || null,
      firearm_id: formData.firearm_id || null,
      transfer_date: formData.transfer_date,
      cfo_reference: formData.cfo_reference || null,
      att_number: formData.att_number || null,
      notes: formData.notes || null,
      status: 'pending'
    });
  };

  const isValid = formData.transfer_type && formData.transfer_date;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gunsmith/transfers')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <ArrowRightLeft className="h-8 w-8 text-amber-600" />
              New Transfer
            </h1>
            <p className="text-muted-foreground mt-1">Record a firearm transfer</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={formData.transfer_type} onValueChange={(v) => setFormData({ ...formData, transfer_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSFER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>From (Seller/Transferor)</Label>
                  <Select value={formData.from_customer_id} onValueChange={handleFromCustomerChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.first_name} {c.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>To (Buyer/Transferee)</Label>
                  <Select value={formData.to_customer_id} onValueChange={(v) => setFormData({ ...formData, to_customer_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.filter(c => c.id !== formData.from_customer_id).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.first_name} {c.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Firearm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Firearm</Label>
                <Select 
                  value={formData.firearm_id} 
                  onValueChange={(v) => setFormData({ ...formData, firearm_id: v })}
                  disabled={!selectedFromCustomer}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedFromCustomer ? "Select firearm" : "Select from customer first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {customerFirearms?.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.make} {f.model} - {f.serial_number || 'No S/N'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transfer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Transfer Date *</Label>
                <Input
                  type="date"
                  value={formData.transfer_date}
                  onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CFO Reference Number</Label>
                  <Input
                    value={formData.cfo_reference}
                    onChange={(e) => setFormData({ ...formData, cfo_reference: e.target.value })}
                    placeholder="Chief Firearms Officer reference"
                  />
                </div>
                <div>
                  <Label>ATT Number</Label>
                  <Input
                    value={formData.att_number}
                    onChange={(e) => setFormData({ ...formData, att_number: e.target.value })}
                    placeholder="Authorization to Transport"
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this transfer..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate('/gunsmith/transfers')}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid || createTransfer.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {createTransfer.isPending ? 'Creating...' : 'Create Transfer'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
