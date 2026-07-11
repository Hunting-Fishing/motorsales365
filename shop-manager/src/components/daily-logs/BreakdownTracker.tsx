import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Plus, Wrench } from 'lucide-react';
import { BreakdownSummary } from '@/hooks/useMaintenanceTrends';
import { useEquipmentBreakdowns, CreateBreakdownInput } from '@/hooks/useEquipmentBreakdowns';
import { useEquipmentHierarchy } from '@/hooks/useEquipmentHierarchy';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  Cell
} from 'recharts';

interface BreakdownTrackerProps {
  breakdowns: BreakdownSummary | undefined;
  isLoading: boolean;
}

const BREAKDOWN_TYPES = [
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hydraulic', label: 'Hydraulic' },
  { value: 'structural', label: 'Structural' },
  { value: 'other', label: 'Other' }
];

const SEVERITY_LEVELS = [
  { value: 'minor', label: 'Minor', color: '#22c55e' },
  { value: 'moderate', label: 'Moderate', color: '#eab308' },
  { value: 'major', label: 'Major', color: '#f97316' },
  { value: 'critical', label: 'Critical', color: '#ef4444' }
];

const ROOT_CAUSES = [
  { value: 'wear', label: 'Normal Wear' },
  { value: 'operator_error', label: 'Operator Error' },
  { value: 'lack_of_maintenance', label: 'Lack of Maintenance' },
  { value: 'manufacturing_defect', label: 'Manufacturing Defect' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'unknown', label: 'Unknown' }
];

export function BreakdownTracker({ breakdowns, isLoading }: BreakdownTrackerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { createBreakdown } = useEquipmentBreakdowns();
  const { allEquipment } = useEquipmentHierarchy();
  
  const [formData, setFormData] = useState<CreateBreakdownInput>({
    equipment_id: '',
    breakdown_type: '',
    severity: '',
    description: '',
    cause: '',
    preventable: false,
    root_cause_category: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipment_id || !formData.breakdown_type || !formData.severity || !formData.description) {
      return;
    }
    
    await createBreakdown.mutateAsync(formData);
    setIsDialogOpen(false);
    setFormData({
      equipment_id: '',
      breakdown_type: '',
      severity: '',
      description: '',
      cause: '',
      preventable: false,
      root_cause_category: ''
    });
  };

  // Prepare chart data
  const typeData = breakdowns ? Object.entries(breakdowns.byType).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    count: value
  })) : [];

  const severityData = breakdowns ? SEVERITY_LEVELS.map(s => ({
    name: s.label,
    count: breakdowns.bySeverity[s.value] || 0,
    color: s.color
  })) : [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Breakdown Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Breakdown Analysis
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <Plus className="h-4 w-4 mr-2" />
                Report Breakdown
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Report Equipment Breakdown
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Equipment *</Label>
                  <Select 
                    value={formData.equipment_id}
                    onValueChange={(v) => setFormData({ ...formData, equipment_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      {allEquipment.map(eq => (
                        <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select 
                      value={formData.breakdown_type}
                      onValueChange={(v) => setFormData({ ...formData, breakdown_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {BREAKDOWN_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Severity *</Label>
                    <Select 
                      value={formData.severity}
                      onValueChange={(v) => setFormData({ ...formData, severity: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Severity" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITY_LEVELS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what happened..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cause (if known)</Label>
                  <Input
                    value={formData.cause || ''}
                    onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
                    placeholder="What caused this breakdown?"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Root Cause Category</Label>
                  <Select 
                    value={formData.root_cause_category || ''}
                    onValueChange={(v) => setFormData({ ...formData, root_cause_category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOT_CAUSES.map(rc => (
                        <SelectItem key={rc.value} value={rc.value}>{rc.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="preventable">Was this preventable?</Label>
                  <Switch
                    id="preventable"
                    checked={formData.preventable}
                    onCheckedChange={(checked) => setFormData({ ...formData, preventable: checked })}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createBreakdown.isPending}
                >
                  {createBreakdown.isPending ? 'Reporting...' : 'Report Breakdown'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!breakdowns || breakdowns.totalBreakdowns === 0 ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
            <p>No breakdowns reported in this period</p>
            <p className="text-xs">That's good news!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* By Type Chart */}
            <div>
              <h4 className="text-sm font-medium mb-2">By Type</h4>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeData} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* By Severity */}
            <div>
              <h4 className="text-sm font-medium mb-2">By Severity</h4>
              <div className="h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={severityData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={4}>
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
