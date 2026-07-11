import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Container } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function SepticLocations() {
  const { shopId } = useShopId();

  const { data: systems = [], isLoading } = useQuery({
    queryKey: ['septic-property-systems', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_property_systems')
        .select('*, septic_customers(first_name, last_name), septic_system_types(name)')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Service Locations</h1>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : systems.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">No property systems registered.</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systems.map((s: any) => {
            const cust = s.septic_customers as any;
            const stype = s.septic_system_types as any;
            return (
              <Card key={s.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{s.property_address || 'Unknown Location'}</span>
                    {stype && <Badge variant="outline">{stype.name}</Badge>}
                  </div>
                  {cust && <p className="text-sm text-muted-foreground">{cust.first_name} {cust.last_name}</p>}
                  <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                    {s.number_of_bedrooms && <span>{s.number_of_bedrooms} bed</span>}
                    {s.daily_flow_gallons && <span>{s.daily_flow_gallons} gpd</span>}
                    {s.soil_type && <span className="capitalize">{s.soil_type} soil</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
