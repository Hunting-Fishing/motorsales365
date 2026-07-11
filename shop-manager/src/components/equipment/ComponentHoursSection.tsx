import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Gauge, Clock, AlertCircle } from 'lucide-react';
import { useComponentHours, ComponentWithHours } from '@/hooks/useComponentHours';
import { Skeleton } from '@/components/ui/skeleton';

interface ComponentHoursSectionProps {
  parentEquipmentId: string;
  onHoursChange: (readings: { equipmentId: string; hours: number }[]) => void;
  initialReadings?: Record<string, number>;
}

export function ComponentHoursSection({
  parentEquipmentId,
  onHoursChange,
  initialReadings = {},
}: ComponentHoursSectionProps) {
  const { components, loadingComponents } = useComponentHours(parentEquipmentId);
  const [hourInputs, setHourInputs] = useState<Record<string, string>>({});

  // Initialize inputs from initial readings
  useEffect(() => {
    if (Object.keys(initialReadings).length > 0) {
      const inputs: Record<string, string> = {};
      Object.entries(initialReadings).forEach(([id, value]) => {
        inputs[id] = value.toString();
      });
      setHourInputs(inputs);
    }
  }, [initialReadings]);

  // Notify parent of changes
  useEffect(() => {
    const readings = Object.entries(hourInputs)
      .filter(([_, value]) => value !== '' && !isNaN(parseFloat(value)))
      .map(([equipmentId, value]) => ({
        equipmentId,
        hours: parseFloat(value),
      }));
    onHoursChange(readings);
  }, [hourInputs, onHoursChange]);

  const handleHourChange = (equipmentId: string, value: string) => {
    setHourInputs(prev => ({
      ...prev,
      [equipmentId]: value,
    }));
  };

  const getEquipmentTypeLabel = (type: string | null) => {
    if (!type) return 'Component';
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getHoursAdded = (component: ComponentWithHours, newHours: string) => {
    if (!newHours || !component.current_hours) return null;
    const diff = parseFloat(newHours) - component.current_hours;
    return diff > 0 ? diff : null;
  };

  if (loadingComponents) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Component Hour Readings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (components.length === 0) {
    return null; // Don't show section if no child components
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          Component Hour Readings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter current hours for each component
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {components.map(component => {
          const inputValue = hourInputs[component.id] || '';
          const hoursAdded = getHoursAdded(component, inputValue);
          const isInvalid = inputValue && component.current_hours && 
            parseFloat(inputValue) < component.current_hours;

          return (
            <div key={component.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`hours-${component.id}`} className="flex items-center gap-2">
                  {component.name}
                  <Badge variant="outline" className="text-xs font-normal">
                    {getEquipmentTypeLabel(component.equipment_type)}
                  </Badge>
                </Label>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Previous: {component.current_hours?.toLocaleString() || 0} hrs</span>
                </div>
              </div>
              
              <div className="relative">
                <Input
                  id={`hours-${component.id}`}
                  type="number"
                  step="0.1"
                  min={component.current_hours || 0}
                  placeholder={`Enter current hours (was ${component.current_hours || 0})`}
                  value={inputValue}
                  onChange={(e) => handleHourChange(component.id, e.target.value)}
                  className={isInvalid ? 'border-destructive' : ''}
                />
                {hoursAdded !== null && hoursAdded > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-600 font-medium">
                    +{hoursAdded.toFixed(1)} hrs
                  </span>
                )}
              </div>
              
              {isInvalid && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Hours cannot be less than previous reading
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
