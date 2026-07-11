import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useEquipmentInspections } from '@/hooks/useEquipmentInspections';
import { useTemplateForAsset } from '@/hooks/useInspectionTemplates';
import { DynamicInspectionForm } from './DynamicInspectionForm';
import { GYRSelector, GYRLegend } from './GYRSelector';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import type { InspectionDataValue, InspectionData } from '@/types/inspectionTemplate';
import type { GYRStatus } from '@/hooks/useEquipmentInspections';
import { ComponentHoursSection } from './ComponentHoursSection';
import { useComponentHours } from '@/hooks/useComponentHours';

interface PreTripInspectionDialogWithTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  equipmentName: string;
  readingType: 'hours' | 'kilometers' | 'miles';
  inspectionTemplateId?: string;
  equipmentType?: string;
}

export function PreTripInspectionDialogWithTemplate({
  open,
  onOpenChange,
  equipmentId,
  equipmentName,
  readingType,
  inspectionTemplateId,
  equipmentType,
}: PreTripInspectionDialogWithTemplateProps) {
  const { createInspection, loading: submitting } = useEquipmentInspections(equipmentId);
  const { data: template, isLoading: templateLoading } = useTemplateForAsset(inspectionTemplateId, equipmentType);
  const { components, saveHours, savingHours } = useComponentHours(equipmentId);
  
  const [previousHours, setPreviousHours] = useState<number | null>(null);
  const [currentReading, setCurrentReading] = useState('');
  const [inspectionValues, setInspectionValues] = useState<Record<string, InspectionDataValue>>({});
  const [requiresMaintenance, setRequiresMaintenance] = useState(false);
  const [urgentRepair, setUrgentRepair] = useState(false);
  const [generalNotes, setGeneralNotes] = useState('');
  const [componentHourReadings, setComponentHourReadings] = useState<{ equipmentId: string; hours: number }[]>([]);
  // Fetch previous hours from equipment or last inspection
  useEffect(() => {
    if (open && equipmentId) {
      fetchPreviousHours();
    }
  }, [open, equipmentId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setInspectionValues({});
      setCurrentReading('');
      setRequiresMaintenance(false);
      setUrgentRepair(false);
      setGeneralNotes('');
      setComponentHourReadings([]);
    }
  }, [open]);

  // Memoized callback for component hours changes
  const handleComponentHoursChange = useCallback((readings: { equipmentId: string; hours: number }[]) => {
    setComponentHourReadings(readings);
  }, []);

  const fetchPreviousHours = async () => {
    try {
      const { data: equipment } = await supabase
        .from('equipment_assets')
        .select('current_hours')
        .eq('id', equipmentId)
        .single();

      if (equipment?.current_hours) {
        setPreviousHours(equipment.current_hours);
        return;
      }

      const { data: lastInspection } = await supabase
        .from('equipment_inspections')
        .select('current_reading')
        .eq('equipment_id', equipmentId)
        .order('inspection_date', { ascending: false })
        .limit(1)
        .single();

      if (lastInspection?.current_reading) {
        setPreviousHours(lastInspection.current_reading);
      }
    } catch (error) {
      console.log('No previous hours found');
    }
  };

  const calculateOverallStatus = (): 'pass' | 'pass_with_notes' | 'fail' => {
    // Check all GYR status values
    const gyrValues = Object.values(inspectionValues)
      .filter(v => v.item_type === 'gyr_status')
      .map(v => v.value as number);

    const hasRed = gyrValues.some(v => v === 1);
    const hasYellow = gyrValues.some(v => v === 2);
    const hasNotes = Object.values(inspectionValues)
      .filter(v => v.item_type === 'text')
      .some(v => v.value);

    if (hasRed || urgentRepair) {
      return 'fail';
    } else if (hasYellow || hasNotes || requiresMaintenance || generalNotes) {
      return 'pass_with_notes';
    }
    return 'pass';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const overallStatus = calculateOverallStatus();

    // Build inspection data JSONB
    const inspectionData: InspectionData = template ? {
      template_id: template.id,
      template_version: template.version,
      values: inspectionValues,
    } : {
      template_id: '',
      template_version: 1,
      values: inspectionValues,
    };

    // Extract legacy fields from template values for backward compatibility
    const fluidLevelsStatus = (inspectionValues['fluid_levels']?.value as number) ?? 3;
    const visualDamageStatus = (inspectionValues['visual_damage']?.value as number) ?? 3;
    const safetyEquipmentStatus = (inspectionValues['safety_equipment']?.value as number) ?? 3;
    const operationalStatus = (inspectionValues['operational']?.value as number) ?? 3;

    try {
      // Save component hour readings first
      if (componentHourReadings.length > 0) {
        saveHours(componentHourReadings);
      }

      await createInspection({
        equipment_id: equipmentId,
        current_reading: parseFloat(currentReading),
        reading_type: readingType,
        // Legacy boolean fields for backward compatibility
        fluid_levels_ok: fluidLevelsStatus === 3,
        fluid_notes: (inspectionValues['fluid_levels_notes']?.value as string) || null,
        visual_damage_ok: visualDamageStatus === 3,
        visual_damage_notes: (inspectionValues['visual_damage_notes']?.value as string) || null,
        safety_equipment_ok: safetyEquipmentStatus === 3,
        safety_equipment_notes: (inspectionValues['safety_equipment_notes']?.value as string) || null,
        operational_ok: operationalStatus === 3,
        operational_notes: (inspectionValues['operational_notes']?.value as string) || null,
        // New GYR status fields
        fluid_levels_status: fluidLevelsStatus as GYRStatus,
        visual_damage_status: visualDamageStatus as GYRStatus,
        safety_equipment_status: safetyEquipmentStatus as GYRStatus,
        operational_status: operationalStatus as GYRStatus,
        overall_status: overallStatus,
        requires_maintenance: requiresMaintenance,
        urgent_repair: urgentRepair,
        parts_needed: [],
        general_notes: generalNotes || null,
        // Template-based data
        template_id: template?.id,
        inspection_data: inspectionData as unknown as Record<string, unknown>,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit inspection:', error);
    }
  };

  // Show loading state while template loads
  if (templateLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pre-Trip Inspection - {equipmentName}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pre-Trip Inspection - {equipmentName}</DialogTitle>
          {template && (
            <p className="text-sm text-muted-foreground">Using template: {template.name}</p>
          )}
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Hours Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Previous {readingType === 'hours' ? 'Hours' : readingType}</Label>
              <div className="h-10 px-3 flex items-center rounded-md border bg-muted text-muted-foreground">
                {previousHours !== null ? previousHours.toLocaleString() : 'N/A'}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reading">Current {readingType === 'hours' ? 'Hours' : readingType}</Label>
              <Input
                id="reading"
                type="number"
                step="0.01"
                value={currentReading}
                onChange={(e) => setCurrentReading(e.target.value)}
                required
                placeholder={`Enter current ${readingType}`}
              />
            </div>
          </div>

          {/* Component Hour Readings (Engines, Generators, etc.) */}
          {components.length > 0 && (
            <ComponentHoursSection
              parentEquipmentId={equipmentId}
              onHoursChange={handleComponentHoursChange}
            />
          )}

          {/* Dynamic Form from Template */}
          {template ? (
            <DynamicInspectionForm
              template={template}
              values={inspectionValues}
              onChange={setInspectionValues}
              equipmentId={equipmentId}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No inspection template found for this equipment type.</p>
              <p className="text-sm">Please create a template in Settings → Inspection Templates.</p>
            </div>
          )}

          {/* Maintenance Flags */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="maintenance">Requires Maintenance</Label>
              <Switch
                id="maintenance"
                checked={requiresMaintenance}
                onCheckedChange={setRequiresMaintenance}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <Label htmlFor="urgent">Urgent Repair Needed</Label>
              </div>
              <Switch
                id="urgent"
                checked={urgentRepair}
                onCheckedChange={setUrgentRepair}
              />
            </div>
          </div>

          {/* General Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">General Notes</Label>
            <Textarea
              id="notes"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Any additional observations..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !template}>
              {submitting ? 'Submitting...' : 'Complete Inspection'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
