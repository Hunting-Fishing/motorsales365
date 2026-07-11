import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { successStoriesApi } from '@/lib/services/successStoriesApi';

interface AddSuccessStoryDialogProps {
  onStoryAdded: () => void;
}

export function AddSuccessStoryDialog({ onStoryAdded }: AddSuccessStoryDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    story_title: '',
    story_content: '',
    participant_name: '',
    outcome_description: '',
    program_type: 'general',
    featured: false,
    date_occurred: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await successStoriesApi.create({
        ...formData,
        created_by: 'current-user', // This should be the actual user ID
        shop_id: 'current-shop', // This should be the actual shop ID
        consent_obtained: true
      });
      toast({
        title: "Success Story Added",
        description: "The success story has been created successfully.",
      });
      setOpen(false);
      setFormData({
        story_title: '',
        story_content: '',
        participant_name: '',
        outcome_description: '',
        program_type: 'general',
        featured: false,
        date_occurred: new Date().toISOString().split('T')[0]
      });
      onStoryAdded();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create success story. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Success Story
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Success Story</DialogTitle>
          <DialogDescription>
            Document a new success story to showcase your impact.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="story_title">Title</Label>
            <Input
              id="story_title"
              value={formData.story_title}
              onChange={(e) => setFormData(prev => ({ ...prev, story_title: e.target.value }))}
              placeholder="Enter story title"
              required
            />
          </div>
          <div>
            <Label htmlFor="participant_name">Participant Name</Label>
            <Input
              id="participant_name"
              value={formData.participant_name}
              onChange={(e) => setFormData(prev => ({ ...prev, participant_name: e.target.value }))}
              placeholder="Enter participant name"
            />
          </div>
          <div>
            <Label htmlFor="story_content">Story Content</Label>
            <Textarea
              id="story_content"
              value={formData.story_content}
              onChange={(e) => setFormData(prev => ({ ...prev, story_content: e.target.value }))}
              placeholder="Tell the story of impact..."
              rows={4}
              required
            />
          </div>
          <div>
            <Label htmlFor="outcome_description">Outcome Description</Label>
            <Textarea
              id="outcome_description"
              value={formData.outcome_description}
              onChange={(e) => setFormData(prev => ({ ...prev, outcome_description: e.target.value }))}
              placeholder="Describe the specific outcome achieved..."
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="date_occurred">Date Occurred</Label>
            <Input
              id="date_occurred"
              type="date"
              value={formData.date_occurred}
              onChange={(e) => setFormData(prev => ({ ...prev, date_occurred: e.target.value }))}
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="featured"
              checked={formData.featured}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: !!checked }))}
            />
            <Label htmlFor="featured">Feature this story</Label>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Story'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}