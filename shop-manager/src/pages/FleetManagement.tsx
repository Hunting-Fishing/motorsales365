import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, Plus, Settings, Wrench, Ship, Truck } from 'lucide-react';
import { FleetList } from '@/components/fleet/FleetList';
import { AddEquipmentDialog } from '@/components/equipment/AddEquipmentDialog';
import { useEquipmentByAssetClass } from '@/hooks/useEquipmentByAssetClass';

export default function FleetManagement() {
  // Filter to only show fleet assets (vehicles, vessels, heavy equipment)
  const { equipment: fleetAssets, stats, isLoading, refetch } = useEquipmentByAssetClass('fleet');
  const [dialogOpen, setDialogOpen] = useState(false);

  const availableCount = stats.operational;
  const inUseCount = stats.needsMaintenance;
  const maintenanceCount = stats.outOfService;

  return (
    <>
      <Helmet>
        <title>Fleet Management | All Business 365</title>
        <meta name="description" content="Manage company fleet including vehicles, vessels, heavy equipment, and mobile assets." />
      </Helmet>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
            <p className="text-muted-foreground">
              Manage vehicles, vessels, heavy equipment, and mobile assets
            </p>
          </div>
          <AddEquipmentDialog
            open={dialogOpen} 
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) refetch();
            }}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Fleet</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : fleetAssets.length}</div>
              <p className="text-xs text-muted-foreground">
                Company vehicles
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <Car className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : availableCount}</div>
              <p className="text-xs text-muted-foreground">
                Ready for use
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Use</CardTitle>
              <Settings className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : inUseCount}</div>
              <p className="text-xs text-muted-foreground">
                Currently checked out
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
              <Wrench className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : maintenanceCount}</div>
              <p className="text-xs text-muted-foreground">
                Being serviced
              </p>
            </CardContent>
          </Card>
        </div>

        <FleetList assets={fleetAssets} loading={isLoading} onUpdate={refetch} />
      </div>
    </>
  );
}
