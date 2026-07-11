
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Lightbulb, Plus } from 'lucide-react';
import { useFeatureRequests } from '@/hooks/useFeatureRequests';
import { CreateFeatureRequestPayload } from '@/types/feature-requests';

interface FeatureRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeatureRequestModal({ isOpen, onClose }: FeatureRequestModalProps) {
  const [formData, setFormData] = useState<CreateFeatureRequestPayload & { 
    submitter_email: string;
    acceptance_criteria: string;
  }>({
    title: '',
    category: 'other',
    priority: 'medium',
    module: 'general',
    description: '',
    technical_requirements: '',
    implementation_notes: '',
    acceptance_criteria: '',
    submitter_name: '',
    submitter_email: '',
    tags: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createFeatureRequest } = useFeatureRequests();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await createFeatureRequest({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        module: 'general',
        submitter_name: formData.submitter_name,
        submitter_email: formData.submitter_email,
        technical_requirements: formData.technical_requirements,
        implementation_notes: formData.implementation_notes,
        acceptance_criteria: formData.acceptance_criteria,
        tags: formData.tags
      });
      
      if (result) {
        onClose();
        setFormData({
          title: '',
          category: 'other',
          priority: 'medium',
          module: 'general',
          description: '',
          technical_requirements: '',
          implementation_notes: '',
          acceptance_criteria: '',
          submitter_name: '',
          submitter_email: '',
          tags: []
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Feature Request
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Feature Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief title for your feature request"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ui_ux">User Interface & UX</SelectItem>
                  <SelectItem value="functionality">Functionality</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the feature you'd like to see..."
              required
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="technical_requirements">Technical Requirements (optional)</Label>
            <Textarea
              id="technical_requirements"
              value={formData.technical_requirements}
              onChange={(e) => setFormData({ ...formData, technical_requirements: e.target.value })}
              placeholder="Any specific technical requirements or constraints..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="implementation_notes">Implementation Notes (optional)</Label>
            <Textarea
              id="implementation_notes"
              value={formData.implementation_notes}
              onChange={(e) => setFormData({ ...formData, implementation_notes: e.target.value })}
              placeholder="Suggestions for how this could be implemented..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="acceptance_criteria">Acceptance Criteria (optional)</Label>
            <Textarea
              id="acceptance_criteria"
              value={formData.acceptance_criteria}
              onChange={(e) => setFormData({ ...formData, acceptance_criteria: e.target.value })}
              placeholder="What would make this feature complete and successful?"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="submitter_name">Name (optional)</Label>
              <Input
                id="submitter_name"
                value={formData.submitter_name}
                onChange={(e) => setFormData({ ...formData, submitter_name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="submitter_email">Email (optional)</Label>
              <Input
                id="submitter_email"
                type="email"
                value={formData.submitter_email}
                onChange={(e) => setFormData({ ...formData, submitter_email: e.target.value })}
                placeholder="For follow-up questions"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
