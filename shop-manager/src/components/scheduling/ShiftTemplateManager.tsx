import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit2, Clock } from 'lucide-react';
import { useShiftTemplates } from '@/hooks/useShiftTemplates';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { ShiftTemplate } from '@/types/shift-template';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ShiftTemplateManager() {
  const { templates, createTemplate, updateTemplate, deleteTemplate, loading } = useShiftTemplates();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [formData, setFormData] = useState({
    template_name: '',
    description: '',
    shift_start: '09:00',
    shift_end: '17:00',
    days_of_week: [] as number[],
    break_duration_minutes: 30,
    color: '#3b82f6'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, formData);
      } else {
        await createTemplate(formData);
      }
      handleClose();
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setFormData({
      template_name: '',
      description: '',
      shift_start: '09:00',
      shift_end: '17:00',
      days_of_week: [],
      break_duration_minutes: 30,
      color: '#3b82f6'
    });
  };

  const handleEdit = (template: ShiftTemplate) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      description: template.description || '',
      shift_start: template.shift_start,
      shift_end: template.shift_end,
      days_of_week: template.days_of_week,
      break_duration_minutes: template.break_duration_minutes,
      color: template.color
    });
    setDialogOpen(true);
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort()
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Shift Templates</h3>
          <p className="text-sm text-muted-foreground">
            Create reusable shift templates for quick scheduling
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Create Shift Template'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="template_name">Template Name *</Label>
                  <Input
                    id="template_name"
                    value={formData.template_name}
                    onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                    placeholder="e.g., Morning Shift"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="shift_start">Start Time *</Label>
                  <Input
                    id="shift_start"
                    type="time"
                    value={formData.shift_start}
                    onChange={(e) => setFormData({ ...formData, shift_start: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="shift_end">End Time *</Label>
                  <Input
                    id="shift_end"
                    type="time"
                    value={formData.shift_end}
                    onChange={(e) => setFormData({ ...formData, shift_end: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="break_duration">Break Duration (minutes)</Label>
                  <Input
                    id="break_duration"
                    type="number"
                    value={formData.break_duration_minutes}
                    onChange={(e) => setFormData({ ...formData, break_duration_minutes: parseInt(e.target.value) })}
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Days of Week *</Label>
                  <div className="flex gap-2 mt-2">
                    {DAYS.map((day, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${index}`}
                          checked={formData.days_of_week.includes(index)}
                          onCheckedChange={() => toggleDay(index)}
                        />
                        <Label
                          htmlFor={`day-${index}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {day}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTemplate ? 'Update' : 'Create'} Template
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: template.color }}
                    />
                    {template.template_name}
                  </h4>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    {template.shift_start} - {template.shift_end}
                  </span>
                  {template.break_duration_minutes > 0 && (
                    <span className="text-xs">
                      ({template.break_duration_minutes}min break)
                    </span>
                  )}
                </div>

                <div className="flex gap-1 flex-wrap">
                  {template.days_of_week.map((day) => (
                    <Badge key={day} variant="secondary" className="text-xs">
                      {DAYS[day]}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && !loading && (
          <div className="col-span-2 text-center py-8 text-muted-foreground">
            No shift templates yet. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
