import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSafetyMeetings, CreateMeetingInput } from '@/hooks/useSafetyMeetings';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateMeetingDialog({ open, onOpenChange }: CreateMeetingDialogProps) {
  const { createMeeting } = useSafetyMeetings();
  const { teamMembers } = useTeamMembers();
  const [formData, setFormData] = useState<CreateMeetingInput>({
    meeting_type: 'toolbox_talk',
    title: '',
    description: '',
    meeting_date: new Date().toISOString().slice(0, 16),
    duration_minutes: 30,
    location: '',
    facilitator_id: '',
    facilitator_name: '',
    topics: [],
  });
  const [topicInput, setTopicInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMeeting.mutateAsync(formData);
    onOpenChange(false);
    setFormData({
      meeting_type: 'toolbox_talk',
      title: '',
      description: '',
      meeting_date: new Date().toISOString().slice(0, 16),
      duration_minutes: 30,
      location: '',
      facilitator_id: '',
      facilitator_name: '',
      topics: [],
    });
  };

  const addTopic = () => {
    if (topicInput.trim()) {
      setFormData(prev => ({
        ...prev,
        topics: [...(prev.topics || []), topicInput.trim()],
      }));
      setTopicInput('');
    }
  };

  const removeTopic = (index: number) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleFacilitatorChange = (value: string) => {
    const member = teamMembers.find(m => m.id === value);
    setFormData(prev => ({
      ...prev,
      facilitator_id: value,
      facilitator_name: member?.name || '',
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Safety Meeting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Meeting Type</Label>
              <Select
                value={formData.meeting_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, meeting_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toolbox_talk">Toolbox Talk</SelectItem>
                  <SelectItem value="safety_committee">Safety Committee</SelectItem>
                  <SelectItem value="all_hands">All Hands</SelectItem>
                  <SelectItem value="training">Training Session</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 30 }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Weekly Safety Briefing"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Date & Time *</Label>
            <Input
              type="datetime-local"
              value={formData.meeting_date}
              onChange={(e) => setFormData(prev => ({ ...prev, meeting_date: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Facilitator</Label>
              <Select value={formData.facilitator_id} onValueChange={handleFacilitatorChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select facilitator" />
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
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Break Room"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Meeting agenda and objectives..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Topics</Label>
            <div className="flex gap-2">
              <Input
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="Add a topic"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
              />
              <Button type="button" variant="outline" onClick={addTopic}>Add</Button>
            </div>
            {formData.topics && formData.topics.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.topics.map((topic, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {topic}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeTopic(index)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMeeting.isPending}>
              {createMeeting.isPending ? 'Scheduling...' : 'Schedule Meeting'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
