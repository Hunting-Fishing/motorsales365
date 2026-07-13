
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  editingTraining?: any;
  onSave: (data: any) => Promise<any>;
}

export function TrainingDialog({ open, onOpenChange, memberId, memberName, editingTraining, onSave }: TrainingDialogProps) {
  const [formData, setFormData] = useState({
    training_name: '',
    training_type: 'Online',
    provider: '',
    start_date: '',
    completion_date: '',
    duration_hours: '',
    status: 'scheduled',
    score: '',
    certificate_url: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingTraining) {
      setFormData({
        training_name: editingTraining.training_name || '',
        training_type: editingTraining.training_type || 'Online',
        provider: editingTraining.provider || '',
        start_date: editingTraining.start_date || '',
        completion_date: editingTraining.completion_date || '',
        duration_hours: editingTraining.duration_hours?.toString() || '',
        status: editingTraining.status || 'scheduled',
        score: editingTraining.score?.toString() || '',
        certificate_url: editingTraining.certificate_url || '',
        notes: editingTraining.notes || ''
      });
    } else {
      setFormData({
        training_name: '',
        training_type: 'Online',
        provider: '',
        start_date: '',
        completion_date: '',
        duration_hours: '',
        status: 'scheduled',
        score: '',
        certificate_url: '',
        notes: ''
      });
    }
  }, [editingTraining, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const dataToSave = {
      ...formData,
      profile_id: memberId,
      completion_date: formData.completion_date || null,
      duration_hours: formData.duration_hours ? parseFloat(formData.duration_hours) : null,
      score: formData.score ? parseFloat(formData.score) : null,
      certificate_url: formData.certificate_url || null,
      notes: formData.notes || null
    };

    const result = await onSave(editingTraining ? dataToSave : dataToSave);
    
    setIsSubmitting(false);
    
    if (result.success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTraining ? 'Edit Training' : 'Add Training'}</DialogTitle>
          <DialogDescription>
            {editingTraining ? 'Update training record information' : `Add a new training record for ${memberName}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="training_name">Training Name *</Label>
              <Input
                id="training_name"
                value={formData.training_name}
                onChange={(e) => setFormData(prev => ({ ...prev, training_name: e.target.value }))}
                placeholder="e.g., Advanced Diagnostics Course"
                required
              />
            </div>

            <div>
              <Label htmlFor="training_type">Training Type *</Label>
              <Select value={formData.training_type} onValueChange={(value) => setFormData(prev => ({ ...prev, training_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="On-Site">On-Site</SelectItem>
                  <SelectItem value="Workshop">Workshop</SelectItem>
                  <SelectItem value="Seminar">Seminar</SelectItem>
                  <SelectItem value="Webinar">Webinar</SelectItem>
                  <SelectItem value="Certification">Certification Program</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="provider">Training Provider *</Label>
              <Input
                id="provider"
                value={formData.provider}
                onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                placeholder="e.g., ASE Training Institute"
                required
              />
            </div>

            <div>
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="completion_date">Completion Date</Label>
              <Input
                id="completion_date"
                type="date"
                value={formData.completion_date}
                onChange={(e) => setFormData(prev => ({ ...prev, completion_date: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="duration_hours">Duration (hours)</Label>
              <Input
                id="duration_hours"
                type="number"
                step="0.5"
                value={formData.duration_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_hours: e.target.value }))}
                placeholder="e.g., 40"
              />
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="score">Score (%)</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="100"
                value={formData.score}
                onChange={(e) => setFormData(prev => ({ ...prev, score: e.target.value }))}
                placeholder="e.g., 95"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="certificate_url">Certificate URL</Label>
              <Input
                id="certificate_url"
                type="url"
                value={formData.certificate_url}
                onChange={(e) => setFormData(prev => ({ ...prev, certificate_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional information about the training..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingTraining ? 'Update Training' : 'Add Training'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
