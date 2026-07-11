import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { PropertyArea, AREA_TYPES } from './PropertyAreasTab';

interface PropertyAreaCardProps {
  area: PropertyArea;
  onEdit: () => void;
  onDelete: () => void;
}

export function PropertyAreaCard({ area, onEdit, onDelete }: PropertyAreaCardProps) {
  const areaType = AREA_TYPES.find(t => t.value === area.area_type);
  
  return (
    <div className="p-4 bg-muted/50 rounded-lg border border-border hover:border-cyan-500/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{areaType?.icon || '📐'}</span>
          <div>
            <p className="font-medium text-sm">{areaType?.label || 'Area'}</p>
            {area.label && (
              <p className="text-xs text-muted-foreground">"{area.label}"</p>
            )}
          </div>
        </div>
        <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-700 border-cyan-500/30">
          {area.square_footage.toLocaleString()} sqft
        </Badge>
      </div>

      {/* Dimensions if provided */}
      {(area.length_ft || area.width_ft || area.height_ft) && (
        <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-2">
          {area.length_ft && <span>L: {area.length_ft}ft</span>}
          {area.width_ft && <span>W: {area.width_ft}ft</span>}
          {area.height_ft && <span>H: {area.height_ft}ft</span>}
        </div>
      )}

      {/* Notes */}
      {area.notes && (
        <p className="mt-2 text-xs text-muted-foreground truncate">{area.notes}</p>
      )}

      {/* Last Serviced */}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {area.last_serviced_at 
            ? `Last serviced: ${format(new Date(area.last_serviced_at), 'MMM d, yyyy')}`
            : 'Never serviced'}
        </span>
        <span>{area.service_count} jobs</span>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
}
