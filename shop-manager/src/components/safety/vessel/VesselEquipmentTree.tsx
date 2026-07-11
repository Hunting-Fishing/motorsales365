import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ship, Anchor, Flame, Settings, Clock, MapPin } from 'lucide-react';
import { VesselEquipment } from '@/hooks/useVesselInspection';

interface VesselEquipmentTreeProps {
  vessel: VesselEquipment | null;
  childEquipment: VesselEquipment[];
  isLoading?: boolean;
}

const EQUIPMENT_ICONS: Record<string, React.ReactNode> = {
  vessel: <Ship className="h-4 w-4" />,
  outboard: <Anchor className="h-4 w-4" />,
  inboard: <Settings className="h-4 w-4" />,
  fire_extinguisher: <Flame className="h-4 w-4" />,
  generator: <Settings className="h-4 w-4" />,
  life_raft: <Ship className="h-4 w-4" />,
};

function getEquipmentIcon(type: string | null) {
  return EQUIPMENT_ICONS[type || ''] || <Settings className="h-4 w-4" />;
}

function getEquipmentTypeLabel(type: string | null) {
  const labels: Record<string, string> = {
    vessel: 'Vessel',
    outboard: 'Outboard Engine',
    inboard: 'Inboard Engine',
    fire_extinguisher: 'Fire Extinguisher',
    generator: 'Generator',
    life_raft: 'Life Raft',
  };
  return labels[type || ''] || type || 'Equipment';
}

export function VesselEquipmentTree({
  vessel,
  childEquipment,
  isLoading
}: VesselEquipmentTreeProps) {
  if (!vessel) return null;

  // Group equipment by type
  const groupedEquipment = childEquipment.reduce((acc, eq) => {
    const type = eq.equipment_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(eq);
    return acc;
  }, {} as Record<string, VesselEquipment[]>);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Ship className="h-5 w-5" />
          Equipment Hierarchy
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-muted rounded" />
            <div className="h-8 bg-muted rounded ml-4" />
            <div className="h-8 bg-muted rounded ml-4" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Main vessel */}
            <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
              <Ship className="h-5 w-5 text-primary" />
              <span className="font-medium">{vessel.name}</span>
              {vessel.current_hours !== null && (
                <Badge variant="secondary" className="ml-auto">
                  <Clock className="h-3 w-3 mr-1" />
                  {vessel.current_hours}h
                </Badge>
              )}
            </div>

            {/* Child equipment grouped by type */}
            {Object.entries(groupedEquipment).map(([type, equipment]) => (
              <div key={type} className="ml-4 space-y-1">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  {getEquipmentIcon(type)}
                  {getEquipmentTypeLabel(type)}s ({equipment.length})
                </div>
                <div className="space-y-1 ml-4">
                  {equipment.map(eq => (
                    <div 
                      key={eq.id} 
                      className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm"
                    >
                      {getEquipmentIcon(eq.equipment_type)}
                      <span>{eq.name}</span>
                      {eq.location && (
                        <span className="flex items-center gap-1 text-muted-foreground text-xs">
                          <MapPin className="h-3 w-3" />
                          {eq.location}
                        </span>
                      )}
                      {eq.current_hours !== null && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {eq.current_hours}h
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {childEquipment.length === 0 && (
              <p className="text-sm text-muted-foreground ml-4">
                No child equipment configured for this vessel.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
