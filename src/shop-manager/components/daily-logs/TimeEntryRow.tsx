import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { ActivityType } from '@/hooks/useActivityTypes';

interface VesselEquipment {
  id: string;
  name: string;
  type: 'vessel' | 'equipment';
  category?: string;
}

interface TimeEntryRowProps {
  index: number;
  entry: {
    start_time: string;
    end_time: string;
    activity_type_id: string;
    vessel_id: string | null;
    work_location_type: string;
    work_description: string;
    comments: string;
  };
  activityTypes: ActivityType[];
  vesselEquipmentOptions: VesselEquipment[];
  duration: number;
  onChange: (field: string, value: string | null) => void;
  onDelete: () => void;
  canDelete: boolean;
}

export function TimeEntryRow({
  index,
  entry,
  activityTypes,
  vesselEquipmentOptions,
  duration,
  onChange,
  onDelete,
  canDelete
}: TimeEntryRowProps) {
  // Group options by category
  const groupedOptions = vesselEquipmentOptions.reduce((acc, opt) => {
    const category = opt.category || (opt.type === 'vessel' ? 'Vessels' : 'Equipment');
    if (!acc[category]) acc[category] = [];
    acc[category].push(opt);
    return acc;
  }, {} as Record<string, VesselEquipment[]>);

  return (
    <div className="grid grid-cols-12 gap-2 items-center p-3 bg-card border border-border rounded-lg">
      {/* Row number */}
      <div className="col-span-1 text-center text-muted-foreground font-medium">
        {index + 1}
      </div>
      
      {/* Start Time */}
      <div className="col-span-2">
        <Input
          type="time"
          value={entry.start_time}
          onChange={(e) => onChange('start_time', e.target.value)}
          className="text-center font-mono"
          placeholder="00:00"
        />
      </div>
      
      {/* End Time */}
      <div className="col-span-2">
        <Input
          type="time"
          value={entry.end_time}
          onChange={(e) => onChange('end_time', e.target.value)}
          className="text-center font-mono"
          placeholder="00:00"
        />
      </div>
      
      {/* Activity Type */}
      <div className="col-span-2">
        <Select
          value={entry.activity_type_id}
          onValueChange={(value) => onChange('activity_type_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Activity" />
          </SelectTrigger>
          <SelectContent>
            {activityTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.code} - {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Vessel/Equipment */}
      <div className="col-span-2">
        <Select
          value={entry.vessel_id || 'none'}
          onValueChange={(value) => onChange('vessel_id', value === 'none' ? null : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {Object.entries(groupedOptions).map(([category, options]) => (
              <React.Fragment key={category}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                  {category}
                </div>
                {options.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.name}
                  </SelectItem>
                ))}
              </React.Fragment>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Duration */}
      <div className="col-span-1 text-center">
        <span className="font-mono font-semibold text-primary">
          {duration.toFixed(2)}
        </span>
      </div>
      
      {/* Comments */}
      <div className="col-span-1">
        <Input
          value={entry.comments}
          onChange={(e) => onChange('comments', e.target.value)}
          placeholder="Note"
          className="text-xs"
        />
      </div>
      
      {/* Delete button */}
      <div className="col-span-1 text-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={!canDelete}
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
