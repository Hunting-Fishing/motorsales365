import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJobSafetyAnalyses, useJSATemplates } from '@/hooks/useJobSafetyAnalysis';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface CreateJSADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId?: string;
}

const PPE_OPTIONS = [
  'Safety Glasses', 'Hard Hat', 'Steel-Toe Boots', 'Gloves', 
  'High-Vis Vest', 'Hearing Protection', 'Respirator', 'Face Shield',
  'Fall Protection', 'Fire Resistant Clothing'
];

export function CreateJSADialog({ open, onOpenChange, workOrderId }: CreateJSADialogProps) {
  const { createJSA } = useJobSafetyAnalyses();
  const { templates } = useJSATemplates();
  const { teamMembers } = useTeamMembers();
  
  const [formData, setFormData] = useState({
    template_id: '',
    job_title: '',
    job_description: '',
    location: '',
    date_performed: new Date().toISOString().split('T')[0],
    supervisor_id: '',
    supervisor_name: '',
    required_ppe: [] as string[],
    special_precautions: '',
    emergency_procedures: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createJSA.mutateAsync({
      ...formData,
      work_order_id: workOrderId,
      template_id: formData.template_id || undefined,
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      template_id: '',
      job_title: '',
      job_description: '',
      location: '',
      date_performed: new Date().toISOString().split('T')[0],
      supervisor_id: '',
      supervisor_name: '',
      required_ppe: [],
      special_precautions: '',
      emergency_procedures: '',
    });
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        template_id: templateId,
        job_title: template.name,
        job_description: template.description || '',
        required_ppe: template.required_ppe || [],
      }));
    }
  };

  const handleSupervisorChange = (value: string) => {
    const member = teamMembers.find(m => m.id === value);
    setFormData(prev => ({
      ...prev,
      supervisor_id: value,
      supervisor_name: member?.name || '',
    }));
  };

  const togglePPE = (ppe: string) => {
    setFormData(prev => ({
      ...prev,
      required_ppe: prev.required_ppe.includes(ppe)
        ? prev.required_ppe.filter(p => p !== ppe)
        : [...prev.required_ppe, ppe],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Job Safety Analysis</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label>Use Template (Optional)</Label>
              <Select value={formData.template_id} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Job Title *</Label>
            <Input
              value={formData.job_title}
              onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
              placeholder="e.g., Forklift Battery Replacement"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Job Description</Label>
            <Textarea
              value={formData.job_description}
              onChange={(e) => setFormData(prev => ({ ...prev, job_description: e.target.value }))}
              placeholder="Describe the job/task..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date_performed}
                onChange={(e) => setFormData(prev => ({ ...prev, date_performed: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Bay 3"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Supervisor</Label>
            <Select value={formData.supervisor_id} onValueChange={handleSupervisorChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select supervisor" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Required PPE</Label>
            <div className="flex flex-wrap gap-2">
              {PPE_OPTIONS.map(ppe => (
                <Badge
                  key={ppe}
                  variant={formData.required_ppe.includes(ppe) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => togglePPE(ppe)}
                >
                  {ppe}
                  {formData.required_ppe.includes(ppe) && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Special Precautions</Label>
            <Textarea
              value={formData.special_precautions}
              onChange={(e) => setFormData(prev => ({ ...prev, special_precautions: e.target.value }))}
              placeholder="Any special safety precautions..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Emergency Procedures</Label>
            <Textarea
              value={formData.emergency_procedures}
              onChange={(e) => setFormData(prev => ({ ...prev, emergency_procedures: e.target.value }))}
              placeholder="Emergency response procedures..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createJSA.isPending}>
              {createJSA.isPending ? 'Creating...' : 'Create JSA'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
