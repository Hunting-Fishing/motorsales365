import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, ArrowLeft, UserCheck, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { AddWaterDriverDialog } from '@/components/water-delivery/AddWaterDriverDialog';

export default function WaterDeliveryDrivers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { shopId } = useShopId();

  const { data: drivers, isLoading } = useQuery({
    queryKey: ['water-delivery-drivers', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('water_delivery_drivers')
        .select('*')
        .eq('shop_id', shopId)
        .order('first_name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const filteredDrivers = drivers?.filter(driver => 
    driver.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    driver.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    driver.email?.toLowerCase().includes(search.toLowerCase())
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
              <UserCheck className="h-8 w-8 text-cyan-600" />
              Delivery Drivers
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage driver certifications and assignments
            </p>
          </div>
          <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Driver
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search drivers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Drivers Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredDrivers && filteredDrivers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>License #</TableHead>
                  <TableHead>CDL Expiry</TableHead>
                  <TableHead>Water Quality Cert</TableHead>
                  <TableHead>Tanker Endorsed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.map((driver) => (
                  <TableRow 
                    key={driver.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/water-delivery/drivers/${driver.id}`)}
                  >
                    <TableCell className="font-medium">
                      {driver.first_name} {driver.last_name}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {driver.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {driver.email}
                          </div>
                        )}
                        {driver.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {driver.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{driver.license_number || '-'}</TableCell>
                    <TableCell>
                      {driver.license_expiry 
                        ? format(new Date(driver.license_expiry), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {driver.water_quality_certified ? (
                        <Badge className="bg-green-500">Certified</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {driver.tanker_endorsement ? (
                        <Badge className="bg-blue-500">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={driver.is_active ? 'default' : 'secondary'}>
                        {driver.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No drivers found</p>
              <Button variant="link" onClick={() => setIsAddDialogOpen(true)}>Add your first driver</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddWaterDriverDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </div>
  );
}
