import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Search, Car, Calendar, Wrench, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  vin: string | null;
  license_plate: string | null;
  updated_at: string;
}

export default function AutomotiveVehicleHistory() {
  const { shopId } = useShopId();
  const [searchTerm, setSearchTerm] = React.useState('');

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles-history', shopId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vehicles')
        .select('id, make, model, year, vin, license_plate, updated_at')
        .eq('shop_id', shopId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return (data ?? []) as Vehicle[];
    },
    enabled: !!shopId,
  });

  const filteredVehicles = vehicles?.filter(v => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return v.make?.toLowerCase().includes(term) ||
           v.model?.toLowerCase().includes(term) ||
           v.license_plate?.toLowerCase().includes(term) ||
           v.vin?.toLowerCase().includes(term);
  }) ?? [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8 text-primary" />
            Vehicle History
          </h1>
          <p className="text-muted-foreground mt-1">Complete service history for all vehicles</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search vehicles..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredVehicles.map((vehicle) => (
          <Card key={vehicle.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </CardTitle>
                {vehicle.license_plate && <Badge variant="outline">{vehicle.license_plate}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {vehicle.vin && <p className="text-xs text-muted-foreground font-mono">VIN: {vehicle.vin}</p>}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 rounded-lg p-2">
                  <Wrench className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Jobs</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <Calendar className="h-4 w-4 mx-auto mb-1 text-green-500" />
                  <p className="text-xs text-muted-foreground">Last Visit</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <DollarSign className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">View Full History</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVehicles.length === 0 && (
        <Card className="p-12 text-center">
          <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No vehicles found</h3>
          <p className="text-muted-foreground">{searchTerm ? 'Try a different search term' : 'Vehicle history will appear here'}</p>
        </Card>
      )}
    </div>
  );
}
