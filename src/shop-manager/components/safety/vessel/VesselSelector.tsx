import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Ship, Clock, Calendar } from 'lucide-react';
import { VesselEquipment } from '@/hooks/useVesselInspection';
import { format } from 'date-fns';

interface VesselSelectorProps {
  vessels: VesselEquipment[];
  selectedVesselId: string | null;
  onSelect: (vesselId: string) => void;
  lastInspectionDate?: string | null;
  isLoading?: boolean;
}

export function VesselSelector({
  vessels,
  selectedVesselId,
  onSelect,
  lastInspectionDate,
  isLoading
}: VesselSelectorProps) {
  const selectedVessel = vessels.find(v => v.id === selectedVesselId);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Ship className="h-4 w-4" />
          Select Vessel
        </Label>
        <Select
          value={selectedVesselId || ''}
          onValueChange={onSelect}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a vessel to inspect..." />
          </SelectTrigger>
          <SelectContent>
            {vessels.map(vessel => (
              <SelectItem key={vessel.id} value={vessel.id}>
                <div className="flex items-center gap-2">
                  <Ship className="h-4 w-4 text-muted-foreground" />
                  <span>{vessel.name}</span>
                  {vessel.asset_number && (
                    <span className="text-muted-foreground">({vessel.asset_number})</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedVessel && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium">{selectedVessel.name}</h4>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {selectedVessel.current_hours !== null && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{selectedVessel.current_hours} hours</span>
              </div>
            )}
            {lastInspectionDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Last inspected: {format(new Date(lastInspectionDate), 'MMM d, yyyy')}</span>
              </div>
            )}
            {selectedVessel.asset_number && (
              <span>Asset #: {selectedVessel.asset_number}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
