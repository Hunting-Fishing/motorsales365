import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ArrowLeft, CheckCircle, Droplets } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';

export default function WaterDeliveryCompletions() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { shopId } = useShopId();
  const { formatVolume } = useWaterUnits();

  const { data: completions, isLoading } = useQuery({
    queryKey: ['water-delivery-completions', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('water_delivery_completions')
        .select(`
          *,
          water_delivery_orders (order_number),
          water_delivery_drivers (first_name, last_name),
          water_delivery_trucks (truck_number)
        `)
        .eq('shop_id', shopId)
        .order('delivery_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const filteredCompletions = completions?.filter(completion => 
    completion.water_delivery_orders?.order_number?.toLowerCase().includes(search.toLowerCase())
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
              <CheckCircle className="h-8 w-8 text-cyan-600" />
              Completed Deliveries
            </h1>
            <p className="text-muted-foreground mt-1">
              View delivery history and completion records
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search completions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Completions Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCompletions && filteredCompletions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Truck</TableHead>
                  <TableHead>Qty Delivered</TableHead>
                  <TableHead>pH Level</TableHead>
                  <TableHead>Chlorine</TableHead>
                  <TableHead>Signature</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompletions.map((completion) => (
                  <TableRow key={completion.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {completion.water_delivery_orders?.order_number || '-'}
                    </TableCell>
                    <TableCell>
                      {completion.delivery_date 
                        ? format(new Date(completion.delivery_date), 'MMM d, yyyy h:mm a')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {completion.water_delivery_drivers 
                        ? `${completion.water_delivery_drivers.first_name} ${completion.water_delivery_drivers.last_name}`
                        : '-'}
                    </TableCell>
                    <TableCell>{completion.water_delivery_trucks?.truck_number || '-'}</TableCell>
                    <TableCell>{formatVolume(completion.gallons_delivered || 0)}</TableCell>
                    <TableCell>
                      {completion.ph_level_reading || '-'}
                    </TableCell>
                    <TableCell>
                      {completion.chlorine_level_reading || '-'} ppm
                    </TableCell>
                    <TableCell>
                      {completion.signature_url ? (
                        <Badge className="bg-green-500">Signed</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Droplets className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No completed deliveries found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
