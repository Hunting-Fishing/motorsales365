import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ShoppingBag, 
  Plus, 
  Search,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useGunsmithFirearms } from '@/hooks/useGunsmith';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

export default function GunsmithConsignments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    firearm_id: '',
    asking_price: '',
    minimum_price: '',
    commission_rate: '15'
  });

  const { data: consignments, isLoading } = useQuery({
    queryKey: ['gunsmith-consignments'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_consignments')
        .select('*, customers(first_name, last_name), gunsmith_firearms(make, model, serial_number)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .order('first_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: firearms } = useGunsmithFirearms(formData.customer_id || undefined);

  const createConsignment = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await (supabase as any)
        .from('gunsmith_consignments')
        .insert({
          customer_id: data.customer_id,
          firearm_id: data.firearm_id,
          asking_price: parseFloat(data.asking_price),
          minimum_price: data.minimum_price ? parseFloat(data.minimum_price) : null,
          commission_rate: parseFloat(data.commission_rate),
          status: 'active'
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-consignments'] });
      toast({ title: 'Consignment created successfully' });
      setIsDialogOpen(false);
      setFormData({ customer_id: '', firearm_id: '', asking_price: '', minimum_price: '', commission_rate: '15' });
    },
    onError: () => {
      toast({ title: 'Failed to create consignment', variant: 'destructive' });
    }
  });

  const markAsSold = useMutation({
    mutationFn: async ({ id, soldPrice }: { id: string; soldPrice: number }) => {
      const consignment = consignments?.find((c: any) => c.id === id);
      const commissionAmount = soldPrice * ((consignment?.commission_rate || 15) / 100);
      const payoutAmount = soldPrice - commissionAmount;

      const { error } = await (supabase as any)
        .from('gunsmith_consignments')
        .update({
          status: 'sold',
          sold_date: new Date().toISOString().split('T')[0],
          sold_price: soldPrice,
          commission_amount: commissionAmount,
          payout_amount: payoutAmount
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-consignments'] });
      toast({ title: 'Consignment marked as sold' });
    }
  });

  const filteredConsignments = consignments?.filter((c: any) => 
    c.gunsmith_firearms?.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.gunsmith_firearms?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customers?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customers?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeConsignments = consignments?.filter((c: any) => c.status === 'active') || [];
  const totalValue = activeConsignments.reduce((sum: number, c: any) => sum + (c.asking_price || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sold': return 'bg-green-500';
      case 'withdrawn': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <MobilePageContainer>
      <MobilePageHeader
        title="Consignments"
        subtitle="Manage consignment inventory"
        icon={<ShoppingBag className="h-6 w-6 md:h-8 md:w-8 text-orange-500 shrink-0" />}
        onBack={() => navigate('/gunsmith')}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">New </span>Consignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Consignment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Customer (Owner) *</Label>
                  <Select value={formData.customer_id} onValueChange={(v) => setFormData({ ...formData, customer_id: v, firearm_id: '' })}>
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
                  <Label>Firearm *</Label>
                  <Select value={formData.firearm_id} onValueChange={(v) => setFormData({ ...formData, firearm_id: v })} disabled={!formData.customer_id}>
                    <SelectTrigger>
                      <SelectValue placeholder={formData.customer_id ? "Select firearm" : "Select customer first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {firearms?.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.make} {f.model} {f.serial_number && `(${f.serial_number})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Asking Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.asking_price}
                      onChange={(e) => setFormData({ ...formData, asking_price: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Minimum Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.minimum_price}
                      onChange={(e) => setFormData({ ...formData, minimum_price: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Commission Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => createConsignment.mutate(formData)}
                  disabled={!formData.customer_id || !formData.firearm_id || !formData.asking_price || createConsignment.isPending}
                >
                  {createConsignment.isPending ? 'Creating...' : 'Create Consignment'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Summary Card */}
      <Card className="mb-4 md:mb-6">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Active Consignment Value</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">${totalValue.toLocaleString()}</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">{activeConsignments.length} items</p>
            </div>
            <DollarSign className="h-10 w-10 md:h-12 md:w-12 text-orange-500/20" />
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="mb-4 md:mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search consignments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Consignments List */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-base md:text-lg">Consignment Inventory</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : filteredConsignments?.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-muted-foreground">
              <ShoppingBag className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm md:text-base">No consignments yet</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {filteredConsignments?.map((consignment: any) => (
                <div key={consignment.id} className="p-3 md:p-4 bg-muted/50 rounded-lg">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium text-sm md:text-base">
                        {consignment.gunsmith_firearms?.make} {consignment.gunsmith_firearms?.model}
                      </span>
                      <Badge className={`${getStatusColor(consignment.status)} text-white text-xs`}>
                        {consignment.status}
                      </Badge>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Owner: {consignment.customers?.first_name} {consignment.customers?.last_name}
                      {consignment.gunsmith_firearms?.serial_number && ` - S/N: ${consignment.gunsmith_firearms.serial_number}`}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Commission: {consignment.commission_rate}%
                      {consignment.minimum_price && ` - Min: $${consignment.minimum_price.toFixed(2)}`}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-1">
                      <p className="font-medium text-base md:text-lg">
                        ${consignment.asking_price?.toFixed(2)}
                      </p>
                      {consignment.status === 'active' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="w-full sm:w-auto text-xs"
                          onClick={() => {
                            const soldPrice = prompt('Enter sold price:');
                            if (soldPrice) {
                              markAsSold.mutate({ id: consignment.id, soldPrice: parseFloat(soldPrice) });
                            }
                          }}
                        >
                          Mark Sold
                        </Button>
                      )}
                      {consignment.status === 'sold' && (
                        <div className="text-xs md:text-sm text-green-600">
                          Sold: ${consignment.sold_price?.toFixed(2)} | Payout: ${consignment.payout_amount?.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </MobilePageContainer>
  );
}