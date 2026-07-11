import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Equipment } from '@/types/equipment';
import { Calendar, MapPin, Settings, Wrench } from 'lucide-react';
import { format } from 'date-fns';

interface EquipmentGridProps {
  equipment: Equipment[];
  isLoading: boolean;
}

export function EquipmentGrid({ equipment, isLoading }: EquipmentGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (equipment.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Equipment Found</h3>
          <p className="text-muted-foreground">
            Get started by adding your first piece of equipment.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-success/10 text-success border-success/20';
      case 'maintenance':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'out_of_service':
        return 'bg-error/10 text-error border-error/20';
      default:
        return 'bg-muted/50 text-muted-foreground';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'maintenance':
        return 'Needs Maintenance';
      case 'out_of_service':
        return 'Out of Service';
      default:
        return status;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {equipment.map((item) => (
        <Card key={item.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{item.name}</CardTitle>
                {item.model && (
                  <p className="text-sm text-muted-foreground">
                    {item.manufacturer} {item.model}
                  </p>
                )}
              </div>
              <Badge className={getStatusColor(item.status)}>
                {formatStatus(item.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{item.location || 'No location set'}</span>
              </div>
              
              {item.next_maintenance_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Next maintenance: {format(new Date(item.next_maintenance_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}

              {item.serial_number && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">S/N:</span> {item.serial_number}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Settings className="h-4 w-4 mr-2" />
                Details
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Wrench className="h-4 w-4 mr-2" />
                Maintenance
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}