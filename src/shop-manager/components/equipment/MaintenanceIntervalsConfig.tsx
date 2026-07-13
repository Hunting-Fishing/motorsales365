import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface MaintenanceInterval {
  id: string;
  name: string;
  intervalHours?: number;
  intervalMiles?: number;
  intervalMonths?: number;
  engineNumber?: number; // For vessels with multiple engines
  description?: string;
}

interface MaintenanceIntervalsConfigProps {
  equipmentType: string;
  intervals: MaintenanceInterval[];
  onChange: (intervals: MaintenanceInterval[]) => void;
}

// Equipment-specific maintenance templates
const MAINTENANCE_TEMPLATES: Record<string, MaintenanceInterval[]> = {
  vessel: [
    { id: '1', name: 'Engine 1 Oil Change', intervalHours: 100, engineNumber: 1 },
    { id: '2', name: 'Engine 2 Oil Change', intervalHours: 100, engineNumber: 2 },
    { id: '3', name: 'Leg Oil (Lower Unit)', intervalHours: 100 },
    { id: '4', name: 'Hydraulic Fluid', intervalHours: 250 },
    { id: '5', name: 'Fuel Filter', intervalHours: 250 },
    { id: '6', name: 'Impeller Inspection', intervalHours: 500 },
    { id: '7', name: 'Hull Inspection', intervalMonths: 6 },
  ],
  outboard: [
    { id: '1', name: 'Engine Oil Change', intervalHours: 100 },
    { id: '2', name: 'Lower Unit Gear Oil', intervalHours: 100 },
    { id: '3', name: 'Spark Plugs', intervalHours: 100 },
    { id: '4', name: 'Fuel Filter', intervalHours: 100 },
    { id: '5', name: 'Impeller', intervalHours: 300 },
    { id: '6', name: 'Anodes', intervalMonths: 12 },
  ],
  heavy_truck: [
    { id: '1', name: 'Engine Oil & Filter', intervalMiles: 25000, intervalMonths: 6 },
    { id: '2', name: 'Transmission Fluid', intervalMiles: 50000 },
    { id: '3', name: 'Differential Oil', intervalMiles: 50000 },
    { id: '4', name: 'Air Filter', intervalMiles: 25000 },
    { id: '5', name: 'Fuel Filter', intervalMiles: 25000 },
    { id: '6', name: 'DPF Cleaning', intervalMiles: 100000 },
    { id: '7', name: 'Brake Inspection', intervalMonths: 3 },
  ],
  semi: [
    { id: '1', name: 'Engine Oil & Filter', intervalMiles: 25000, intervalMonths: 6 },
    { id: '2', name: 'Transmission Fluid', intervalMiles: 50000 },
    { id: '3', name: 'Differential Oil', intervalMiles: 50000 },
    { id: '4', name: 'Air Filter', intervalMiles: 25000 },
    { id: '5', name: 'DOT Inspection', intervalMonths: 12 },
  ],
  fleet_vehicle: [
    { id: '1', name: 'Oil Change', intervalMiles: 5000, intervalMonths: 6 },
    { id: '2', name: 'Tire Rotation', intervalMiles: 7500 },
    { id: '3', name: 'Brake Inspection', intervalMiles: 15000 },
    { id: '4', name: 'Transmission Service', intervalMiles: 30000 },
    { id: '5', name: 'Coolant Flush', intervalMonths: 24 },
  ],
  courtesy_car: [
    { id: '1', name: 'Oil Change', intervalMiles: 5000, intervalMonths: 6 },
    { id: '2', name: 'Tire Rotation', intervalMiles: 7500 },
    { id: '3', name: 'Safety Inspection', intervalMonths: 6 },
    { id: '4', name: 'Detail & Cleaning', intervalMonths: 3 },
  ],
  generator: [
    { id: '1', name: 'Oil Change', intervalHours: 100, intervalMonths: 12 },
    { id: '2', name: 'Air Filter', intervalHours: 200 },
    { id: '3', name: 'Spark Plugs', intervalHours: 500 },
    { id: '4', name: 'Fuel Filter', intervalHours: 300 },
    { id: '5', name: 'Load Bank Test', intervalMonths: 12 },
    { id: '6', name: 'Battery Check', intervalMonths: 6 },
  ],
  forklift: [
    { id: '1', name: 'Engine Oil & Filter', intervalHours: 250, intervalMonths: 6 },
    { id: '2', name: 'Hydraulic Fluid', intervalHours: 1000 },
    { id: '3', name: 'Transmission Oil', intervalHours: 1000 },
    { id: '4', name: 'Brake Fluid', intervalMonths: 12 },
    { id: '5', name: 'Chain Lubrication', intervalHours: 50 },
    { id: '6', name: 'Load Test', intervalMonths: 12 },
  ],
  excavator: [
    { id: '1', name: 'Engine Oil & Filter', intervalHours: 250, intervalMonths: 6 },
    { id: '2', name: 'Hydraulic Oil', intervalHours: 1000 },
    { id: '3', name: 'Hydraulic Filter', intervalHours: 500 },
    { id: '4', name: 'Swing Drive Oil', intervalHours: 1000 },
    { id: '5', name: 'Final Drive Oil', intervalHours: 1000 },
    { id: '6', name: 'Fuel Filter', intervalHours: 500 },
    { id: '7', name: 'Air Filter', intervalHours: 500 },
    { id: '8', name: 'Track Tension', intervalHours: 100 },
  ],
  loader: [
    { id: '1', name: 'Engine Oil & Filter', intervalHours: 250, intervalMonths: 6 },
    { id: '2', name: 'Hydraulic Oil', intervalHours: 1000 },
    { id: '3', name: 'Transmission Oil', intervalHours: 1000 },
    { id: '4', name: 'Differential Oil', intervalHours: 1000 },
    { id: '5', name: 'Fuel Filter', intervalHours: 500 },
    { id: '6', name: 'Air Filter', intervalHours: 500 },
  ],
  dozer: [
    { id: '1', name: 'Engine Oil & Filter', intervalHours: 250, intervalMonths: 6 },
    { id: '2', name: 'Hydraulic Oil', intervalHours: 1000 },
    { id: '3', name: 'Final Drive Oil', intervalHours: 1000 },
    { id: '4', name: 'Track Tension', intervalHours: 100 },
    { id: '5', name: 'Fuel Filter', intervalHours: 500 },
    { id: '6', name: 'Air Filter', intervalHours: 500 },
  ],
  crane: [
    { id: '1', name: 'Engine Oil & Filter', intervalHours: 250, intervalMonths: 6 },
    { id: '2', name: 'Hydraulic Oil', intervalHours: 1000 },
    { id: '3', name: 'Wire Rope Inspection', intervalMonths: 3 },
    { id: '4', name: 'Load Test', intervalMonths: 12 },
    { id: '5', name: 'Brake System', intervalMonths: 6 },
    { id: '6', name: 'Outrigger Inspection', intervalMonths: 6 },
  ],
};

