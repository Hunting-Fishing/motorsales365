import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, RefreshCw, Calendar, DollarSign, User, Pause, Play, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PowerWashingSubscriptions = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '', plan_name: '', frequency: 'monthly', base_price: '', discount_percent: '0', start_date: ''
  });

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['power-washing-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_subscriptions' as any)
        .select('*, customers(first_name, last_name, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    }
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('id, first_name, last_name').order('first_name');
      if (error) throw error;
      return data;
    }
  });

  const createSubscription = useMutation({
    mutationFn: async (data: typeof formData) => {
      const basePrice = parseFloat(data.base_price);
      const discount = parseFloat(data.discount_percent);
      const finalPrice = basePrice * (1 - discount / 100);
      
      const { error } = await supabase.from('power_washing_subscriptions' as any).insert({
        shop_id: '00000000-0000-0000-0000-000000000000',
        customer_id: data.customer_id,
        plan_name: data.plan_name,
        frequency: data.frequency,
        base_price: basePrice,
        discount_percent: discount,
        final_price: finalPrice,
        start_date: data.start_date,
        next_service_date: data.start_date,
        status: 'active'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-subscriptions'] });
      setIsAddOpen(false);
      setFormData({ customer_id: '', plan_name: '', frequency: 'monthly', base_price: '', discount_percent: '0', start_date: '' });
      toast.success('Subscription created');
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('power_washing_subscriptions' as any).update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-subscriptions'] });
      toast.success('Status updated');
    }
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const frequencyLabels: Record<string, string> = {
    weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly',
    quarterly: 'Quarterly', biannual: 'Bi-annual', annual: 'Annual'
  };

  const stats = {
    active: subscriptions?.filter(s => s.status === 'active').length || 0,
    mrr: subscriptions?.filter(s => s.status === 'active').reduce((sum, s) => {
      const multiplier = { weekly: 4.33, biweekly: 2.17, monthly: 1, quarterly: 0.33, biannual: 0.17, annual: 0.083 };
      return sum + (Number(s.final_price) * (multiplier[s.frequency as keyof typeof multiplier] || 1));
    }, 0) || 0
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/power-washing')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Subscriptions</h1>
            <p className="text-muted-foreground text-sm">Recurring service plans</p>
          </div>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Subscription</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Customer *</Label>
                <Select value={formData.customer_id} onValueChange={v => setFormData({...formData, customer_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plan Name *</Label>
                <Input value={formData.plan_name} onChange={e => setFormData({...formData, plan_name: e.target.value})} placeholder="e.g., Monthly Driveway Cleaning" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Frequency *</Label>
                  <Select value={formData.frequency} onValueChange={v => setFormData({...formData, frequency: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="biannual">Bi-annual</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Date *</Label>
                  <Input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Base Price *</Label>
                  <Input type="number" value={formData.base_price} onChange={e => setFormData({...formData, base_price: e.target.value})} placeholder="0.00" />
                </div>
                <div>
                  <Label>Discount %</Label>
                  <Input type="number" value={formData.discount_percent} onChange={e => setFormData({...formData, discount_percent: e.target.value})} />
                </div>
              </div>
              <Button 
                onClick={() => createSubscription.mutate(formData)} 
                disabled={!formData.customer_id || !formData.plan_name || !formData.base_price || !formData.start_date}
                className="w-full"
              >
                Create Subscription
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Active Plans</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">${stats.mrr.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">Monthly Revenue</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Subscriptions List */}
      {isLoading ? (
        <div className="text-center py-8">Loading subscriptions...</div>
      ) : subscriptions?.length === 0 ? (
        <Card className="p-8 text-center">
          <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Subscriptions</h3>
          <p className="text-sm text-muted-foreground">Create your first recurring service plan</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {subscriptions?.map(sub => (
            <Card key={sub.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{sub.plan_name}</h3>
                    <Badge className={getStatusBadge(sub.status)}>{sub.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {sub.customers?.first_name} {sub.customers?.last_name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">${Number(sub.final_price).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{frequencyLabels[sub.frequency]}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Next: {sub.next_service_date ? format(new Date(sub.next_service_date), 'MMM d, yyyy') : 'Not scheduled'}
                </span>
                <div className="flex gap-2">
                  {sub.status === 'active' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: sub.id, status: 'paused' })}>
                      <Pause className="h-3 w-3 mr-1" /> Pause
                    </Button>
                  )}
                  {sub.status === 'paused' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: sub.id, status: 'active' })}>
                      <Play className="h-3 w-3 mr-1" /> Resume
                    </Button>
                  )}
                  {sub.status !== 'cancelled' && (
                    <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: sub.id, status: 'cancelled' })}>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PowerWashingSubscriptions;
