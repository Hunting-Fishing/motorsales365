import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Container, Plus, Pencil, MapPin, Droplets, Shield, Zap } from 'lucide-react';
import { InfoTooltip } from '../InfoTooltip';
import { AddTankDialog } from '../AddTankDialog';
import { EditTankDialog } from '../EditTankDialog';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';

interface CustomerTanksTabProps {
  customerId: string;
}

interface Tank {
  id: string;
  tank_name: string | null;
  tank_number: string | null;
  capacity_gallons: number | null;
  tank_type: string | null;
  material: string | null;
  location_id: string | null;
  reorder_level_percent: number | null;
  install_date: string | null;
  potable_certified?: boolean | null;
  has_filtration?: boolean | null;
  has_uv_treatment?: boolean | null;
  notes: string | null;
  customer_id: string;
  water_delivery_locations: { location_name: string } | null;
}

export function CustomerTanksTab({ customerId }: CustomerTanksTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTank, setEditingTank] = useState<Tank | null>(null);
  const { formatVolume } = useWaterUnits();

  const { data: tanks, isLoading } = useQuery({
    queryKey: ['water-delivery-customer-tanks', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_delivery_tanks')
        .select('*, water_delivery_locations(location_name)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Tank[];
    },
    enabled: !!customerId,
  });

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Customer Tanks</h3>
          <InfoTooltip content="Tanks are water storage containers at each location. Track capacity, current levels, reorder thresholds, and maintenance schedules. Tanks can be certified for potable water and may include filtration or UV treatment systems." />
        </div>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tank
        </Button>
      </div>

      {tanks && tanks.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {tanks.map((tank) => (
            <Card key={tank.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Container className="h-5 w-5 text-cyan-600 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">
                          {tank.tank_name || tank.tank_number || `Tank ${tank.id.slice(0, 8)}`}
                        </p>
                        <Badge variant="outline">{tank.tank_type || 'Standard'}</Badge>
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Droplets className="h-3 w-3" />
                        <span>{tank.capacity_gallons ? formatVolume(tank.capacity_gallons, 0) : '-'} capacity</span>
                      </div>

                      {tank.water_delivery_locations && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          <span>{tank.water_delivery_locations.location_name}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-2">
                        {tank.potable_certified && (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Potable
                          </Badge>
                        )}
                        {tank.has_filtration && (
                          <Badge variant="secondary" className="text-xs">
                            Filtration
                          </Badge>
                        )}
                        {tank.has_uv_treatment && (
                          <Badge variant="secondary" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            UV
                          </Badge>
                        )}
                        {tank.reorder_level_percent && (
                          <Badge variant="outline" className="text-xs">
                            Reorder: {tank.reorder_level_percent}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingTank(tank)}
                    className="flex-shrink-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No tanks registered. Add a tank to track water storage.
          </CardContent>
        </Card>
      )}

      <AddTankDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        customerId={customerId}
      />

      <EditTankDialog
        open={!!editingTank}
        onOpenChange={(open) => !open && setEditingTank(null)}
        tank={editingTank}
      />
    </div>
  );
}
