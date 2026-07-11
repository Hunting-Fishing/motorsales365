import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMaintenanceIntervalTracking, CreateIntervalInput } from '@/hooks/useMaintenanceIntervalTracking';
import { useEquipmentHierarchy } from '@/hooks/useEquipmentHierarchy';
import { Loader2, Plus, Settings, Trash2, X } from 'lucide-react';
import { EquipmentHierarchySelector } from './EquipmentHierarchySelector';

const INTERVAL_TYPES = [
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'filter_change', label: 'Filter Change' },
  { value: 'belt_inspection', label: 'Belt Inspection' },
  { value: 'coolant_flush', label: 'Coolant Flush' },
  { value: 'impeller_check', label: 'Impeller Check' },
  { value: 'zincs', label: 'Zinc Replacement' },
  { value: 'transmission_service', label: 'Transmission Service' },
  { value: 'fuel_filter', label: 'Fuel Filter' },
  { value: 'other', label: 'Other' }
];

interface PartItem {
  name: string;
  qty: number;
  unit: string;
}

export function MaintenanceIntervalSetup() {
  const { toast } = useToast();
  const { allEquipment } = useEquipmentHierarchy();
  const [selectedParentId, setSelectedParentId] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  
  const { intervals, createInterval, updateInterval, isLoading } = useMaintenanceIntervalTracking(selectedEquipmentId);

  const [formData, setFormData] = useState({
    interval_type: '',
    interval_name: '',
    interval_hours: '',
    last_service_hours: '',
    last_service_date: ''
  });

  const [parts, setParts] = useState<PartItem[]>([]);
  const [newPart, setNewPart] = useState({ name: '', qty: '1', unit: 'each' });

  const handleAddPart = () => {
    if (newPart.name.trim()) {
      setParts([...parts, { name: newPart.name.trim(), qty: parseInt(newPart.qty) || 1, unit: newPart.unit }]);
      setNewPart({ name: '', qty: '1', unit: 'each' });
    }
  };

  const handleRemovePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedEquipmentId || !formData.interval_type || !formData.interval_hours) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const input: CreateIntervalInput = {
      equipment_id: selectedEquipmentId,
      interval_type: formData.interval_type,
      interval_name: formData.interval_name || INTERVAL_TYPES.find(t => t.value === formData.interval_type)?.label || formData.interval_type,
      interval_hours: parseFloat(formData.interval_hours),
      last_service_hours: formData.last_service_hours ? parseFloat(formData.last_service_hours) : 0,
      last_service_date: formData.last_service_date || undefined,
      parts_needed: parts
    };

    await createInterval.mutateAsync(input);
    
    // Reset form
    setFormData({
      interval_type: '',
      interval_name: '',
      interval_hours: '',
      last_service_hours: '',
      last_service_date: ''
    });
    setParts([]);
  };

  const handleDeactivate = async (intervalId: string) => {
    await updateInterval.mutateAsync({ id: intervalId, is_active: false });
  };

  const selectedEquipment = allEquipment.find(e => e.id === selectedEquipmentId);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Setup Maintenance Interval
          </CardTitle>
          <CardDescription>
            Configure maintenance schedules with countdown tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <EquipmentHierarchySelector
            selectedParentId={selectedParentId}
            selectedEquipmentId={selectedEquipmentId}
            onParentChange={setSelectedParentId}
            onEquipmentChange={(id) => setSelectedEquipmentId(id)}
          />

          {selectedEquipment && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Current Hours</p>
              <p className="text-lg font-semibold">
                {selectedEquipment.current_hours?.toLocaleString() || 0} hrs
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Interval Type</Label>
              <Select 
                value={formData.interval_type} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, interval_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Interval (Hours)</Label>
              <Input
                type="number"
                placeholder="e.g., 250"
                value={formData.interval_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, interval_hours: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custom Name (Optional)</Label>
            <Input
              placeholder="e.g., Generator Oil Change"
              value={formData.interval_name}
              onChange={(e) => setFormData(prev => ({ ...prev, interval_name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Previous Service Hours</Label>
              <Input
                type="number"
                placeholder="Hours at last service"
                value={formData.last_service_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, last_service_hours: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Previous Service Date</Label>
              <Input
                type="date"
                value={formData.last_service_date}
                onChange={(e) => setFormData(prev => ({ ...prev, last_service_date: e.target.value }))}
              />
            </div>
          </div>

          {/* Parts Section */}
          <div className="space-y-2">
            <Label>Parts Needed for Service</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Part name"
                value={newPart.name}
                onChange={(e) => setNewPart(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Qty"
                value={newPart.qty}
                onChange={(e) => setNewPart(prev => ({ ...prev, qty: e.target.value }))}
                className="w-16"
              />
              <Select 
                value={newPart.unit} 
                onValueChange={(v) => setNewPart(prev => ({ ...prev, unit: v }))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="each">each</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="gal">gal</SelectItem>
                  <SelectItem value="qt">qt</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" size="icon" variant="outline" onClick={handleAddPart}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {parts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {parts.map((part, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {part.qty} {part.unit} {part.name}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => handleRemovePart(idx)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedEquipmentId || !formData.interval_type || !formData.interval_hours || createInterval.isPending}
            className="w-full"
          >
            {createInterval.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Maintenance Interval
          </Button>
        </CardContent>
      </Card>

      {/* Active Intervals */}
      <Card>
        <CardHeader>
          <CardTitle>Active Intervals</CardTitle>
          <CardDescription>
            {selectedEquipment ? `Intervals for ${selectedEquipment.name}` : 'Select equipment to view intervals'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : intervals.length > 0 ? (
            <div className="space-y-3">
              {intervals.map(interval => (
                <div key={interval.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{interval.interval_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Every {interval.interval_hours} hours
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Next service at: {interval.next_service_hours?.toLocaleString()} hrs
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeactivate(interval.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {interval.parts_needed && interval.parts_needed.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {interval.parts_needed.map((part, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {part.qty}{part.unit ? ` ${part.unit}` : 'x'} {part.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {selectedEquipmentId ? 'No intervals configured' : 'Select equipment to view intervals'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
