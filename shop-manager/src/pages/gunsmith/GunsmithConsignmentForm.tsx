import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Store, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGunsmithFirearms } from '@/hooks/useGunsmith';
import { useToast } from '@/hooks/use-toast';

export default function GunsmithConsignmentForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedConsignor, setSelectedConsignor] = useState('');
  
  const [formData, setFormData] = useState({
    consignor_id: '',
    firearm_id: '',
    asking_price: '',
    minimum_price: '',
    commission_rate: '15',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    terms: '',
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

  const { data: consignorFirearms } = useGunsmithFirearms(selectedConsignor || undefined);

  const createConsignment = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase as any)
        .from('gunsmith_consignments')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-consignments'] });
      toast({ title: 'Consignment created' });
      navigate('/gunsmith/consignments');
    },
    onError: () => {
      toast({ title: 'Failed to create consignment', variant: 'destructive' });
    }
  });

  const handleConsignorChange = (customerId: string) => {
    setSelectedConsignor(customerId);
    setFormData({ ...formData, consignor_id: customerId, firearm_id: '' });
  };

  const handleSubmit = () => {
    const consignmentNumber = `CON-${Date.now().toString(36).toUpperCase()}`;
    
    createConsignment.mutate({
      consignment_number: consignmentNumber,
      consignor_id: formData.consignor_id,
      firearm_id: formData.firearm_id || null,
      asking_price: formData.asking_price ? parseFloat(formData.asking_price) : null,
      minimum_price: formData.minimum_price ? parseFloat(formData.minimum_price) : null,
      commission_rate: parseFloat(formData.commission_rate) || 15,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      terms: formData.terms || null,
      notes: formData.notes || null,
      status: 'active'
    });
  };

  const isValid = formData.consignor_id && formData.start_date;

  const askingPrice = parseFloat(formData.asking_price) || 0;
  const commissionRate = parseFloat(formData.commission_rate) || 0;
  const commissionAmount = askingPrice * (commissionRate / 100);
  const consignorPayout = askingPrice - commissionAmount;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gunsmith/consignments')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Store className="h-8 w-8 text-amber-600" />
              New Consignment
            </h1>
            <p className="text-muted-foreground mt-1">Create a consignment agreement</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Consignor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Customer (Consignor) *</Label>
                <Select value={formData.consignor_id} onValueChange={handleConsignorChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select consignor" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} - {c.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedConsignor && (
                <div>
                  <Label>Firearm</Label>
                  <Select value={formData.firearm_id} onValueChange={(v) => setFormData({ ...formData, firearm_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select firearm" />
                    </SelectTrigger>
                    <SelectContent>
                      {consignorFirearms?.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.make} {f.model} - {f.serial_number || 'No S/N'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Asking Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.asking_price}
                    onChange={(e) => setFormData({ ...formData, asking_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Minimum Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minimum_price}
                    onChange={(e) => setFormData({ ...formData, minimum_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Commission Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                  />
                </div>
              </div>

              {askingPrice > 0 && (
                <div className="bg-muted p-4 rounded-lg space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Commission ({commissionRate}%):</span>
                    <span>${commissionAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Consignor Payout:</span>
                    <span>${consignorPayout.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agreement Period</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    min={formData.start_date}
                  />
                </div>
              </div>

              <div>
                <Label>Terms & Conditions</Label>
                <Textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  placeholder="Consignment terms and conditions..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Internal notes..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate('/gunsmith/consignments')}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid || createConsignment.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {createConsignment.isPending ? 'Creating...' : 'Create Consignment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
