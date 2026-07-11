
import React, { useState } from 'react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Save, X, Trash2 } from 'lucide-react';

interface EditableJobLineCardProps {
  jobLine: WorkOrderJobLine;
  onUpdate: (updatedJobLine: WorkOrderJobLine) => void;
  onDelete: (jobLineId: string) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

export function EditableJobLineCard({
  jobLine,
  onUpdate,
  onDelete,
  isEditing,
  onStartEdit,
  onCancelEdit
}: EditableJobLineCardProps) {
  const [editedJobLine, setEditedJobLine] = useState<WorkOrderJobLine>(jobLine);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onUpdate(editedJobLine);
      onCancelEdit();
    } catch (error) {
      console.error('Error updating job line:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedJobLine(jobLine);
    onCancelEdit();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this job line?')) {
      onDelete(jobLine.id);
    }
  };

  if (isEditing) {
    // Calculate total when hours or rate changes
    const calculateTotal = () => {
      const hours = editedJobLine.estimated_hours || 0;
      const rate = editedJobLine.labor_rate || 0;
      const total = hours * rate;
      setEditedJobLine(prev => ({ ...prev, total_amount: total }));
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Editing Job Line</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={editedJobLine.name}
              onChange={(e) => setEditedJobLine(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={editedJobLine.description || ''}
              onChange={(e) => setEditedJobLine(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="hours">Estimated Hours</Label>
              <Input
                id="hours"
                type="number"
                step="0.25"
                value={editedJobLine.estimated_hours || 0}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setEditedJobLine(prev => ({ ...prev, estimated_hours: value }));
                  setTimeout(calculateTotal, 0);
                }}
              />
            </div>
            <div>
              <Label htmlFor="rate">Labor Rate</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                value={editedJobLine.labor_rate || 0}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setEditedJobLine(prev => ({ ...prev, labor_rate: value }));
                  setTimeout(calculateTotal, 0);
                }}
              />
            </div>
            <div>
              <Label htmlFor="total">Total Amount</Label>
              <Input
                id="total"
                type="number"
                step="0.01"
                value={editedJobLine.total_amount || 0}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setEditedJobLine(prev => ({ ...prev, total_amount: value }));
                }}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={editedJobLine.notes || ''}
              onChange={(e) => setEditedJobLine(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-base">{jobLine.name}</CardTitle>
            {jobLine.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {jobLine.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onStartEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Hours: </span>
            {jobLine.estimated_hours || 0}
          </div>
          <div>
            <span className="text-muted-foreground">Rate: </span>
            ${jobLine.total_amount || 0}
          </div>
          <div>
            <span className="text-muted-foreground">Total: </span>
            ${jobLine.labor_rate || 0}
          </div>
        </div>
        
        {jobLine.notes && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-sm text-muted-foreground">{jobLine.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
