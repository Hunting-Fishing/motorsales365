import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Loader2, Users, Phone, Mail, MapPin, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SepticAddCustomerDialog } from '@/components/septic/SepticAddCustomerDialog';

export default function SepticCustomers() {
  const navigate = useNavigate();
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['septic-customers', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_customers')
        .select('id, first_name, last_name, email, phone, address, created_at')
        .eq('shop_id', shopId)
        .order('last_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: tankCounts = {} } = useQuery({
    queryKey: ['septic-customer-tank-counts', shopId],
    queryFn: async () => {
      if (!shopId) return {};
      const { data, error } = await supabase
        .from('septic_tanks')
        .select('customer_id')
        .eq('shop_id', shopId);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((t: any) => { counts[t.customer_id] = (counts[t.customer_id] || 0) + 1; });
      return counts;
    },
    enabled: !!shopId,
  });

  const addCustomer = useMutation({
    mutationFn: async (form: any) => {
      if (!shopId) throw new Error('No shop');
      const insertData: any = {
        shop_id: shopId,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        zip_code: form.zip_code || null,
        notes: form.notes || null,
        latitude: form.latitude,
        longitude: form.longitude,
        property_type: form.property_type || null,
        bedrooms: form.bedrooms,
        property_size: form.property_size || null,
        system_type: form.system_type || null,
        last_pump_date: form.last_pump_date || null,
        access_notes: form.access_notes || null,
      };
      const { error } = await supabase.from('septic_customers').insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Customer added');
      queryClient.invalidateQueries({ queryKey: ['septic-customers'] });
      setShowAdd(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = customers.filter((c: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return `${c.first_name} ${c.last_name}`.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s) ||
      c.phone?.includes(s);
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-stone-600 to-stone-800">
          <Plus className="h-4 w-4 mr-2" /> Add Customer
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">{search ? 'No matching customers' : 'No customers yet'}</p>
          {!search && <Button onClick={() => setShowAdd(true)} variant="outline">Add your first customer</Button>}
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c: any) => (
            <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/septic/customers/${c.id}`)}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{c.first_name} {c.last_name}</span>
                    {(tankCounts as any)[c.id] > 0 && <Badge variant="secondary" className="text-xs">{(tankCounts as any)[c.id]} tank{(tankCounts as any)[c.id] > 1 ? 's' : ''}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                    {c.address && <span className="flex items-center gap-1 truncate max-w-[200px]"><MapPin className="h-3 w-3" />{c.address}</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SepticAddCustomerDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onSave={(form) => addCustomer.mutate(form)}
        isPending={addCustomer.isPending}
      />
    </div>
  );
}
