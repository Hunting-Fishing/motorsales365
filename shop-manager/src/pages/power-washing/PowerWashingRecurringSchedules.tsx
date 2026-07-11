import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  RefreshCw, 
  MapPin,
  Loader2,
  Pause,
  Play,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface RecurringSchedule {
  id: string;
  shop_id: string;
  schedule_name: string;
  recurrence_type: string;
  day_of_week: number | null;
  day_of_month: number | null;
  preferred_time_start: string | null;
  property_address: string | null;
  property_city: string | null;
  agreed_price: number | null;
  is_active: boolean;
  next_scheduled_date: string | null;
  jobs_completed: number;
}

const RECURRENCE_TYPES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export default function PowerWashingRecurringSchedules() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    schedule_name: '',
    recurrence_type: 'monthly',
    day_of_week: 1,
    day_of_month: 1,
    preferred_time_start: '09:00',
    property_address: '',
    property_city: '',
    property_state: '',
    property_zip: '',
    agreed_price: '',
    special_instructions: '',
  });

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('shop_id').eq('user_id', user.id).single()
        .then(({ data }) => {
          if (data?.shop_id) {
            setShopId(data.shop_id);
            fetchSchedules(data.shop_id);
          }
        });
    }
  }, [user]);

  const fetchSchedules = async (shopId: string) => {
    try {
      const { data, error } = await supabase
        .from('power_washing_recurring_schedules')
        .select('*')
        .eq('shop_id', shopId)
        .order('next_scheduled_date', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateNextDate = (recurrenceType: string, dayOfWeek: number, dayOfMonth: number) => {
    const today = new Date();
    
    switch (recurrenceType) {
      case 'weekly':
      case 'biweekly': {
        const daysUntil = (dayOfWeek - today.getDay() + 7) % 7 || 7;
        return addDays(today, daysUntil);
      }
      case 'monthly':
      case 'quarterly':
      case 'annually': {
        let nextDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
        if (nextDate <= today) {
          nextDate = addMonths(nextDate, 1);
        }
        return nextDate;
      }
      default:
        return today;
    }
  };

  const handleCreate = async () => {
    if (!shopId || !formData.schedule_name) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSaving(true);
    try {
      const nextDate = calculateNextDate(
        formData.recurrence_type,
        formData.day_of_week,
        formData.day_of_month
      );

      const { error } = await supabase
        .from('power_washing_recurring_schedules')
        .insert({
          shop_id: shopId,
          schedule_name: formData.schedule_name,
          recurrence_type: formData.recurrence_type,
          day_of_week: ['weekly', 'biweekly'].includes(formData.recurrence_type) ? formData.day_of_week : null,
          day_of_month: ['monthly', 'quarterly', 'annually'].includes(formData.recurrence_type) ? formData.day_of_month : null,
          preferred_time_start: formData.preferred_time_start || null,
          property_address: formData.property_address || null,
          property_city: formData.property_city || null,
          property_state: formData.property_state || null,
          property_zip: formData.property_zip || null,
          agreed_price: formData.agreed_price ? parseFloat(formData.agreed_price) : null,
          special_instructions: formData.special_instructions || null,
          next_scheduled_date: format(nextDate, 'yyyy-MM-dd'),
          is_active: true,
          created_by: user?.id,
        });

      if (error) throw error;
      
      toast.success('Recurring schedule created');
      setIsDialogOpen(false);
      resetForm();
      fetchSchedules(shopId);
    } catch (error) {
      console.error('Failed to create schedule:', error);
      toast.error('Failed to create schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('power_washing_recurring_schedules')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      if (shopId) fetchSchedules(shopId);
      toast.success(isActive ? 'Schedule paused' : 'Schedule activated');
    } catch (error) {
      toast.error('Failed to update schedule');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this recurring schedule?')) return;
    
    try {
      const { error } = await supabase
        .from('power_washing_recurring_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      if (shopId) fetchSchedules(shopId);
      toast.success('Schedule deleted');
    } catch (error) {
      toast.error('Failed to delete schedule');
    }
  };

  const resetForm = () => {
    setFormData({
      schedule_name: '',
      recurrence_type: 'monthly',
      day_of_week: 1,
      day_of_month: 1,
      preferred_time_start: '09:00',
      property_address: '',
      property_city: '',
      property_state: '',
      property_zip: '',
      agreed_price: '',
      special_instructions: '',
    });
  };

  const getRecurrenceLabel = (type: string) => {
    return RECURRENCE_TYPES.find(t => t.value === type)?.label || type;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/power-washing')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Recurring Schedules</h1>
            <p className="text-muted-foreground">Set up automatic job scheduling</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Recurring Schedule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Schedule Name *</Label>
                  <Input
                    value={formData.schedule_name}
                    onChange={(e) => setFormData(p => ({ ...p, schedule_name: e.target.value }))}
                    placeholder="e.g. Smith Residence Monthly"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Frequency</Label>
                    <Select 
                      value={formData.recurrence_type} 
                      onValueChange={(v) => setFormData(p => ({ ...p, recurrence_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {['weekly', 'biweekly'].includes(formData.recurrence_type) && (
                    <div>
                      <Label>Day of Week</Label>
                      <Select 
                        value={String(formData.day_of_week)} 
                        onValueChange={(v) => setFormData(p => ({ ...p, day_of_week: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map((day, i) => (
                            <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {['monthly', 'quarterly', 'annually'].includes(formData.recurrence_type) && (
                    <div>
                      <Label>Day of Month</Label>
                      <Select 
                        value={String(formData.day_of_month)} 
                        onValueChange={(v) => setFormData(p => ({ ...p, day_of_month: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 28 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Preferred Time</Label>
                  <Input
                    type="time"
                    value={formData.preferred_time_start}
                    onChange={(e) => setFormData(p => ({ ...p, preferred_time_start: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Property Address</Label>
                  <Input
                    value={formData.property_address}
                    onChange={(e) => setFormData(p => ({ ...p, property_address: e.target.value }))}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={formData.property_city}
                      onChange={(e) => setFormData(p => ({ ...p, property_city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={formData.property_state}
                      onChange={(e) => setFormData(p => ({ ...p, property_state: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>ZIP</Label>
                    <Input
                      value={formData.property_zip}
                      onChange={(e) => setFormData(p => ({ ...p, property_zip: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Agreed Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.agreed_price}
                    onChange={(e) => setFormData(p => ({ ...p, agreed_price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label>Special Instructions</Label>
                  <Textarea
                    value={formData.special_instructions}
                    onChange={(e) => setFormData(p => ({ ...p, special_instructions: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Create Schedule
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Schedules List */}
      {schedules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Recurring Schedules</h3>
            <p className="text-muted-foreground mb-4">Set up automatic job scheduling for repeat customers</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Schedule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {schedules.map(schedule => (
            <Card key={schedule.id} className={!schedule.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{schedule.schedule_name}</h3>
                      <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                        {schedule.is_active ? 'Active' : 'Paused'}
                      </Badge>
                      <Badge variant="outline">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        {getRecurrenceLabel(schedule.recurrence_type)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {schedule.property_address && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {schedule.property_address}
                          {schedule.property_city && `, ${schedule.property_city}`}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Next: {schedule.next_scheduled_date 
                          ? format(new Date(schedule.next_scheduled_date), 'MMM d, yyyy') 
                          : 'Not scheduled'}
                      </div>
                      {schedule.agreed_price && (
                        <div className="font-medium">
                          ${schedule.agreed_price.toLocaleString()}
                        </div>
                      )}
                      <div className="text-muted-foreground">
                        {schedule.jobs_completed} jobs completed
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleToggleActive(schedule.id, schedule.is_active)}
                    >
                      {schedule.is_active ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(schedule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
