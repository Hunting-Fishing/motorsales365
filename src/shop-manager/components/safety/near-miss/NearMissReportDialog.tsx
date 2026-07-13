import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { NearMissReport } from '@/hooks/useNearMissReports';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: NearMissReport | null;
  onSave: (data: Partial<NearMissReport>) => void;
}

export function NearMissReportDialog({ open, onOpenChange, report, onSave }: Props) {
  const [formData, setFormData] = React.useState<{
    description: string;
    location: string;
    potential_severity: 'minor' | 'moderate' | 'serious' | 'catastrophic';
    category: string;
    immediate_actions_taken: string;
    is_anonymous: boolean;
  }>({
    description: '',
    location: '',
    potential_severity: 'minor',
    category: '',
    immediate_actions_taken: '',
    is_anonymous: false
  });

  React.useEffect(() => {
    if (report) {
      setFormData({
        description: report.description || '',
        location: report.location || '',
        potential_severity: report.potential_severity || 'minor',
        category: report.category || '',
        immediate_actions_taken: report.immediate_actions_taken || '',
        is_anonymous: report.is_anonymous || false
      });
    } else {
      setFormData({ description: '', location: '', potential_severity: 'minor' as const, category: '', immediate_actions_taken: '', is_anonymous: false });
    }
  }, [report]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{report ? 'Edit Near Miss Report' : 'Report Near Miss'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>What happened?</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required placeholder="Describe the near miss incident..." /></div>
          <div><Label>Location</Label><Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Where did this occur?" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Potential Severity</Label>
              <Select value={formData.potential_severity} onValueChange={v => setFormData({...formData, potential_severity: v as 'minor' | 'moderate' | 'serious' | 'catastrophic'})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="minor">Minor</SelectItem><SelectItem value="moderate">Moderate</SelectItem><SelectItem value="serious">Serious</SelectItem><SelectItem value="catastrophic">Catastrophic</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Category</Label>
              <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="slip_trip_fall">Slip/Trip/Fall</SelectItem><SelectItem value="equipment">Equipment</SelectItem><SelectItem value="chemical">Chemical</SelectItem><SelectItem value="ergonomic">Ergonomic</SelectItem><SelectItem value="vehicle">Vehicle</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Immediate Actions Taken</Label><Textarea value={formData.immediate_actions_taken} onChange={e => setFormData({...formData, immediate_actions_taken: e.target.value})} placeholder="What actions were taken to prevent harm?" /></div>
          <div className="flex items-center space-x-2">
            <Checkbox checked={formData.is_anonymous} onCheckedChange={c => setFormData({...formData, is_anonymous: !!c})} />
            <Label>Submit anonymously</Label>
          </div>
          <Button type="submit" className="w-full">Submit Report</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
