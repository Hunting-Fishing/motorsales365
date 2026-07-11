import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Package, Trash2, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface TaskPartsTabProps {
  taskData: ReturnType<typeof import('@/hooks/useTaskData').useTaskData>;
}

export function TaskPartsTab({ taskData }: TaskPartsTabProps) {
  const { parts, totalPartsCost, addPart, deletePart } = taskData;

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');

  const handleAddPart = () => {
    if (!partName.trim()) return;
    addPart({
      partName: partName.trim(),
      quantity: parseInt(quantity) || 1,
      unitCost: unitCost ? parseFloat(unitCost) : null,
      partNumber: partNumber || undefined,
      notes: notes || undefined,
    });
    setShowAddDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setPartName('');
    setPartNumber('');
    setQuantity('1');
    setUnitCost('');
    setNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Add Part Button */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Part
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Part</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Part Name *</Label>
              <Input
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="e.g., Oil Filter"
              />
            </div>
            <div className="space-y-2">
              <Label>Part Number</Label>
              <Input
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="e.g., ABC-12345"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
              />
            </div>
            <Button onClick={handleAddPart} className="w-full" disabled={!partName.trim()}>
              Add Part
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Total Cost */}
      {parts.length > 0 && (
        <Card className="bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Parts Cost</span>
              </div>
              <span className="text-xl font-bold">${totalPartsCost.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parts List */}
      <div className="space-y-2">
        {parts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No parts added yet</p>
              <p className="text-sm">Add parts used for this task</p>
            </CardContent>
          </Card>
        ) : (
          parts.map((part) => (
            <Card key={part.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{part.part_name}</p>
                      {part.part_number && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {part.part_number}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>Qty: {part.quantity}</span>
                      {part.unit_cost && <span>@ ${part.unit_cost.toFixed(2)} each</span>}
                      {part.total_cost && (
                        <span className="font-medium text-foreground">
                          = ${part.total_cost.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {part.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{part.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Added by {part.added_by_name || 'Unknown'} on{' '}
                      {format(new Date(part.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deletePart(part.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
