import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useLiftInspections, CreateLiftInspectionData } from '@/hooks/useLiftInspections';
import { Wrench, CheckCircle2, XCircle, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import type { LiftInspectionType, LiftEquipmentType } from '@/types/safety';

const EQUIPMENT_TYPES: { value: LiftEquipmentType; label: string }[] = [
  { value: 'two_post_lift', label: '2-Post Lift' },
  { value: 'four_post_lift', label: '4-Post Lift' },
  { value: 'scissor_lift', label: 'Scissor Lift' },
  { value: 'in_ground_lift', label: 'In-Ground Lift' },
  { value: 'mobile_column', label: 'Mobile Column Lift' },
  { value: 'engine_hoist', label: 'Engine Hoist' },
  { value: 'transmission_jack', label: 'Transmission Jack' },
  { value: 'other', label: 'Other' },
];

const INSPECTION_ITEMS = [
  { key: 'structural_integrity', label: 'Structural Integrity', description: 'No cracks, bends, or damage' },
  { key: 'hydraulic_system', label: 'Hydraulic System', description: 'No leaks, proper operation' },
  { key: 'safety_locks', label: 'Safety Locks', description: 'Engaging properly' },
  { key: 'controls', label: 'Controls', description: 'Buttons, switches working' },
  { key: 'cables_chains', label: 'Cables/Chains', description: 'No fraying, proper tension' },
  { key: 'capacity_label', label: 'Capacity Label', description: 'Visible and legible' },
  { key: 'floor_anchors', label: 'Floor Anchors', description: 'Secure, no movement' },
  { key: 'lubrication', label: 'Lubrication', description: 'Properly lubricated' },
];

export function LiftInspectionForm() {
  const navigate = useNavigate();
  const { createInspection } = useLiftInspections();
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    equipment_name: '',
    equipment_type: '' as LiftEquipmentType | '',
    serial_number: '',
    location: '',
    inspection_type: 'daily' as LiftInspectionType,
    inspector_name: '',
    structural_integrity_ok: true,
    hydraulic_system_ok: true,
    safety_locks_ok: true,
    controls_ok: true,
    cables_chains_ok: true,
    capacity_label_visible: true,
    floor_anchors_ok: true,
    lubrication_ok: true,
    safe_for_use: true,
    corrective_actions: '',
    notes: ''
  });
  
  const [deficiencies, setDeficiencies] = useState<string[]>([]);
  const [newDeficiency, setNewDeficiency] = useState('');

  const handleCheckboxChange = (key: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [key]: checked }));
  };

  const addDeficiency = () => {
    if (newDeficiency.trim()) {
      setDeficiencies(prev => [...prev, newDeficiency.trim()]);
      setNewDeficiency('');
    }
  };

  const removeDeficiency = (index: number) => {
    setDeficiencies(prev => prev.filter((_, i) => i !== index));
  };

  const hasFailures = () => {
    return !formData.structural_integrity_ok || !formData.hydraulic_system_ok || 
           !formData.safety_locks_ok || !formData.controls_ok || 
           !formData.cables_chains_ok || !formData.floor_anchors_ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const inspectionData: CreateLiftInspectionData = {
      equipment_name: formData.equipment_name,
      equipment_type: formData.equipment_type as LiftEquipmentType,
      serial_number: formData.serial_number || undefined,
      location: formData.location || undefined,
      inspection_type: formData.inspection_type,
      inspection_date: new Date().toISOString().split('T')[0],
      inspector_name: formData.inspector_name,
      structural_integrity_ok: formData.structural_integrity_ok,
      hydraulic_system_ok: formData.hydraulic_system_ok,
      safety_locks_ok: formData.safety_locks_ok,
      controls_ok: formData.controls_ok,
      cables_chains_ok: formData.cables_chains_ok,
      capacity_label_visible: formData.capacity_label_visible,
      floor_anchors_ok: formData.floor_anchors_ok,
      lubrication_ok: formData.lubrication_ok,
      safe_for_use: formData.safe_for_use,
      deficiencies_found: deficiencies,
      corrective_actions: formData.corrective_actions || undefined,
      notes: formData.notes || undefined
    };
    
    const result = await createInspection(inspectionData);
    setSubmitting(false);
    
    if (result) {
      navigate('/safety/equipment');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Equipment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Equipment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="equipment_name">Equipment Name *</Label>
              <Input
                id="equipment_name"
                value={formData.equipment_name}
                onChange={(e) => setFormData(prev => ({ ...prev, equipment_name: e.target.value }))}
                placeholder="e.g., Bay 1 Lift"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Equipment Type *</Label>
              <Select
                value={formData.equipment_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, equipment_type: value as LiftEquipmentType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Bay 1"
              />
            </div>
            <div className="space-y-2">
              <Label>Inspection Type *</Label>
              <Select
                value={formData.inspection_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, inspection_type: value as LiftInspectionType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inspector_name">Inspector Name *</Label>
            <Input
              id="inspector_name"
              value={formData.inspector_name}
              onChange={(e) => setFormData(prev => ({ ...prev, inspector_name: e.target.value }))}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Inspection Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Checklist</CardTitle>
          <CardDescription>Check all items that pass inspection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {INSPECTION_ITEMS.map((item) => {
              const key = `${item.key}_ok` as keyof typeof formData;
              const isOk = formData[key] as boolean;
              
              return (
                <div 
                  key={item.key} 
                  className={`flex items-start space-x-3 p-3 rounded-lg border ${!isOk ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : ''}`}
                >
                  <Checkbox
                    id={item.key}
                    checked={isOk}
                    onCheckedChange={(checked) => handleCheckboxChange(`${item.key}_ok`, checked === true)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={item.key} className="font-medium cursor-pointer">
                      {item.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  {isOk ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Deficiencies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Deficiencies Found
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Describe deficiency..."
              value={newDeficiency}
              onChange={(e) => setNewDeficiency(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDeficiency())}
            />
            <Button type="button" onClick={addDeficiency} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {deficiencies.length > 0 && (
            <div className="space-y-2">
              {deficiencies.map((deficiency, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                  <span className="flex-1 text-sm">{deficiency}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeDeficiency(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {deficiencies.length > 0 && (
            <div className="space-y-2">
              <Label>Corrective Actions</Label>
              <Textarea
                placeholder="Describe corrective actions..."
                value={formData.corrective_actions}
                onChange={(e) => setFormData(prev => ({ ...prev, corrective_actions: e.target.value }))}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Safety Determination */}
      <Card>
        <CardHeader>
          <CardTitle>Safety Determination</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label className="text-base">Safe for Use</Label>
              <p className="text-sm text-muted-foreground">Can this equipment be safely used?</p>
            </div>
            <Switch
              checked={formData.safe_for_use}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, safe_for_use: checked }))}
            />
          </div>

          {!formData.safe_for_use && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                Equipment will be locked out of service until repairs are completed.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional observations..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="font-medium">Status:</span>
            <Badge variant={formData.safe_for_use ? 'default' : 'destructive'}>
              {formData.safe_for_use ? 'Safe for Use' : 'Locked Out'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => navigate('/safety/equipment')}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={submitting || !formData.equipment_name || !formData.equipment_type || !formData.inspector_name}
        >
          {submitting ? 'Submitting...' : 'Submit Inspection'}
        </Button>
      </div>
    </form>
  );
}
