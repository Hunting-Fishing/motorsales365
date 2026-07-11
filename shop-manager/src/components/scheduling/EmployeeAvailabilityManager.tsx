import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, Clock, Calendar } from 'lucide-react';
import { useEmployeeAvailability } from '@/hooks/useEmployeeAvailability';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import type { EmployeeAvailability } from '@/types/employee-availability';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Props {
  employeeId?: string;
}

export function EmployeeAvailabilityManager({ employeeId }: Props) {
  const { availability, createAvailability, updateAvailability, deleteAvailability, loading } = 
    useEmployeeAvailability(employeeId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EmployeeAvailability | null>(null);
  const [formData, setFormData] = useState({
    day_of_week: 1,
    available_start: '09:00',
    available_end: '17:00',
    is_available: true,
    recurring: true,
    effective_from: new Date().toISOString().split('T')[0],
    effective_until: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let currentEmployeeId = employeeId;
      if (!currentEmployeeId) {
        const { data: { user } } = await supabase.auth.getUser();
        currentEmployeeId = user?.id;
      }
      const data = {
        ...formData,
        employee_id: currentEmployeeId,
        effective_until: formData.effective_until || null
      };

      if (editingItem) {
        await updateAvailability(editingItem.id, data);
      } else {
        await createAvailability(data);
      }
      handleClose();
    } catch (error) {
      console.error('Error saving availability:', error);
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({
      day_of_week: 1,
      available_start: '09:00',
      available_end: '17:00',
      is_available: true,
      recurring: true,
      effective_from: new Date().toISOString().split('T')[0],
      effective_until: '',
      notes: ''
    });
  };

  const handleEdit = (item: EmployeeAvailability) => {
    setEditingItem(item);
    setFormData({
      day_of_week: item.day_of_week,
      available_start: item.available_start,
      available_end: item.available_end,
      is_available: item.is_available,
      recurring: item.recurring,
      effective_from: item.effective_from,
      effective_until: item.effective_until || '',
      notes: item.notes || ''
    });
    setDialogOpen(true);
  };

  const groupedByDay = DAYS.map((day, index) => ({
    day,
    items: availability.filter(a => a.day_of_week === index)
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Employee Availability
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Availability
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Edit Availability' : 'Add Availability'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="day">Day of Week *</Label>
                  <select
                    id="day"
                    className="w-full p-2 border rounded-md"
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                    required
                  >
                    {DAYS.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start">Available From *</Label>
                    <Input
                      id="start"
                      type="time"
                      value={formData.available_start}
                      onChange={(e) => setFormData({ ...formData, available_start: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end">Available Until *</Label>
                    <Input
                      id="end"
                      type="time"
                      value={formData.available_end}
                      onChange={(e) => setFormData({ ...formData, available_end: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="effective_from">Effective From *</Label>
                    <Input
                      id="effective_from"
                      type="date"
                      value={formData.effective_from}
                      onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="effective_until">Effective Until</Label>
                    <Input
                      id="effective_until"
                      type="date"
                      value={formData.effective_until}
                      onChange={(e) => setFormData({ ...formData, effective_until: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recurring"
                    checked={formData.recurring}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, recurring: checked as boolean })
                    }
                  />
                  <Label htmlFor="recurring">Recurring weekly</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="available"
                    checked={formData.is_available}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, is_available: checked as boolean })
                    }
                  />
                  <Label htmlFor="available">Available</Label>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingItem ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-4">
            {groupedByDay.map(({ day, items }) => (
              <div key={day} className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">{day}</h3>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No availability set</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {item.available_start} - {item.available_end}
                            </div>
                            {item.notes && (
                              <div className="text-sm text-muted-foreground">{item.notes}</div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {item.recurring && (
                              <Badge variant="secondary">Recurring</Badge>
                            )}
                            <Badge variant={item.is_available ? 'default' : 'destructive'}>
                              {item.is_available ? 'Available' : 'Unavailable'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAvailability(item.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