export function MaintenanceIntervalsConfig({ 
  equipmentType, 
  intervals, 
  onChange 
}: MaintenanceIntervalsConfigProps) {
  const [editingIntervals, setEditingIntervals] = useState<MaintenanceInterval[]>(intervals);

  const handleLoadTemplate = () => {
    const template = MAINTENANCE_TEMPLATES[equipmentType] || [];
    const newIntervals = template.map(t => ({ ...t, id: crypto.randomUUID() }));
    setEditingIntervals(newIntervals);
    onChange(newIntervals);
  };

  const handleAddInterval = () => {
    const newInterval: MaintenanceInterval = {
      id: crypto.randomUUID(),
      name: '',
      intervalHours: undefined,
      intervalMiles: undefined,
      intervalMonths: undefined,
    };
    const updated = [...editingIntervals, newInterval];
    setEditingIntervals(updated);
    onChange(updated);
  };

  const handleUpdateInterval = (id: string, updates: Partial<MaintenanceInterval>) => {
    const updated = editingIntervals.map(interval =>
      interval.id === id ? { ...interval, ...updates } : interval
    );
    setEditingIntervals(updated);
    onChange(updated);
  };

  const handleRemoveInterval = (id: string) => {
    const updated = editingIntervals.filter(interval => interval.id !== id);
    setEditingIntervals(updated);
    onChange(updated);
  };

  const hasTemplate = equipmentType in MAINTENANCE_TEMPLATES;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Maintenance Intervals</h3>
          <p className="text-sm text-muted-foreground">
            Configure maintenance schedules for this equipment
          </p>
        </div>
        {hasTemplate && (
          <Button type="button" variant="outline" onClick={handleLoadTemplate} size="sm">
            Load {equipmentType.replace('_', ' ')} Template
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {editingIntervals.map((interval) => (
          <Card key={interval.id}>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <Label>Maintenance Task</Label>
                    <Input
                      placeholder="e.g., Engine Oil Change"
                      value={interval.name}
                      onChange={(e) => handleUpdateInterval(interval.id, { name: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveInterval(interval.id)}
                    className="mt-7"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Every (Hours)</Label>
                    <Input
                      type="number"
                      placeholder="Hours"
                      value={interval.intervalHours || ''}
                      onChange={(e) => handleUpdateInterval(interval.id, { 
                        intervalHours: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Every (Miles)</Label>
                    <Input
                      type="number"
                      placeholder="Miles"
                      value={interval.intervalMiles || ''}
                      onChange={(e) => handleUpdateInterval(interval.id, { 
                        intervalMiles: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Every (Months)</Label>
                    <Input
                      type="number"
                      placeholder="Months"
                      value={interval.intervalMonths || ''}
                      onChange={(e) => handleUpdateInterval(interval.id, { 
                        intervalMonths: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                    />
                  </div>
                </div>

                {interval.engineNumber && (
                  <div className="pt-1">
                    <Badge variant="secondary">Engine {interval.engineNumber}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={handleAddInterval} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Maintenance Interval
      </Button>
    </div>
  );
}
