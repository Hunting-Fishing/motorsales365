import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useEquipmentInspections, GYRStatus } from '@/hooks/useEquipmentInspections';
import { GYRSelector, GYRLegend } from './GYRSelector';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface PreTripInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  equipmentName: string;
  readingType: 'hours' | 'kilometers' | 'miles';
}

export function PreTripInspectionDialog({
  open,
  onOpenChange,
  equipmentId,
  equipmentName,
  readingType,
}: PreTripInspectionDialogProps) {
  const { createInspection, loading } = useEquipmentInspections(equipmentId);
  const [previousHours, setPreviousHours] = useState<number | null>(null);
  const [currentReading, setCurrentReading] = useState('');
  
  // GYR status for each inspection item
  const [fluidLevelsStatus, setFluidLevelsStatus] = useState<GYRStatus>(3);
  const [fluidNotes, setFluidNotes] = useState('');
  const [visualDamageStatus, setVisualDamageStatus] = useState<GYRStatus>(3);
  const [visualDamageNotes, setVisualDamageNotes] = useState('');
  const [safetyEquipmentStatus, setSafetyEquipmentStatus] = useState<GYRStatus>(3);
  const [safetyEquipmentNotes, setSafetyEquipmentNotes] = useState('');
  const [operationalStatus, setOperationalStatus] = useState<GYRStatus>(3);
  const [operationalNotes, setOperationalNotes] = useState('');
  
  const [requiresMaintenance, setRequiresMaintenance] = useState(false);
  const [urgentRepair, setUrgentRepair] = useState(false);
  const [generalNotes, setGeneralNotes] = useState('');

  // Fetch previous hours from equipment or last inspection
  useEffect(() => {
    if (open && equipmentId) {
      fetchPreviousHours();
    }
  }, [open, equipmentId]);

  const fetchPreviousHours = async () => {
    try {
      // First try to get from equipment_assets
      const { data: equipment } = await supabase
        .from('equipment_assets')
        .select('current_hours')
        .eq('id', equipmentId)
        .single();

      if (equipment?.current_hours) {
        setPreviousHours(equipment.current_hours);
        return;
      }

      // Fallback to last inspection reading
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate overall status based on GYR values
    const statuses = [fluidLevelsStatus, visualDamageStatus, safetyEquipmentStatus, operationalStatus];
    const hasRed = statuses.some(s => s === 1);
    const hasYellow = statuses.some(s => s === 2);
    const hasNotes = fluidNotes || visualDamageNotes || safetyEquipmentNotes || operationalNotes || generalNotes;
    
    let overallStatus: 'pass' | 'pass_with_notes' | 'fail';
    if (hasRed || urgentRepair) {
      overallStatus = 'fail';
    } else if (hasYellow || hasNotes || requiresMaintenance) {
      overallStatus = 'pass_with_notes';
    } else {
      overallStatus = 'pass';
    }

    try {
      await createInspection({
        equipment_id: equipmentId,
        current_reading: parseFloat(currentReading),
        reading_type: readingType,
        // Legacy boolean fields for backward compatibility
        fluid_levels_ok: fluidLevelsStatus === 3,
        fluid_notes: fluidNotes || null,
        visual_damage_ok: visualDamageStatus === 3,
        visual_damage_notes: visualDamageNotes || null,
        safety_equipment_ok: safetyEquipmentStatus === 3,
        safety_equipment_notes: safetyEquipmentNotes || null,
        operational_ok: operationalStatus === 3,
        operational_notes: operationalNotes || null,
        // New GYR status fields
        fluid_levels_status: fluidLevelsStatus,
        visual_damage_status: visualDamageStatus,
        safety_equipment_status: safetyEquipmentStatus,
        operational_status: operationalStatus,
        overall_status: overallStatus,
        requires_maintenance: requiresMaintenance,
        urgent_repair: urgentRepair,
        parts_needed: [],
        general_notes: generalNotes || null,
      });
      
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to submit inspection:', error);
    }
  };

  const resetForm = () => {
    setCurrentReading('');
    setFluidLevelsStatus(3);
    setFluidNotes('');
    setVisualDamageStatus(3);
    setVisualDamageNotes('');
    setSafetyEquipmentStatus(3);
    setSafetyEquipmentNotes('');
    setOperationalStatus(3);
    setOperationalNotes('');
    setRequiresMaintenance(false);
    setUrgentRepair(false);
    setGeneralNotes('');
  };

  const getCardClassName = (status: GYRStatus) => {
    if (status === 1) return 'border-red-500 bg-red-50 dark:bg-red-950/30';
    if (status === 2) return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30';
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pre-Trip Inspection - {equipmentName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Legend */}
          <GYRLegend />

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

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Inspection Checklist</h3>
            
            <Card className={`p-4 space-y-3 transition-colors ${getCardClassName(fluidLevelsStatus)}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Label className="text-base font-medium">Fluid Levels</Label>
                <GYRSelector value={fluidLevelsStatus} onChange={setFluidLevelsStatus} />
              </div>
              {fluidLevelsStatus !== 3 && (
                <Textarea
                  placeholder="Describe fluid level issues..."
                  value={fluidNotes}
                  onChange={(e) => setFluidNotes(e.target.value)}
                  className="mt-2"
                />
              )}
            </Card>

            <Card className={`p-4 space-y-3 transition-colors ${getCardClassName(visualDamageStatus)}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Label className="text-base font-medium">Visual Inspection (No Damage)</Label>
                <GYRSelector value={visualDamageStatus} onChange={setVisualDamageStatus} />
              </div>
              {visualDamageStatus !== 3 && (
                <Textarea
                  placeholder="Describe damage found..."
                  value={visualDamageNotes}
                  onChange={(e) => setVisualDamageNotes(e.target.value)}
                  className="mt-2"
                />
              )}
            </Card>

            <Card className={`p-4 space-y-3 transition-colors ${getCardClassName(safetyEquipmentStatus)}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Label className="text-base font-medium">Safety Equipment</Label>
                <GYRSelector value={safetyEquipmentStatus} onChange={setSafetyEquipmentStatus} />
              </div>
              {safetyEquipmentStatus !== 3 && (
                <Textarea
                  placeholder="Describe safety equipment issues..."
                  value={safetyEquipmentNotes}
                  onChange={(e) => setSafetyEquipmentNotes(e.target.value)}
                  className="mt-2"
                />
              )}
            </Card>

            <Card className={`p-4 space-y-3 transition-colors ${getCardClassName(operationalStatus)}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Label className="text-base font-medium">Operational Check</Label>
                <GYRSelector value={operationalStatus} onChange={setOperationalStatus} />
              </div>
              {operationalStatus !== 3 && (
                <Textarea
                  placeholder="Describe operational issues..."
                  value={operationalNotes}
                  onChange={(e) => setOperationalNotes(e.target.value)}
                  className="mt-2"
                />
              )}
            </Card>
          </div>

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

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Complete Inspection'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
