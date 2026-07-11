import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Ruler } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AREA_TYPES } from './PropertyAreasTab';

interface PropertyAreaPickerProps {
  customerId: string | undefined;
  onSelectArea: (area: { square_footage: number; area_type: string; label: string | null }) => void;
}

interface PropertyAreaOption {
  id: string;
  area_type: string;
  label: string | null;
  square_footage: number;
}

export function PropertyAreaPicker({ customerId, onSelectArea }: PropertyAreaPickerProps) {
  const { data: areas, isLoading } = useQuery({
    queryKey: ['customer-property-areas-picker', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_property_areas')
        .select('id, area_type, label, square_footage')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PropertyAreaOption[];
    },
    enabled: !!customerId
  });

  if (!customerId || isLoading) return null;
  if (!areas || areas.length === 0) return null;

  const handleSelect = (areaId: string) => {
    if (areaId === 'manual') {
      return; // Do nothing, let user enter manually
    }
    
    const selected = areas.find(a => a.id === areaId);
    if (selected) {
      onSelectArea({
        square_footage: selected.square_footage,
        area_type: selected.area_type,
        label: selected.label
      });
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Ruler className="h-3 w-3" />
        Use saved area
      </Label>
      <Select onValueChange={handleSelect}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Select from saved areas..." />
        </SelectTrigger>
        <SelectContent>
          {areas.map(area => {
            const areaType = AREA_TYPES.find(t => t.value === area.area_type);
            return (
              <SelectItem key={area.id} value={area.id}>
                <span className="flex items-center gap-2">
                  <span>{areaType?.icon || '📐'}</span>
                  <span>{area.label || areaType?.label || 'Area'}</span>
                  <span className="text-muted-foreground">({area.square_footage.toLocaleString()} sqft)</span>
                </span>
              </SelectItem>
            );
          })}
          <SelectItem value="manual">
            <span className="text-muted-foreground">Enter manually...</span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
