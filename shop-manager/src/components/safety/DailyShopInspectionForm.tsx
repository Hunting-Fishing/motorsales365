import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useDailyInspections, CreateInspectionData } from '@/hooks/useDailyInspections';
import { ClipboardCheck, AlertTriangle, CheckCircle2, XCircle, Plus, Trash2 } from 'lucide-react';
import type { InspectionShift, FloorCondition, ToolsCondition, InspectionOverallStatus } from '@/types/safety';

const INSPECTION_ITEMS = [
  { key: 'fire_extinguishers', label: 'Fire Extinguishers', description: 'Check expiry dates and accessibility' },
  { key: 'emergency_exits', label: 'Emergency Exits', description: 'Clear and properly marked' },
  { key: 'first_aid_kit', label: 'First Aid Kit', description: 'Stocked and accessible' },
  { key: 'spill_kit', label: 'Spill Kit', description: 'Available and stocked' },
  { key: 'ventilation', label: 'Ventilation System', description: 'Working properly' },
  { key: 'lighting', label: 'Lighting', description: 'Adequate for all work areas' },
  { key: 'ppe', label: 'PPE Availability', description: 'Sufficient PPE available' },
];

export function DailyShopInspectionForm() {
  const navigate = useNavigate();
  const { createInspection } = useDailyInspections();
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    inspector_name: '',
    shift: '' as InspectionShift | '',
    fire_extinguishers_ok: false,
    emergency_exits_clear: false,
    first_aid_kit_stocked: false,
    spill_kit_available: false,
    ventilation_working: false,
    floor_condition: '' as FloorCondition | '',
    lighting_adequate: false,
    ppe_available: false,
    tools_condition: '' as ToolsCondition | '',
    notes: ''
  });
  
  const [hazards, setHazards] = useState<string[]>([]);
  const [newHazard, setNewHazard] = useState('');
  const [correctiveActions, setCorrectiveActions] = useState('');

  const handleCheckboxChange = (key: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [key]: checked }));
  };

  const addHazard = () => {
    if (newHazard.trim()) {
      setHazards(prev => [...prev, newHazard.trim()]);
      setNewHazard('');
    }
  };

  const removeHazard = (index: number) => {
    setHazards(prev => prev.filter((_, i) => i !== index));
  };

  const calculateOverallStatus = (): InspectionOverallStatus => {
    const criticalChecks = [
      formData.fire_extinguishers_ok,
      formData.emergency_exits_clear,
      formData.first_aid_kit_stocked
    ];
    
    const allCriticalPassed = criticalChecks.every(Boolean);
    const hasHazards = hazards.length > 0;
    const floorBad = formData.floor_condition === 'hazardous' || formData.floor_condition === 'poor';
    
    if (!allCriticalPassed || floorBad) return 'fail';
    if (hasHazards) return 'pass_with_issues';
    return 'pass';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const inspectionData: CreateInspectionData = {
      inspection_date: new Date().toISOString().split('T')[0],
      inspector_name: formData.inspector_name,
      shift: formData.shift || undefined,
      fire_extinguishers_ok: formData.fire_extinguishers_ok,
      emergency_exits_clear: formData.emergency_exits_clear,
      first_aid_kit_stocked: formData.first_aid_kit_stocked,
      spill_kit_available: formData.spill_kit_available,
      ventilation_working: formData.ventilation_working,
      floor_condition: formData.floor_condition || undefined,
      lighting_adequate: formData.lighting_adequate,
      ppe_available: formData.ppe_available,
      tools_condition: formData.tools_condition || undefined,
      hazards_identified: hazards,
      corrective_actions_needed: correctiveActions || undefined,
      overall_status: calculateOverallStatus(),
      notes: formData.notes || undefined
    };
    
    const result = await createInspection(inspectionData);
    setSubmitting(false);
    
    if (result) {
      navigate('/safety/inspections');
    }
  };

  const overallStatus = calculateOverallStatus();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Inspector Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Inspector Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inspector_name">Inspector Name *</Label>
              <Input
                id="inspector_name"
                value={formData.inspector_name}
                onChange={(e) => setFormData(prev => ({ ...prev, inspector_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift">Shift</Label>
              <Select
                value={formData.shift}
                onValueChange={(value) => setFormData(prev => ({ ...prev, shift: value as InspectionShift }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safety Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Safety Checklist</CardTitle>
          <CardDescription>Check all items that pass inspection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {INSPECTION_ITEMS.map((item) => {
            const key = item.key as keyof typeof formData;
            const isChecked = formData[key] as boolean;
            
            return (
              <div key={item.key} className="flex items-start space-x-3 p-3 rounded-lg border">
                <Checkbox
                  id={item.key}
                  checked={isChecked}
                  onCheckedChange={(checked) => handleCheckboxChange(`${item.key}_ok`, checked === true)}
                />
                <div className="flex-1">
                  <Label htmlFor={item.key} className="font-medium cursor-pointer">
                    {item.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                {isChecked ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>Conditions Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Floor Condition</Label>
              <Select
                value={formData.floor_condition}
                onValueChange={(value) => setFormData(prev => ({ ...prev, floor_condition: value as FloorCondition }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="hazardous">Hazardous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tools Condition</Label>
              <Select
                value={formData.tools_condition}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tools_condition: value as ToolsCondition }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hazards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Hazards Identified
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Describe hazard..."
              value={newHazard}
              onChange={(e) => setNewHazard(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHazard())}
            />
            <Button type="button" onClick={addHazard} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {hazards.length > 0 && (
            <div className="space-y-2">
              {hazards.map((hazard, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                  <span className="flex-1 text-sm">{hazard}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeHazard(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {hazards.length > 0 && (
            <div className="space-y-2">
              <Label>Corrective Actions Needed</Label>
              <Textarea
                placeholder="Describe corrective actions..."
                value={correctiveActions}
                onChange={(e) => setCorrectiveActions(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes & Status */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Any additional observations..."
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          />
          
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="font-medium">Overall Status:</span>
            <Badge
              variant={overallStatus === 'pass' ? 'default' : overallStatus === 'pass_with_issues' ? 'secondary' : 'destructive'}
              className="text-sm"
            >
              {overallStatus === 'pass' && 'Pass'}
              {overallStatus === 'pass_with_issues' && 'Pass with Issues'}
              {overallStatus === 'fail' && 'Fail'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => navigate('/safety/inspections')}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !formData.inspector_name}>
          {submitting ? 'Submitting...' : 'Submit Inspection'}
        </Button>
      </div>
    </form>
  );
}
