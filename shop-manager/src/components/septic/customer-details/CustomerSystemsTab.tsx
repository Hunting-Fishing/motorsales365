import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Container, Calendar, Ruler, Droplets } from 'lucide-react';
import { format } from 'date-fns';

interface CustomerSystemsTabProps {
  customer: any;
  tanks: any[];
}

export default function CustomerSystemsTab({ customer, tanks }: CustomerSystemsTabProps) {
  const conditionColors: Record<string, string> = {
    good: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    fair: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    poor: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="space-y-6">
      {/* Property System Overview */}
      <Card>
        <CardHeader><CardTitle className="text-base">Property System Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">System Type</p>
              <p className="text-sm font-medium capitalize">{customer.system_type || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Well Distance</p>
              <p className="text-sm font-medium">{customer.well_distance_ft ? `${customer.well_distance_ft} ft` : 'Not specified'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Water Source</p>
              <p className="text-sm font-medium capitalize">{customer.water_source || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Pump Date</p>
              <p className="text-sm font-medium">
                {customer.last_pump_date ? format(new Date(customer.last_pump_date), 'MMM d, yyyy') : 'Not recorded'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tanks List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Container className="h-4 w-4" />
            Septic Tanks ({tanks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tanks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No tanks registered for this customer.</p>
          ) : (
            <div className="space-y-4">
              {tanks.map((tank: any) => (
                <div key={tank.id} className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-teal-500" />
                      <span className="font-semibold text-sm">{tank.tank_type || 'Septic Tank'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {tank.condition && (
                        <Badge className={conditionColors[tank.condition?.toLowerCase()] || ''}>
                          {tank.condition}
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {tank.tank_size_gallons ? `${tank.tank_size_gallons} gal` : 'Size unknown'}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {tank.material && (
                      <div>
                        <p className="text-xs text-muted-foreground">Material</p>
                        <p className="capitalize">{tank.material}</p>
                      </div>
                    )}
                    {tank.install_date && (
                      <div>
                        <p className="text-xs text-muted-foreground">Installed</p>
                        <p>{format(new Date(tank.install_date), 'MMM d, yyyy')}</p>
                      </div>
                    )}
                    {tank.last_pumped_date && (
                      <div>
                        <p className="text-xs text-muted-foreground">Last Pumped</p>
                        <p>{format(new Date(tank.last_pumped_date), 'MMM d, yyyy')}</p>
                      </div>
                    )}
                    {tank.next_service_date && (
                      <div>
                        <p className="text-xs text-muted-foreground">Next Service</p>
                        <p>{format(new Date(tank.next_service_date), 'MMM d, yyyy')}</p>
                      </div>
                    )}
                  </div>

                  {tank.location_address && (
                    <p className="text-xs text-muted-foreground">📍 {tank.location_address}</p>
                  )}
                  {tank.notes && (
                    <p className="text-xs text-muted-foreground italic">{tank.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
