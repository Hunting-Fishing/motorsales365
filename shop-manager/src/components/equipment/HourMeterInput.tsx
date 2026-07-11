import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Gauge, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HourMeterInputProps {
  itemKey: string;
  itemName: string;
  description?: string;
  linkedComponentType?: string;
  unit?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  equipmentId?: string;
  isRequired?: boolean;
}

export function HourMeterInput({
  itemKey,
  itemName,
  description,
  linkedComponentType,
  unit = 'hours',
  value,
  onChange,
  equipmentId,
  isRequired,
}: HourMeterInputProps) {
  const [previousReading, setPreviousReading] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (linkedComponentType && equipmentId) {
      fetchPreviousReading();
    }
  }, [linkedComponentType, equipmentId]);

  const fetchPreviousReading = async () => {
    if (!equipmentId || !linkedComponentType) return;
    
    setIsLoading(true);
    try {
      // Try to find a child component that matches the linked type
      const { data: childComponent } = await supabase
        .from('equipment_assets')
        .select('id, current_hours')
        .eq('parent_equipment_id', equipmentId)
        .ilike('name', `%${linkedComponentType.replace(/_/g, ' ')}%`)
        .limit(1)
        .single();

      if (childComponent?.current_hours) {
        setPreviousReading(childComponent.current_hours);
        return;
      }

      // Fallback: get from inspection logs
      const { data: lastInspection } = await supabase
        .from('equipment_inspections')
        .select('current_reading')
        .eq('equipment_id', equipmentId)
        .order('inspection_date', { ascending: false })
        .limit(1)
        .single();

      if (lastInspection?.current_reading) {
        setPreviousReading(lastInspection.current_reading);
      }
    } catch (error) {
      console.log('No previous reading found for', linkedComponentType);
    } finally {
      setIsLoading(false);
    }
  };

  const hoursAdded = value !== null && previousReading !== null 
    ? Math.max(0, value - previousReading) 
    : null;

  return (
    <Card className="p-4 space-y-3 border-primary/20 bg-primary/5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Gauge className="h-5 w-5 text-primary" />
          </div>
          <div>
            <Label className="text-base font-medium">
              {itemName}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Previous Reading */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Previous
          </div>
          <div className="h-10 px-3 flex items-center rounded-md border bg-muted text-muted-foreground font-mono">
            {isLoading ? '...' : previousReading !== null ? previousReading.toLocaleString() : 'N/A'}
          </div>
        </div>

        {/* Current Reading Input */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Gauge className="h-3 w-3" />
            Current {unit}
          </div>
          <Input
            type="number"
            step="0.1"
            min={previousReading ?? 0}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="Enter reading"
            className="font-mono"
            required={isRequired}
          />
        </div>

        {/* Hours Added */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            Added
          </div>
          <div className="h-10 px-3 flex items-center rounded-md border bg-muted font-mono">
            {hoursAdded !== null ? (
              <span className={hoursAdded > 0 ? 'text-green-600' : 'text-muted-foreground'}>
                +{hoursAdded.toFixed(1)}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
