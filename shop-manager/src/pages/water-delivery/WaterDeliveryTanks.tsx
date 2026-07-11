import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, ArrowLeft, Container, Droplets } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';

export default function WaterDeliveryTanks() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { shopId } = useShopId();
  const { formatVolume, getVolumeLabel } = useWaterUnits();

  const { data: tanks, isLoading } = useQuery({
    queryKey: ['water-delivery-tanks', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('water_delivery_tanks')
        .select(`
          *,
          water_delivery_customers (company_name),
          water_delivery_locations (location_name)
        `)
        .eq('shop_id', shopId)
        .order('tank_number', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const filteredTanks = tanks?.filter(tank => 
    tank.tank_number?.toLowerCase().includes(search.toLowerCase()) ||
    tank.water_delivery_customers?.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/water-delivery')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Container className="h-8 w-8 text-cyan-600" />
              Water Tanks
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage customer storage tanks
            </p>
          </div>
          <Button className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Tank
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tanks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tanks Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTanks && filteredTanks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tank #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Capacity ({getVolumeLabel()})</TableHead>
                  <TableHead>Current Level</TableHead>
                  <TableHead>Potable Cert</TableHead>
                  <TableHead>Last Sanitized</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTanks.map((tank) => {
                  const levelPercent = tank.current_level_percent || 0;
                  return (
                    <TableRow key={tank.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{tank.tank_number}</TableCell>
                      <TableCell>{tank.water_delivery_customers?.company_name || '-'}</TableCell>
                      <TableCell>{tank.water_delivery_locations?.location_name || '-'}</TableCell>
                      <TableCell>{formatVolume(tank.capacity_gallons || 0, 0)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${levelPercent > 30 ? 'bg-cyan-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(levelPercent, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm">{levelPercent.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {tank.is_potable_certified ? (
                          <Badge className="bg-green-500">Certified</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {tank.last_sanitized_date 
                          ? format(new Date(tank.last_sanitized_date), 'MMM d, yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tank.is_active ? 'default' : 'secondary'}>
                          {tank.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Container className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No tanks found</p>
              <Button variant="link">Add your first tank</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
