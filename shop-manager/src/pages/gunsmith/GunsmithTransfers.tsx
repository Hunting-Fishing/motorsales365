import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowRightLeft, 
  Plus, 
  Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

const TRANSFER_TYPES = [
  { value: 'sale', label: 'Sale (Shop to Customer)' },
  { value: 'purchase', label: 'Purchase (Customer to Shop)' },
  { value: 'customer_to_customer', label: 'Customer to Customer' },
  { value: 'consignment', label: 'Consignment Sale' }
];

const TRANSFER_STATUSES = [
  { value: 'pending', label: 'Pending CFO Authorization' },
  { value: 'authorized', label: 'CFO Authorized' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

export default function GunsmithTransfers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    transfer_type: '',
    from_customer_id: '',
    to_customer_id: '',
    firearm_make: '',
    firearm_model: '',
    firearm_serial: '',
    firearm_classification: 'non-restricted',
    from_license_number: '',
    to_license_number: '',
    cfo_reference_number: '',
    sale_price: '',
    notes: ''
  });

  const { data: transfers, isLoading } = useQuery({
    queryKey: ['gunsmith-transfers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_transfers')
        .select('*')
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

  const createTransfer = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await (supabase as any)
        .from('gunsmith_transfers')
        .insert({
          transfer_type: data.transfer_type,
          from_customer_id: data.from_customer_id || null,
          to_customer_id: data.to_customer_id || null,
          firearm_make: data.firearm_make,
          firearm_model: data.firearm_model,
          firearm_serial: data.firearm_serial || null,
          firearm_classification: data.firearm_classification,
          from_license_number: data.from_license_number || null,
          to_license_number: data.to_license_number || null,
          cfo_reference_number: data.cfo_reference_number || null,
          sale_price: data.sale_price ? parseFloat(data.sale_price) : null,
          notes: data.notes || null,
          transfer_status: 'pending'
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-transfers'] });
      toast({ title: 'Transfer created successfully' });
      setIsDialogOpen(false);
      setFormData({
        transfer_type: '', from_customer_id: '', to_customer_id: '',
        firearm_make: '', firearm_model: '', firearm_serial: '',
        firearm_classification: 'non-restricted', from_license_number: '',
        to_license_number: '', cfo_reference_number: '', sale_price: '', notes: ''
      });
    },
    onError: () => {
      toast({ title: 'Failed to create transfer', variant: 'destructive' });
    }
  });

  const updateTransferStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from('gunsmith_transfers')
        .update({ transfer_status: status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-transfers'] });
      toast({ title: 'Transfer status updated' });
    }
  });

  const filteredTransfers = transfers?.filter((t: any) => 
    t.firearm_make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.firearm_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.firearm_serial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.cfo_reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'authorized': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-amber-500';
    }
  };

  return (
    <MobilePageContainer>
      <MobilePageHeader
        title="Transfers"
        subtitle="CFO transfers and firearm sales"
        icon={<ArrowRightLeft className="h-6 w-6 md:h-8 md:w-8 text-purple-500 shrink-0" />}
        onBack={() => navigate('/gunsmith')}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">New </span>Transfer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Transfer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Transfer Type *</Label>
                  <Select value={formData.transfer_type} onValueChange={(v) => setFormData({ ...formData, transfer_type: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSFER_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>From (Seller)</Label>
                    <Select value={formData.from_customer_id} onValueChange={(v) => setFormData({ ...formData, from_customer_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
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
                    <Label>To (Buyer)</Label>
                    <Select value={formData.to_customer_id} onValueChange={(v) => setFormData({ ...formData, to_customer_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Firearm Make *</Label>
                    <Input
                      value={formData.firearm_make}
                      onChange={(e) => setFormData({ ...formData, firearm_make: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Firearm Model *</Label>
                    <Input
                      value={formData.firearm_model}
                      onChange={(e) => setFormData({ ...formData, firearm_model: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Serial Number</Label>
                    <Input
                      value={formData.firearm_serial}
                      onChange={(e) => setFormData({ ...formData, firearm_serial: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Classification *</Label>
                    <Select value={formData.firearm_classification} onValueChange={(v) => setFormData({ ...formData, firearm_classification: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="non-restricted">Non-Restricted</SelectItem>
                        <SelectItem value="restricted">Restricted</SelectItem>
                        <SelectItem value="prohibited">Prohibited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Seller PAL/RPAL #</Label>
                    <Input
                      value={formData.from_license_number}
                      onChange={(e) => setFormData({ ...formData, from_license_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Buyer PAL/RPAL #</Label>
                    <Input
                      value={formData.to_license_number}
                      onChange={(e) => setFormData({ ...formData, to_license_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>CFO Reference #</Label>
                    <Input
                      value={formData.cfo_reference_number}
                      onChange={(e) => setFormData({ ...formData, cfo_reference_number: e.target.value })}
                      placeholder="For restricted"
                    />
                  </div>
                  <div>
                    <Label>Sale Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.sale_price}
                      onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => createTransfer.mutate(formData)}
                  disabled={!formData.transfer_type || !formData.firearm_make || !formData.firearm_model || createTransfer.isPending}
                >
                  {createTransfer.isPending ? 'Creating...' : 'Create Transfer'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search */}
      <div className="mb-4 md:mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search transfers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Transfers List */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-base md:text-lg">Transfer Records</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : filteredTransfers?.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-muted-foreground">
              <ArrowRightLeft className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm md:text-base">No transfers yet</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {filteredTransfers?.map((transfer: any) => (
                <div key={transfer.id} className="p-3 md:p-4 bg-muted/50 rounded-lg">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium text-sm md:text-base">
                        {transfer.firearm_make} {transfer.firearm_model}
                      </span>
                      <Badge className={`${getStatusColor(transfer.transfer_status)} text-white text-xs`}>
                        {transfer.transfer_status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{transfer.transfer_type}</Badge>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {transfer.firearm_serial && `S/N: ${transfer.firearm_serial} - `}
                      {transfer.firearm_classification}
                    </p>
                    {transfer.cfo_reference_number && (
                      <p className="text-xs md:text-sm text-muted-foreground">
                        CFO Ref: {transfer.cfo_reference_number}
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-1">
                      {transfer.sale_price && (
                        <p className="font-medium text-green-600 text-sm md:text-base">${transfer.sale_price.toFixed(2)}</p>
                      )}
                      <Select
                        value={transfer.transfer_status}
                        onValueChange={(v) => updateTransferStatus.mutate({ id: transfer.id, status: v })}
                      >
                        <SelectTrigger className="w-full sm:w-40 h-8 text-xs md:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSFER_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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