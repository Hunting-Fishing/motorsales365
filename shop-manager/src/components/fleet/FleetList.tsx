import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Equipment } from '@/types/equipment';
import { Car, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface FleetListProps {
  assets: Equipment[];
  loading: boolean;
  onUpdate: () => void;
}

export function FleetList({ assets, loading }: FleetListProps) {
  if (loading) {
    return <div className="text-center py-8">Loading fleet...</div>;
  }

  if (assets.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No fleet vehicles yet</p>
            <p className="text-sm">Add your first company vehicle to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-500';
      case 'maintenance': return 'bg-orange-500';
      case 'out_of_service': return 'bg-red-500';
      case 'down': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {assets.map((asset) => (
        <Card key={asset.id}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>{asset.name}</span>
              <Badge className={getStatusColor(asset.status)}>
                {asset.status.replace('_', ' ')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Model:</span> {asset.manufacturer} {asset.model}
            </div>
            {asset.serial_number && (
              <div className="text-sm">
                <span className="font-medium">Serial #:</span> {asset.serial_number}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Car className="h-4 w-4" />
              <span className="capitalize">{asset.category.replace('_', ' ')}</span>
            </div>
            {asset.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                <span>{asset.location}</span>
              </div>
            )}
            {asset.next_maintenance_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                <span>Next maintenance: {format(new Date(asset.next_maintenance_date), 'MMM d, yyyy')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
