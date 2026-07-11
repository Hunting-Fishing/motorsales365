import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { X, Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EquipmentType, getEquipmentTypeConfig } from './EquipmentTypeSelector';
import { FuelTypeSelect } from '@/components/fuel-delivery/FuelTypeSelect';

export interface EquipmentData {
  id: string;
  equipment_type: EquipmentType;
  name?: string;
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  fuel_type?: string;
  license_plate?: string;
  color?: string;
  tank_capacity_gallons?: number;
  location_notes?: string;
  notes?: string;
}

interface EquipmentCardProps {
  equipment: EquipmentData;
  onChange: (equipment: EquipmentData) => void;
  onRemove: () => void;
  isFirst?: boolean;
}

export function EquipmentCard({ equipment, onChange, onRemove, isFirst = false }: EquipmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDecodingVin, setIsDecodingVin] = useState(false);
  const typeConfig = getEquipmentTypeConfig(equipment.equipment_type);
  const Icon = typeConfig.icon;

  const updateField = <K extends keyof EquipmentData>(field: K, value: EquipmentData[K]) => {
    onChange({ ...equipment, [field]: value });
  };

  const decodeVin = async () => {
    if (!equipment.vin || equipment.vin.length !== 17) return;
    
    setIsDecodingVin(true);
    try {
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${equipment.vin}?format=json`
      );
      const data = await response.json();
      
      if (data.Results) {
        const getValue = (variableId: number) => {
          const result = data.Results.find((r: any) => r.VariableId === variableId);
          return result?.Value && result.Value !== 'Not Applicable' ? result.Value : undefined;
        };

        onChange({
          ...equipment,
          year: parseInt(getValue(29)) || equipment.year,
          make: getValue(26) || equipment.make,
          model: getValue(28) || equipment.model,
        });
      }
    } catch (error) {
      console.error('VIN decode error:', error);
    } finally {
      setIsDecodingVin(false);
    }
  };

  const getDisplayTitle = () => {
    if (equipment.equipment_type === 'vehicle' || equipment.equipment_type === 'boat') {
      const parts = [equipment.year, equipment.make, equipment.model].filter(Boolean);
      return parts.length > 0 ? parts.join(' ') : typeConfig.label;
    }
    return equipment.name || typeConfig.label;
  };

  const renderVehicleBoatFields = () => (
    <>
      {/* VIN Field with Decode */}
      <div className="space-y-2">
        <Label className="text-xs">VIN</Label>
        <div className="flex gap-2">
          <Input
            placeholder="17-character VIN"
            value={equipment.vin || ''}
            onChange={(e) => updateField('vin', e.target.value.toUpperCase())}
            maxLength={17}
            className="flex-1 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={decodeVin}
            disabled={!equipment.vin || equipment.vin.length !== 17 || isDecodingVin}
          >
            {isDecodingVin ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Year, Make, Model */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Year</Label>
          <Input
            type="number"
            placeholder="2024"
            value={equipment.year || ''}
            onChange={(e) => updateField('year', parseInt(e.target.value) || undefined)}
            min={1900}
            max={new Date().getFullYear() + 1}
            className="text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Make</Label>
          <Input
            placeholder="Ford"
            value={equipment.make || ''}
            onChange={(e) => updateField('make', e.target.value)}
            className="text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Model</Label>
          <Input
            placeholder="F-150"
            value={equipment.model || ''}
            onChange={(e) => updateField('model', e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      {/* License Plate & Color (vehicles only) */}
      {equipment.equipment_type === 'vehicle' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">License Plate</Label>
            <Input
              placeholder="ABC-1234"
              value={equipment.license_plate || ''}
              onChange={(e) => updateField('license_plate', e.target.value.toUpperCase())}
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <Input
              placeholder="White"
              value={equipment.color || ''}
              onChange={(e) => updateField('color', e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
      )}
    </>
  );

  const renderTankEquipmentFields = () => (
    <>
      <div className="space-y-2">
        <Label className="text-xs">Name/Description *</Label>
        <Input
          placeholder={equipment.equipment_type === 'fuel_tank' ? 'Home Heating Tank' : 'Backup Generator'}
          value={equipment.name || ''}
          onChange={(e) => updateField('name', e.target.value)}
          className="text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Location</Label>
        <Input
          placeholder="e.g., Backyard, Garage, Basement"
          value={equipment.location_notes || ''}
          onChange={(e) => updateField('location_notes', e.target.value)}
          className="text-sm"
        />
      </div>
    </>
  );

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <div className={cn('p-1.5 rounded-md bg-muted', typeConfig.color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getDisplayTitle()}</p>
            <p className="text-xs text-muted-foreground">
              {equipment.fuel_type || 'No fuel type set'} 
              {equipment.tank_capacity_gallons && ` • ${equipment.tank_capacity_gallons} gal`}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3 pt-0 space-y-3">
          {/* Type-specific fields */}
          {(equipment.equipment_type === 'vehicle' || equipment.equipment_type === 'boat') 
            ? renderVehicleBoatFields() 
            : renderTankEquipmentFields()}

          {/* Common fields: Fuel Type & Tank Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Fuel Type</Label>
              <FuelTypeSelect
                value={equipment.fuel_type || ''}
                onChange={(value) => updateField('fuel_type', value)}
                placeholder="Select fuel"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tank Capacity (gal)</Label>
              <Input
                type="number"
                placeholder="20"
                value={equipment.tank_capacity_gallons || ''}
                onChange={(e) => updateField('tank_capacity_gallons', parseFloat(e.target.value) || undefined)}
                min={0}
                className="text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-xs">Notes</Label>
            <Textarea
              placeholder="Special instructions or notes..."
              value={equipment.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
